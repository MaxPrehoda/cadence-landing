// "Email me the Mac link."
//
//   GET  /api/send-link             ->  { enabled }   (is there anything to send with?)
//   POST /api/send-link  { email }  ->  { ok: true }
//
// Cadence runs on a Mac, and a visitor on a phone can't install it there. The
// home page offers to email them the download link so it is waiting when they
// sit down at their Mac. One fixed message to the address they typed; the
// address is not stored or added to any list.
//
// So the form can't be used to pester someone else's inbox: 5 tries an hour
// per visitor (429) and 2 emails a day per address (answered ok, not sent).

const crypto = require('crypto');
const { callerId, allow, readJson } = require('./_billing');
const mailer = require('./_email');

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

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
    if (!(await allow('maclink', callerId(req), 5, 3600))) return res.status(429).json({ error: 'too_many' });

    const who = crypto.createHash('sha256').update(address).digest('hex').slice(0, 20);
    if (!(await allow('maclink-to', who, 2, 24 * 3600))) return res.status(200).json({ ok: true });

    const out = await mailer.send(mailer.macLinkEmail(address));
    if (!out.sent) return res.status(502).json({ error: 'send_failed' });
    return res.status(200).json({ ok: true });
};
