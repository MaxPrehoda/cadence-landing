// POST /api/telemetry  <- anonymous usage counts from the Cadence Mac app
//
// The app (voice-flow src/lib/telemetry.ts) posts {name, props, v} as
// text/plain. Only the events and properties listed here are accepted; each
// becomes a Vercel Web Analytics custom event on this project, with the app
// version attached. The caller's IP and user agent are passed through only so
// Vercel can count distinct users with its daily-rotating hash; nothing here
// stores them, and the app sends no ID. Custom events from the server need
// Vercel Pro or Enterprise.

// The package's "node" export is ESM, which require() can't load on every
// Node version Vercel runs, so load it with import() once and reuse it.
let trackPromise;
const getTrack = () => (trackPromise ??= import('@vercel/analytics/server').then((m) => m.track));

// event -> allowed property -> allowed values (null = any short token)
const EVENTS = {
    first_run: {},
    app_open: {},
    onboarding_done: {},
    dictation: {},
    agents_running: { count: ['1', '2-3', '4-7', '8+'] },
    inbox_answer: { kind: ['question', 'approval', 'plan', 'finished'] },
    talk: { route: null },
};
const TOKEN = /^[a-z0-9_-]{1,24}$/;
const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/;

async function readBody(req) {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
    let raw = '';
    for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 1024) throw new Error('too large');
    }
    return JSON.parse(raw || '{}');
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'content-type');
        return res.status(204).end();
    }
    if (req.method !== 'POST') return res.status(405).end();

    let body;
    try {
        body = await readBody(req);
    } catch {
        return res.status(400).end();
    }
    const allowed = EVENTS[body && body.name];
    if (!allowed) return res.status(422).end();

    const data = { version: VERSION.test(String(body.v)) ? String(body.v) : 'unknown' };
    for (const [key, values] of Object.entries(allowed)) {
        const value = body.props && body.props[key];
        if (typeof value !== 'string') continue;
        if (values ? values.includes(value) : TOKEN.test(value)) data[key] = value;
    }

    try {
        const track = await getTrack();
        await track(body.name, data, {
            headers: {
                'user-agent': req.headers['user-agent'] || `Cadence/${data.version}`,
                'x-forwarded-for': req.headers['x-forwarded-for'] || '',
            },
        });
    } catch (e) {
        console.error('[telemetry]', e && e.message);
    }
    return res.status(204).end();
};
