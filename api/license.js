// The license endpoint.
//
//   POST /api/license  { key }          ->  { token, plan, email, renews }   (the Mac app, every few hours)
//                                           402 { error: 'not_paid' } once a subscription has lapsed
//   GET  /api/license?session_id=cs_…   ->  { key, plan, email }             (the welcome page after Checkout)
//   GET  /api/license?claim=<32 hex>    ->  { key } or 404 until paid         (the Mac app after it opened Checkout)

const { stripe, kv, getLicense, normalizeKey, liveStatus, tokenFor, licenseFromSession, readJson } = require('./_billing');

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
            const key = normalizeKey(body.key);
            if (!key) return res.status(422).json({ error: 'invalid_key' });
            const lic = await getLicense(key);
            if (!lic) return res.status(404).json({ error: 'unknown_key' });
            const { paid, until } = await liveStatus(key, lic);
            if (!paid) return res.status(402).json({ error: 'not_paid', plan: lic.plan });
            return res.status(200).json({
                token: tokenFor(key, lic, until),
                plan: lic.plan,
                email: lic.email,
                renews: until || null,
            });
        }

        if (req.method === 'GET') {
            const claim = String(req.query.claim || '');
            if (/^[0-9a-f]{32}$/.test(claim)) {
                const [key] = await kv([['GET', `lic:claim:${claim}`]]);
                return key ? res.status(200).json({ key }) : res.status(404).json({ error: 'not_yet' });
            }
            const sessionId = String(req.query.session_id || '');
            if (/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sessionId)) {
                const session = await stripe('GET', `checkout/sessions/${sessionId}`);
                const key = await licenseFromSession(session);
                if (!key) return res.status(404).json({ error: 'not_paid' });
                const lic = await getLicense(key);
                return res.status(200).json({ key, plan: lic?.plan, email: lic?.email });
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
