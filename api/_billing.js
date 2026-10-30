// Shared plumbing for Cadence Pro billing: Stripe (Spore's account, a
// Cadence-only restricted key), the license store in Upstash, and signed
// license tokens. Files starting with "_" are not deployed as functions.
//
// A license key (CAD-XXXX-XXXX-XXXX-XXXX) is what a buyer keeps. The Mac
// app trades it at /api/license for a short-lived token signed with
// Ed25519; the app and the relay check that signature with the public key
// below, so neither needs to call us to know someone has Pro.
//
// Upstash keys:
//   lic:<key>             hash  email, plan, customer, subscription, status, period_end, created, session
//   lic:session:<id>      the key bought in that Checkout session
//   lic:sub:<id>          the key a subscription belongs to
//   lic:claim:<nonce>     the key for an app that opened Checkout with ?claim= (1 day)
//   founding:sold         founding lifetime seats sold

const crypto = require('crypto');

const PLANS = {
    monthly: { env: 'CADENCE_PRICE_MONTHLY', mode: 'subscription' },
    yearly: { env: 'CADENCE_PRICE_YEARLY', mode: 'subscription' },
    lifetime: { env: 'CADENCE_PRICE_LIFETIME', mode: 'payment' },
};
const FOUNDING_SEATS = 100;
const SITE = 'https://www.cadencevoice.ai';
const DAY = 24 * 3600;
// Statuses that still count as paid. past_due keeps Pro while Stripe retries the card.
const PAID = new Set(['active', 'trialing', 'past_due']);

// ---------------------------------------------------------------------------
// Stripe over plain fetch (the site has no build step and one dependency)
// ---------------------------------------------------------------------------

function form(obj, prefix, out = []) {
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null) continue;
        const key = prefix ? `${prefix}[${k}]` : k;
        if (typeof v === 'object') form(v, key, out);
        else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
    return out.join('&');
}

async function stripe(method, path, params) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw Object.assign(new Error('stripe not configured'), { status: 503 });
    const body = params && method !== 'GET' ? form(params) : undefined;
    const qs = params && method === 'GET' ? `?${form(params)}` : '';
    const r = await fetch(`https://api.stripe.com/v1/${path}${qs}`, {
        method,
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    });
    const data = await r.json();
    if (!r.ok) throw Object.assign(new Error(data.error?.message || `stripe ${r.status}`), { status: r.status });
    return data;
}

// Stripe-Signature: t=<ts>,v1=<hmac> over "<ts>.<raw body>".
function verifyWebhook(raw, header, secret) {
    const parts = Object.fromEntries(
        String(header || '')
            .split(',')
            .map((p) => p.split('='))
            .filter((p) => p.length === 2),
    );
    const t = Number(parts.t);
    if (!t || !parts.v1 || !secret) return false;
    if (Math.abs(Date.now() / 1000 - t) > 300) return false;
    const want = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
    const sigs = String(header)
        .split(',')
        .filter((p) => p.startsWith('v1='))
        .map((p) => p.slice(3));
    return sigs.some((s) => s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want)));
}

// API versions since 2025-03-31 moved the period end onto the items.
function periodEnd(sub) {
    return Number(sub.current_period_end || sub.items?.data?.[0]?.current_period_end || 0);
}

// ---------------------------------------------------------------------------
// Upstash
// ---------------------------------------------------------------------------

async function kv(commands) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw Object.assign(new Error('store not configured'), { status: 503 });
    const r = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commands),
    });
    if (!r.ok) throw new Error(`upstash ${r.status}`);
    const out = await r.json();
    for (const o of out) if (o.error) throw new Error(o.error);
    return out.map((o) => o.result);
}

function hashToObject(flat) {
    if (!flat || flat.length === 0) return null;
    const o = {};
    for (let i = 0; i < flat.length; i += 2) o[flat[i]] = flat[i + 1];
    return o;
}

async function getLicense(key) {
    const [flat] = await kv([['HGETALL', `lic:${key}`]]);
    return hashToObject(flat);
}

async function setLicense(key, fields) {
    const flat = Object.entries(fields).flatMap(([k, v]) => [k, String(v ?? '')]);
    await kv([['HSET', `lic:${key}`, ...flat]]);
}

// ---------------------------------------------------------------------------
// Keys and tokens
// ---------------------------------------------------------------------------

const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_RE = /^CAD(-[A-HJ-NP-Z2-9]{4}){4}$/;

