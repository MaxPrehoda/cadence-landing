// "Send my key again."
//
//   GET  /api/resend-key             ->  { enabled }   (does the form on /pricing have anything to send with?)
//   POST /api/resend-key  { email }  ->  { ok: true }
//
// The answer to a well-formed address is always the same, sent after about
// the same wait, whether or not that address ever bought anything, so the
// form can't be used to find out who is a customer. Limits: 5 tries an hour
// per visitor (429), 3 emails a day per address (silently not sent).

const crypto = require('crypto');
const { getLicense, keysForEmail, callerId, allow, readJson } = require('./_billing');
const mailer = require('./_email');

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const MIN_WAIT = 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendKeys(address) {
    const keys = await keysForEmail(address);
    const found = [];
    for (const key of keys.slice(0, 10)) {
        const lic = await getLicense(key);
        // Only to the address on the license itself.
        if (lic && lic.email === address) found.push({ key, lic });
    }
    if (!found.length) return;
    const who = crypto.createHash('sha256').update(address).digest('hex').slice(0, 20);
    if (!(await allow('resend-to', who, 3, 24 * 3600))) return;
    await mailer.send(mailer.resendEmail(address, found));
}

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (req.method === 'GET') return res.status(200).json({ enabled: !!mailer.provider() });
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'method_not_allowed' });
    }
    let body;
    try {
        body = await readJson(req);
    } catch {
        return res.status(400).json({ error: 'bad_request' });
    }
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });
    // Honeypot: real people never fill the hidden "company" field.
    if (body.company) return res.status(200).json({ ok: true });

    const address = String(body.email || '').trim().toLowerCase();
    if (address.length > 254 || !EMAIL.test(address)) return res.status(422).json({ error: 'invalid_email' });
    if (!mailer.provider()) return res.status(503).json({ error: 'not_configured' });
    if (!(await allow('resend', callerId(req), 5, 3600))) return res.status(429).json({ error: 'too_many' });

    const started = Date.now();
    try {
        await Promise.race([sendKeys(address), sleep(8000)]);
    } catch (e) {
        console.error('[resend-key]', e.message);
    }
    const left = MIN_WAIT - (Date.now() - started);
    if (left > 0) await sleep(left);
    return res.status(200).json({ ok: true });
};
