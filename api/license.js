// The license endpoint.
//
//   POST /api/license  { key, device?, device_name? }
//                                       ->  { token, plan, email, renews, cancel_at_period_end, ends_at, status, devices?, iphone_url? }
//                                           (the Mac app, every few hours)
//                                           402 { error: 'not_paid', plan, reason } once a license has lapsed or been revoked
//                                           409 { error: 'device_limit', max, devices, message } when its seats are full
//   POST /api/license  { key, device, release: true }  ->  { released }   (the Mac app, "Remove from this Mac")
//   GET  /api/license?session_id=cs_…   ->  { key, plan, email, emailed, iphone_url? }   (the welcome page after Checkout)
//                                           202 { status: 'processing', will_email } while a bank payment clears
//                                           410 { error: 'expired' } a day after the key was first shown
//   GET  /api/license?claim=<32 hex>    ->  { key } or 404 until paid         (the Mac app after it opened Checkout)
//   POST /api/license  { session_id, release_to_app: true }  ->  { ok }      (the welcome page: "yes, turn Pro on in my app")
//
// A claim is handed over only to the address that opened its Checkout, or
// after the buyer says so on the welcome page: a link someone else prepared
// can't deliver the buyer's key to them.
//
// Device seats are off unless CADENCE_MAX_DEVICES is set. A request with no
// device id is never counted or refused, which is what the 0.9.0 app sends.

const {
    stripe,
    kv,
    getLicense,
    normalizeKey,
    callerId,
    liveStatus,
    tokenFor,
    maxDevices,
    normalizeDevice,
    claimDevice,
    releaseDevice,
    licenseFromSession,
    sendPurchaseEmail,
    readJson,
} = require('./_billing');
const { iphoneUrl, provider } = require('./_email');

const CLAIM_RE = /^[0-9a-f]{32}$/;
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,}$/;
const SHOWN_FOR = 86400; // the welcome link shows the key for a day from its first showing
const SHOWN_BY = 14 * 86400; // and never later than two weeks after the license was made