function newKey() {
    const bytes = crypto.randomBytes(16);
    const chars = [...bytes].map((b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join('');
    return `CAD-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}-${chars.slice(12, 16)}`;
}

function normalizeKey(raw) {
    const k = String(raw || '').trim().toUpperCase();
    return KEY_RE.test(k) ? k : null;
}

// Short public id for a license: the relay meters cloud hours by it.
function licenseId(key) {
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function signToken(claims) {
    const der = Buffer.from(process.env.CADENCE_LICENSE_SIGNING_KEY || '', 'base64');
    if (der.length === 0) throw Object.assign(new Error('signing key not configured'), { status: 503 });
    const priv = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
    const payload = b64url(JSON.stringify(claims));
    const sig = crypto.sign(null, Buffer.from(payload), priv);
    return `${payload}.${b64url(sig)}`;
}

// Is this license paid right now? Subscriptions whose stored period has
// ended are checked against Stripe, so a missed webhook never locks anyone out.
async function liveStatus(key, lic) {
    if (lic.plan === 'lifetime' || lic.plan === 'comp') {
        return lic.status === 'revoked' ? { paid: false } : { paid: true, until: null };
    }
    const now = Math.floor(Date.now() / 1000);
    let status = lic.status;
    let end = Number(lic.period_end || 0);
    if (lic.subscription && (end < now || !PAID.has(status))) {
        try {
            const sub = await stripe('GET', `subscriptions/${lic.subscription}`);
            status = sub.status;
            end = periodEnd(sub);
            await setLicense(key, { status, period_end: end });
        } catch (e) {
            console.error('[billing] subscription check', e.message);
        }
    }
    return { paid: PAID.has(status) && end + 3 * DAY > now, until: end };
}

// The token a paid license gets: good for 14 days (the app refreshes every
// few hours), never past the paid period plus three days of grace.
function tokenFor(key, lic, until) {
    const now = Math.floor(Date.now() / 1000);
    let exp = now + 14 * DAY;
    if (until) exp = Math.min(exp, until + 3 * DAY);
    return signToken({ v: 1, lid: licenseId(key), email: lic.email, plan: lic.plan, iat: now, exp });
}

// ---------------------------------------------------------------------------
// Creating a license from a finished Checkout session (webhook and the
// welcome page both call this; whichever runs first creates it)
// ---------------------------------------------------------------------------

async function licenseFromSession(session) {
    if (session.metadata?.product !== 'cadence-pro') return null;
    if (session.status !== 'complete') return null;
    if (session.mode === 'payment' && session.payment_status !== 'paid') return null;
    const key = normalizeKey(session.metadata.license_key);
    const plan = session.metadata.plan;
    if (!key || !PLANS[plan]) return null;

    const [isNew] = await kv([['SET', `lic:session:${session.id}`, key, 'NX']]);
    if (isNew !== 'OK') return key;

    const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
    const fields = {
        email,
        plan,
        customer: session.customer || '',
        subscription: session.subscription || '',
        status: 'active',
        period_end: 0,
        created: new Date().toISOString(),
        session: session.id,
    };
    if (session.subscription) {
        try {
            const sub = await stripe('GET', `subscriptions/${session.subscription}`);
            fields.status = sub.status;
            fields.period_end = periodEnd(sub);
        } catch (e) {
            console.error('[billing] subscription read', e.message);
            fields.period_end = Math.floor(Date.now() / 1000) + 31 * DAY;
        }
    }
    const cmds = [['HSET', `lic:${key}`, ...Object.entries(fields).flatMap(([k, v]) => [k, String(v)])]];
    if (session.subscription) cmds.push(['SET', `lic:sub:${session.subscription}`, key]);
    if (plan === 'lifetime') cmds.push(['INCR', 'founding:sold']);
    const claim = session.metadata.claim;
    if (claim && /^[0-9a-f]{32}$/.test(claim)) cmds.push(['SET', `lic:claim:${claim}`, key, 'EX', DAY]);
    await kv(cmds);

    // The key on every later invoice, so a buyer who loses it finds it in
    // the billing portal.
    if (session.customer) {
        stripe('POST', `customers/${session.customer}`, {
            invoice_settings: { custom_fields: { 0: { name: 'License key', value: key } } },
        }).catch((e) => console.error('[billing] customer key field', e.message));
    }
    return key;
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

// Reads the stream itself: touching req.body makes Vercel parse (and
// consume) it, and the webhook signature needs the exact raw bytes.
async function readRaw(req, limit = 65536) {
    let raw = '';
    for await (const chunk of req) {
        raw += chunk;
        if (raw.length > limit) throw new Error('too large');
    }
    return raw;
}

async function readJson(req) {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
    return JSON.parse((await readRaw(req, 4096)) || '{}');
}

module.exports = {
    PLANS,
    FOUNDING_SEATS,
    SITE,
    stripe,
    verifyWebhook,
    periodEnd,
    kv,
    getLicense,
    setLicense,
    newKey,
    normalizeKey,
    licenseId,
    liveStatus,
    tokenFor,
    licenseFromSession,
    readRaw,
    readJson,
};
