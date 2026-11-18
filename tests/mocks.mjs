// In-memory stand-ins for Upstash, Stripe and the email providers, installed
// over global fetch. Nothing in the test run leaves this process.

import crypto from 'node:crypto';

export const WEBHOOK_SECRET = 'whsec_test';

export function install() {
    const world = {
        kv: new Map(),
        expires: new Map(),
        kvDown: false,
        stripe: { sessions: {}, subscriptions: {}, payment_intents: {}, customers: {}, invoices: {}, calls: [], refuse: null },
        emails: [],
        emailFails: false,
    };

    // ---- Upstash --------------------------------------------------------
    const kv = world.kv;
    const live = (k) => {
        const e = world.expires.get(k);
        if (e && e <= Date.now()) {
            kv.delete(k);
            world.expires.delete(k);
        }
        return kv.get(k);
    };
    const coll = (k, make) => {
        if (live(k) === undefined) kv.set(k, make());
        return kv.get(k);
    };
    const run = ([cmd, k, ...a]) => {
        switch (cmd) {
            case 'GET': return live(k) ?? null;
            case 'SET': {
                const nx = a.includes('NX');
                if (nx && live(k) !== undefined) return null;
                kv.set(k, String(a[0]));
                const ex = a.indexOf('EX');
                if (ex >= 0) world.expires.set(k, Date.now() + Number(a[ex + 1]) * 1000);
                else world.expires.delete(k);
                return 'OK';
            }
            case 'DEL': { const had = live(k) !== undefined; kv.delete(k); return had ? 1 : 0; }
            case 'EXISTS': return live(k) !== undefined ? 1 : 0;
            case 'INCR': { const n = Number(live(k) || 0) + 1; kv.set(k, String(n)); return n; }
            case 'DECR': { const n = Number(live(k) || 0) - 1; kv.set(k, String(n)); return n; }
            case 'HSET': { const h = coll(k, () => new Map()); for (let i = 0; i < a.length; i += 2) h.set(a[i], String(a[i + 1])); return a.length / 2; }
            case 'HSETNX': { const h = coll(k, () => new Map()); if (h.has(a[0])) return 0; h.set(a[0], String(a[1])); return 1; }
            case 'HGETALL': { const h = live(k); return h ? [...h.entries()].flat() : []; }
            case 'HDEL': { const h = live(k); let n = 0; if (h) for (const f of a) if (h.delete(f)) n++; return n; }
            case 'HINCRBY': { const h = coll(k, () => new Map()); const n = Number(h.get(a[0]) || 0) + Number(a[1]); h.set(a[0], String(n)); return n; }
            case 'HLEN': return live(k)?.size || 0;
            case 'SADD': { const s = coll(k, () => new Set()); let n = 0; for (const m of a) if (!s.has(m)) { s.add(m); n++; } return n; }
            case 'SREM': { const s = live(k); let n = 0; if (s) for (const m of a) if (s.delete(m)) n++; return n; }
            case 'SCARD': return live(k)?.size || 0;
            case 'SMEMBERS': return [...(live(k) || [])];
            case 'ZADD': { const z = coll(k, () => new Map()); const isNew = !z.has(a[1]); z.set(a[1], Number(a[0])); return isNew ? 1 : 0; }
            case 'ZREM': { const z = live(k); return z && z.delete(a[0]) ? 1 : 0; }
            case 'ZCARD': return live(k)?.size || 0;
            case 'ZSCORE': { const z = live(k); return z && z.has(a[0]) ? String(z.get(a[0])) : null; }
            case 'ZRANGEBYSCORE': {
                const z = live(k); if (!z) return [];
                const max = Number(a[1]);
                const hit = [...z].filter(([, sc]) => sc <= max).sort((x, y) => x[1] - y[1]).map(([m]) => m);
                const lim = a.indexOf('LIMIT');
                return lim >= 0 ? hit.slice(Number(a[lim + 1]), Number(a[lim + 1]) + Number(a[lim + 2])) : hit;
            }
            case 'ZREMRANGEBYSCORE': {
                const z = live(k); if (!z) return 0;
                const max = Number(a[1]); let n = 0;
                for (const [m, sc] of [...z]) if (sc <= max) { z.delete(m); n++; }
                return n;
            }
            default: throw new Error(`mock store: ${cmd} not implemented`);
        }
    };

    // ---- Stripe ---------------------------------------------------------
    const S = world.stripe;
    const notFound = () => ({ status: 404, body: { error: { message: 'No such object', code: 'resource_missing' } } });
    function stripeCall(method, path, params, headers) {
        S.calls.push({ method, path, params, version: headers['Stripe-Version'] });
        if (S.refuse) {
            const refusal = S.refuse({ method, path, params });
            if (refusal) return { status: refusal.status || 400, body: { error: refusal } };
        }
        let m;
        if (method === 'POST' && path === 'checkout/sessions') {
            const id = `cs_test_${crypto.randomBytes(12).toString('hex')}`;
            const metadata = {};
            for (const [k, v] of params) { const mm = /^metadata\[(.+)\]$/.exec(k); if (mm) metadata[mm[1]] = v; }
            const mode = params.get('mode');
            S.sessions[id] = {
                id, object: 'checkout.session', mode, metadata, status: 'open', payment_status: 'unpaid',
                created: Math.floor(Date.now() / 1000),
                expires_at: Number(params.get('expires_at')) || Math.floor(Date.now() / 1000) + 86400, customer: null, subscription: null, payment_intent: null,
                url: `https://checkout.stripe.test/${id}`, request: Object.fromEntries(params),
            };
            return { status: 200, body: S.sessions[id] };
        }
        if (method === 'GET' && path === 'checkout/sessions') {
            const data = Object.values(S.sessions).filter(
                (s) => (!params.get('customer') || s.customer === params.get('customer')) &&
                    (!params.get('subscription') || s.subscription === params.get('subscription')),
            );
            return { status: 200, body: { object: 'list', data } };
        }
        if (method === 'POST' && (m = /^checkout\/sessions\/(.+)\/expire$/.exec(path))) {
            const sess = S.sessions[m[1]];
            if (!sess) return notFound();
            if (sess.status !== 'open') return { status: 400, body: { error: { message: 'Only open sessions can be expired' } } };
            sess.status = 'expired';
            return { status: 200, body: sess };
        }
        if (method === 'GET' && (m = /^invoices\/(.+)$/.exec(path))) return S.invoices[m[1]] ? { status: 200, body: S.invoices[m[1]] } : notFound();
        if (method === 'GET' && path === 'invoice_payments') {
            const pi = params.get('payment[payment_intent]');
            const data = Object.values(S.invoices).filter((i) => i.pi === pi).map((i) => ({ invoice: i.id }));
            return { status: 200, body: { object: 'list', data } };
        }
        if (method === 'GET' && (m = /^checkout\/sessions\/(.+)$/.exec(path))) return S.sessions[m[1]] ? { status: 200, body: S.sessions[m[1]] } : notFound();
        if (method === 'GET' && (m = /^subscriptions\/(.+)$/.exec(path))) return S.subscriptions[m[1]] ? { status: 200, body: S.subscriptions[m[1]] } : notFound();
        if (method === 'DELETE' && (m = /^subscriptions\/(.+)$/.exec(path))) {
            if (!S.subscriptions[m[1]]) return notFound();
            S.subscriptions[m[1]].status = 'canceled';
            return { status: 200, body: S.subscriptions[m[1]] };
        }
        if (method === 'GET' && (m = /^payment_intents\/(.+)$/.exec(path))) return S.payment_intents[m[1]] ? { status: 200, body: S.payment_intents[m[1]] } : notFound();
        if (method === 'POST' && (m = /^customers\/(.+)$/.exec(path))) {
            const c = (S.customers[m[1]] ||= { id: m[1] });
            c.key_field = params.get('invoice_settings[custom_fields][0][value]');
            return { status: 200, body: c };
        }
        if (method === 'GET' && path === 'customers') {
            return { status: 200, body: { object: 'list', data: Object.values(S.customers).filter((c) => c.email === params.get('email')) } };
        }
        if (method === 'POST' && path === 'billing_portal/sessions') return { status: 200, body: { url: 'https://billing.stripe.test/session' } };
        throw new Error(`mock stripe: ${method} ${path} not implemented`);
    }

    // ---- fetch ----------------------------------------------------------
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    globalThis.fetch = async (url, init = {}) => {
        const u = new URL(String(url));
        if (u.host === 'kv.test') {
            if (world.kvDown) return json(500, {});
            return json(200, JSON.parse(init.body).map((c) => {
                try { return { result: run(c) }; } catch (e) { return { error: e.message }; }
            }));
        }
        if (u.host === 'api.stripe.com') {
            const path = u.pathname.replace(/^\/v1\//, '');
            const params = init.method === 'GET' ? u.searchParams : new URLSearchParams(init.body || '');
            const r = stripeCall(init.method, path, params, init.headers || {});
            return json(r.status, r.body);
        }
        if (u.host === 'api.resend.com' || u.host.endsWith('mailgun.net')) {
            if (world.emailFails) return json(500, { message: 'down' });
            const provider = u.host === 'api.resend.com' ? 'resend' : 'mailgun';
            const body = provider === 'resend' ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body));
            world.emails.push({ provider, to: [].concat(body.to)[0], subject: body.subject, text: body.text, html: body.html, headers: init.headers });
            return json(200, { id: 'email_1' });
        }
        throw new Error(`unexpected network call in tests: ${u.href}`);
    };

    // ---- env ------------------------------------------------------------
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    Object.assign(process.env, {
        KV_REST_API_URL: 'https://kv.test',
        KV_REST_API_TOKEN: 't',
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
        CADENCE_PRICE_MONTHLY: 'price_monthly',
        CADENCE_PRICE_YEARLY: 'price_yearly',
        CADENCE_PRICE_LIFETIME: 'price_lifetime',
        CADENCE_LICENSE_SIGNING_KEY: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
    });
    for (const k of ['RESEND_API_KEY', 'MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'CADENCE_MAX_DEVICES', 'CADENCE_STRIPE_TAX', 'CADENCE_TESTFLIGHT_URL', 'CADENCE_STRIPE_API_VERSION']) delete process.env[k];
    world.publicKey = publicKey;
    return world;
}

// ---- driving the handlers ----------------------------------------------

export async function call(handler, { method = 'GET', query = {}, body, headers = {}, raw } = {}) {
    const chunks = raw !== undefined ? [raw] : [];
    const req = {
        method, query, headers: { 'user-agent': 'Mozilla/5.0 Safari', 'x-forwarded-for': '203.0.113.7', ...headers },
        body: raw !== undefined ? undefined : body,
        [Symbol.asyncIterator]: async function* () { yield* chunks; },
    };
    const out = { status: 200, headers: {}, body: undefined, location: undefined };
    const res = {
        setHeader: (k, v) => { out.headers[k] = v; },
        status: (n) => { out.status = n; return res; },
        json: (b) => { out.body = b; return res; },
        redirect: (n, to) => { out.status = n; out.location = to; return res; },
    };
    await handler(req, res);
    return out;
}

export function signedEvent(type, object) {
    const raw = JSON.stringify({ id: `evt_${crypto.randomBytes(6).toString('hex')}`, type, data: { object } });
    const t = Math.floor(Date.now() / 1000);
    const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${t}.${raw}`).digest('hex');
    return { method: 'POST', raw, headers: { 'stripe-signature': `t=${t},v1=${v1}` } };
}