function sessionFresh(lic) {
    if (!lic) return false;
    const now = Math.floor(Date.now() / 1000);
    const issued = Number(lic.issued) || Math.floor(Date.parse(lic.created) / 1000) || 0;
    const shown = Number(lic.shown) || now;
    return now < shown + SHOWN_FOR && now < issued + SHOWN_BY;
}

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    try {
        if (req.method === 'POST') {
            let body;
            try {
                body = await readJson(req);
            } catch {
                return res.status(400).json({ error: 'bad_request' });
            }
            if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });
            if (body.release_to_app === true) {
                const sid = String(body.session_id || '');
                if (!SESSION_RE.test(sid)) return res.status(400).json({ error: 'bad_request' });
                let session;
                try {
                    session = await stripe('GET', `checkout/sessions/${sid}`);
                } catch (e) {
                    if (e.status === 404) return res.status(404).json({ error: 'not_paid' });
                    throw e;
                }
                const claim = String(session.metadata?.claim || '');
                const made = await licenseFromSession(session);
                if (!made || !CLAIM_RE.test(claim)) return res.status(404).json({ error: 'not_paid' });
                const lic = await getLicense(made);
                if (!sessionFresh(lic)) return res.status(410).json({ error: 'expired' });
                await kv([
                    ['SET', `lic:claim:${claim}`, made, 'EX', 86400],
                    ['SET', `lic:claimok:${claim}`, '1', 'EX', 86400],
                ]);
                return res.status(200).json({ ok: true });
            }
            const key = normalizeKey(body.key);
            if (!key) return res.status(422).json({ error: 'invalid_key' });
            const lic = await getLicense(key);
            if (!lic) return res.status(404).json({ error: 'unknown_key' });
            const device = normalizeDevice(body.device);

            if (body.release === true) {
                return res.status(200).json({ released: await releaseDevice(key, device) });
            }

            const { paid, until, plan, status, ends, reason, renewing } = await liveStatus(key, lic);
            if (!paid) return res.status(402).json({ error: 'not_paid', plan: plan || lic.plan, reason });

            const seat = await claimDevice(key, device, body.device_name);
            if (!seat.ok) {
                const macs = seat.max === 1 ? '1 Mac' : `${seat.max} Macs`;
                return res.status(409).json({
                    error: 'device_limit',
                    max: seat.max,
                    devices: seat.devices,
                    message: `This license is already on ${macs}, which is as many as it covers. Remove it from one of them (Settings → Pro → Remove from this Mac) and try again.`,
                });
            }
            const reply = {
                token: tokenFor(key, lic, until, plan, renewing),
                plan,
                email: lic.email,
                renews: until || null,
                // Cancelled but still inside the paid period: Pro stops at ends_at.
                cancel_at_period_end: !!ends,
                ends_at: ends || null,
                status,
            };
            if (maxDevices() && device) reply.devices = { used: seat.used, max: seat.max };
            const iphone = iphoneUrl();
            if (iphone) reply.iphone_url = iphone;
            return res.status(200).json(reply);
        }

        if (req.method === 'GET') {
            const claim = String(req.query.claim || '');
            if (CLAIM_RE.test(claim)) {
                const [key, by, ok] = await kv([
                    ['GET', `lic:claim:${claim}`],
                    ['GET', `lic:claimby:${claim}`],
                    ['GET', `lic:claimok:${claim}`],
                ]);
                if (!key) return res.status(404).json({ error: 'not_yet' });
                // by is unset for a Checkout opened before claims were bound.
                if (by && !ok && by !== callerId(req)) {
                    // Someone is waiting from another address: the welcome
                    // page asks the buyer whether that is their app.
                    await kv([['SET', `lic:claimwait:${claim}`, '1', 'EX', 86400]]);
                    return res.status(404).json({ error: 'not_yet' });
                }
                await kv([['SET', `lic:claimed:${claim}`, '1', 'EX', 86400]]);
                return res.status(200).json({ key });
            }
            const sessionId = String(req.query.session_id || '');
            if (SESSION_RE.test(sessionId)) {
                let session;
                try {
                    session = await stripe('GET', `checkout/sessions/${sessionId}`);
                } catch (e) {
                    if (e.status === 404) return res.status(404).json({ error: 'not_paid' });
                    throw e;
                }
                const key = await licenseFromSession(session);
                if (!key) {
                    // Checkout is finished but the money hasn't arrived (bank
                    // debit): the key is emailed when it does.
                    const waiting =
                        session.metadata?.product === 'cadence-pro' &&
                        session.status === 'complete' &&
                        session.payment_status === 'unpaid';
                    return waiting
                        ? res.status(202).json({ status: 'processing', will_email: !!provider() })
                        : res.status(404).json({ error: 'not_paid' });
                }
                // The link shows the key for a day from when it first did.
                await kv([['HSETNX', `lic:${key}`, 'shown', Math.floor(Date.now() / 1000)]]);
                if (!sessionFresh(await getLicense(key))) return res.status(410).json({ error: 'expired' });
                const emailed = await sendPurchaseEmail(key);
                const lic = await getLicense(key);
                const reply = { key, plan: lic?.plan, email: lic?.email, emailed };
                const claim = String(session.metadata?.claim || '');
                if (CLAIM_RE.test(claim) && session.metadata.claim_by) {
                    const [claimed, okd, waiting] = await kv([
                        ['GET', `lic:claimed:${claim}`],
                        ['GET', `lic:claimok:${claim}`],
                        ['GET', `lic:claimwait:${claim}`],
                    ]);
                    // 'ask': an app at another address is waiting for this key.
                    reply.app = claimed || okd ? 'on' : waiting ? 'ask' : 'waiting';
                }
                const iphone = iphoneUrl();
                if (iphone) reply.iphone_url = iphone;
                return res.status(200).json(reply);
            }
            return res.status(400).json({ error: 'bad_request' });
        }

        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'method_not_allowed' });
    } catch (e) {
        console.error('[license]', e.message);
        return res.status(e.status === 503 ? 503 : 502).json({ error: 'unavailable' });
    }
};
