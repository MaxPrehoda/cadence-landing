// POST /api/waitlist  { email, list?, company? }  ->  { ok, already }
//
// Stores sign-ups for the iPhone app waitlist in Upstash Redis (Vercel
// Marketplace "Upstash for Redis" / Vercel KV). Connecting that store to
// the project injects the REST credentials below; until then the endpoint
// answers 503 and the page falls back to an email link.
//
// Read the list: in the Upstash console run  SMEMBERS waitlist:iphone
// (sign-up times are in the hash waitlist:iphone:joined).

const LISTS = new Set(['iphone']);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

function creds() {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function readBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
    let raw = '';
    for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 2048) throw new Error('too large');
    }
    return JSON.parse(raw || '{}');
}

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    let body;
    try {
        body = await readBody(req);
    } catch {
        return res.status(400).json({ error: 'bad_request' });
    }

    // Honeypot: real people never fill the hidden "company" field.
    if (body.company) return res.status(200).json({ ok: true, already: false });

    const email = String(body.email || '').trim().toLowerCase();
    const list = LISTS.has(body.list) ? body.list : 'iphone';
    if (email.length > 254 || !EMAIL.test(email)) {
        return res.status(422).json({ error: 'invalid_email' });
    }

    const kv = creds();
    if (!kv) return res.status(503).json({ error: 'not_configured' });

    const key = `waitlist:${list}`;
    try {
        const r = await fetch(`${kv.url}/pipeline`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${kv.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify([
                ['SADD', key, email],
                ['HSETNX', `${key}:joined`, email, new Date().toISOString()],
            ]),
        });
        if (!r.ok) throw new Error(`upstash ${r.status}`);
        const [added] = await r.json();
        if (added.error) throw new Error(added.error);
        return res.status(200).json({ ok: true, already: added.result === 0 });
    } catch (e) {
        console.error('[waitlist]', e.message);
        return res.status(502).json({ error: 'store_failed' });
    }
};
