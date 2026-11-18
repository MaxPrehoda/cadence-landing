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
//   lic:<key>             hash  email, plan, customer, subscription, status, period_end, cancel_at,
//                               created, session, seat, emailed, revoked_reason
//   lic:session:<id>      the key bought in that Checkout session
//   lic:sub:<id>          the key a subscription belongs to
//   lic:cust:<id>         set of keys a Stripe customer bought
//   lic:email:<sha256>    set of keys bought with an email address ("send my key again")
//   lic:claim:<nonce>     the key for an app that opened Checkout with ?claim= (1 day)
//   lic:dev:<key>         hash  device id -> { n: name, t: last seen, c: first seen } (device seats)
//   founding:seats        set of founding keys that hold one of the 100 seats
//   founding:holds        sorted set of keys in an open founding Checkout, scored by when the hold ends
//   founding:sold         seats sold before founding:seats existed (never added to again)
//   rl:<name>:<id>        request counters for rate limits

const crypto = require('crypto');
const mailer = require('./_email');

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

async function stripe(method, path, params, opts = {}) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw Object.assign(new Error('stripe not configured'), { status: 503 });
    const body = params && method !== 'GET' ? form(params) : undefined;
    const qs = params && method === 'GET' ? `?${form(params)}` : '';
    const headers = {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (opts.version) headers['Stripe-Version'] = opts.version;
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
    const r = await fetch(`https://api.stripe.com/v1/${path}${qs}`, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(20000),
    });
    const data = await r.json();
    if (!r.ok) {
        throw Object.assign(new Error(data.error?.message || `stripe ${r.status}`), {
            status: r.status,
            code: data.error?.code,
            param: data.error?.param,
        });
    }
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
    return sigs.some((s) => {
        const a = Buffer.from(s);
        const b = Buffer.from(want);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
}

// API versions since 2025-03-31 moved the period end onto the items.
function periodEnd(sub) {
    return Number(sub.current_period_end || sub.items?.data?.[0]?.current_period_end || 0);
}

// Which plan a subscription is on now, from its price. Unknown prices
// (a price since replaced) return null and the stored plan stays.
function planFromSub(sub) {
    const price = sub.items?.data?.[0]?.price?.id || sub.items?.data?.[0]?.plan?.id;
    if (!price) return null;
    for (const [plan, spec] of Object.entries(PLANS)) {
        if (spec.mode === 'subscription' && process.env[spec.env] === price) return plan;
    }
    return null;
}

// What a license remembers about its subscription. cancel_at is when Pro
// stops because the buyer cancelled (0 when it just renews).
function subFields(sub) {
    const end = periodEnd(sub);
    const fields = {
        status: sub.status,
        period_end: end,
        cancel_at: sub.cancel_at_period_end ? end : Number(sub.cancel_at || 0),
    };
    const plan = planFromSub(sub);
    if (plan) fields.plan = plan;
    return fields;
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

// Why a license isn't paid, for the app to say something true about it.
function notPaidReason(lic, status) {
    if (status === 'revoked') return lic.revoked_reason || 'refunded';
    if (status === 'incomplete' || status === 'incomplete_expired') return 'incomplete';
    if (status === 'past_due' || status === 'unpaid') return status;
    return 'canceled';
}

// Is this license paid right now? Subscriptions whose stored period has
// ended are checked against Stripe, so a missed webhook never locks anyone
// out. A revoked license (refund, lost dispute) stays revoked whatever
// Stripe says about its subscription.
async function liveStatus(key, lic) {
    if (lic.status === 'revoked') return { paid: false, plan: lic.plan, reason: notPaidReason(lic, 'revoked') };
    if (lic.plan === 'lifetime' || lic.plan === 'comp') {
        return { paid: true, until: null, plan: lic.plan, status: 'active', ends: null };
    }
    const now = Math.floor(Date.now() / 1000);
    let status = lic.status;
    let end = Number(lic.period_end || 0);
    let plan = lic.plan;
    let cancelAt = Number(lic.cancel_at || 0);
    let lookupFailed = false;
    if (lic.subscription && (end < now || !PAID.has(status))) {
        try {
            const sub = await stripe('GET', `subscriptions/${lic.subscription}`);
            const fields = subFields(sub);
            status = fields.status;
            end = fields.period_end;
            cancelAt = fields.cancel_at;
            plan = fields.plan || plan;
            await setLicense(key, fields);
        } catch (e) {
            console.error('[billing] subscription check', e.message);
            lookupFailed = true;
        }
    }
    // Stripe couldn't be asked and the last thing known is "paid": that is
    // not a "no". The caller answers 503 and the app keeps what it has.
    if (lookupFailed && PAID.has(status) && end + 3 * DAY <= now) {
        throw Object.assign(new Error('subscription status unknown: Stripe unreachable'), { status: 503 });
    }
    if (PAID.has(status) && end + 3 * DAY > now) {
        // Set to renew: paid up, inside its period and not cancelled. A late
        // payment (past_due) or a stale period (Stripe unreachable) is not.
        const renewing = (status === 'active' || status === 'trialing') && !cancelAt && end > now;
        return { paid: true, until: end, plan, status, ends: cancelAt || null, renewing };
    }
    return { paid: false, plan, reason: notPaidReason(lic, status) };
}

// The token a paid license gets: good for 14 days (the app refreshes every
// few hours). A subscription set to renew gets the full 14 days, so a Mac
// asleep across the renewal date doesn't lock its phone out. One that is
// cancelled or behind on payment never gets past the paid period plus three
// days of grace.
function tokenFor(key, lic, until, plan, renewing) {
    const now = Math.floor(Date.now() / 1000);
    let exp = now + 14 * DAY;
    if (until && !renewing) exp = Math.min(exp, until + 3 * DAY);
    return signToken({ v: 1, lid: licenseId(key), email: lic.email, plan: plan || lic.plan, iat: now, exp });
}

// ---------------------------------------------------------------------------
// The 100 founding seats
//
// A seat is counted when its license is created (founding:seats, a set, so
// counting the same key twice is impossible) and given back when that
// license is refunded or loses a dispute. An open founding Checkout holds a
// seat until it is paid or runs out, so two people can't both be sold the
// last one.
// ---------------------------------------------------------------------------

const FOUNDING_HOLD = 35 * 60; // a founding Checkout session lives 31 minutes
const FOUNDING_BANK_HOLD = 10 * DAY; // a bank payment that is still clearing

// A hold whose time is up is only dropped once Stripe says its Checkout can
// no longer be paid. One that was paid (its webhook is late or lost) becomes
// a license here, so the seat is never sold a second time. If Stripe can't
// be asked the hold stays.
async function settleLapsedHolds(now) {
    const [lapsed] = await kv([['ZRANGEBYSCORE', 'founding:holds', '-inf', now, 'LIMIT', 0, 10]]);
    for (const key of lapsed || []) {
        const [sessionId] = await kv([['GET', `founding:hold:${key}`]]);
        if (!sessionId) {
            // No Checkout was ever opened for it (the request died first).
            await kv([['ZREM', 'founding:holds', key]]);
            continue;
        }
        try {
            const session = await stripe('GET', `checkout/sessions/${sessionId}`);
            if (session.status === 'open') {
                await kv([['ZADD', 'founding:holds', Number(session.expires_at || now) + 240, key]]);
            } else if (session.status !== 'complete') {
                await kv([['ZREM', 'founding:holds', key], ['DEL', `founding:hold:${key}`]]);
            } else if (SETTLED.has(session.payment_status)) {
                const made = await licenseFromSession(session);
                if (made) await sendPurchaseEmail(made);
            } else {
                // A bank payment. Still clearing keeps the seat; failed gives it back.
                const pi = session.payment_intent ? await stripe('GET', `payment_intents/${session.payment_intent}`) : null;
                if (pi && pi.status === 'processing') await kv([['ZADD', 'founding:holds', now + FOUNDING_BANK_HOLD, key]]);
                else await kv([['ZREM', 'founding:holds', key], ['DEL', `founding:hold:${key}`]]);
            }
        } catch (e) {
            console.error('[billing] founding hold check', e.message);
        }
    }
}

// Closes the Checkout a hold belongs to, then drops the hold. If Stripe
// won't close it (already paid, or unreachable) the hold stays. -> dropped?
async function endFoundingHold(key) {
    const [sessionId] = await kv([['GET', `founding:hold:${key}`]]);
    if (!sessionId) return false; // its Checkout is still being opened; it checks for itself
    try {
        await stripe('POST', `checkout/sessions/${sessionId}/expire`);
    } catch (e) {
        console.error('[billing] closing an earlier founding Checkout', e.message);
        return false;
    }
    await kv([['ZREM', 'founding:holds', key], ['DEL', `founding:hold:${key}`]]);
    return true;
}

// -> { ok, sold, held }. ipId lets one visitor hold one seat at a time: a
// second founding Checkout from the same address closes the first, so a
// double click (or a script on one address) can't sit on several.
async function holdFoundingSeat(key, ipId) {
    const now = Math.floor(Date.now() / 1000);
    await settleLapsedHolds(now);
    if (ipId) {
        const [prior] = await kv([
            ['GET', `founding:ip:${ipId}`],
            ['SET', `founding:ip:${ipId}`, key, 'EX', FOUNDING_HOLD],
        ]);
        if (prior && prior !== key) await endFoundingHold(prior);
    }
    const out = await kv([
        ['ZADD', 'founding:holds', now + FOUNDING_HOLD, key],
        ['ZCARD', 'founding:holds'],
        ['SCARD', 'founding:seats'],
        ['GET', 'founding:sold'],
    ]);
    const [held, seats, legacy] = out.slice(-3).map((n) => Math.max(0, Number(n || 0)));
    const sold = seats + legacy;
    if (sold + held > FOUNDING_SEATS) {
        await kv([['ZREM', 'founding:holds', key]]);
        return { ok: false, sold, held: held - 1 };
    }
    return { ok: true, sold, held };
}

// Remembers which Checkout a hold belongs to. -> false when a newer
// Checkout from the same visitor took over while this one was opening: this
// one is closed and its seat given back.
async function bindFoundingHold(key, sessionId, ipId) {
    await kv([['SET', `founding:hold:${key}`, sessionId, 'EX', 15 * DAY]]);
    if (!ipId) return true;
    const [current] = await kv([['GET', `founding:ip:${ipId}`]]);
    if (!current || current === key) return true;
    await endFoundingHold(key);
    return false;
}

async function releaseFoundingHold(key) {
    await kv([['ZREM', 'founding:holds', key]]);
}

// A founding payment that is still clearing at the bank keeps its seat.
async function extendFoundingHold(key) {
    await kv([['ZADD', 'founding:holds', Math.floor(Date.now() / 1000) + FOUNDING_BANK_HOLD, key]]);
}

// Gives a founding seat back. Safe to run any number of times for one key.
async function freeFoundingSeat(key, lic) {
    const [removed] = await kv([
        ['SREM', 'founding:seats', key],
        ['ZREM', 'founding:holds', key],
    ]);
    if (removed || lic.seat === '1') return;
    // A seat sold before founding:seats existed was counted in founding:sold.
    const [first] = await kv([['SET', `lic:seatfreed:${key}`, '1', 'NX']]);
    if (first !== 'OK') return;
    const [legacy] = await kv([['GET', 'founding:sold']]);
    if (Number(legacy || 0) > 0) await kv([['DECR', 'founding:sold']]);
}

// Ends a license for good: 'refunded' or 'disputed'. Safe to repeat.
async function revokeLicense(key, reason) {
    const lic = await getLicense(key);
    if (!lic) return null;
    if (lic.status !== 'revoked') {
        await setLicense(key, { status: 'revoked', revoked_reason: reason, revoked_at: new Date().toISOString() });
    }
    if (lic.plan === 'lifetime') await freeFoundingSeat(key, lic);
    return lic;
}

// ---------------------------------------------------------------------------
// Finding licenses by who bought them
// ---------------------------------------------------------------------------

const emailId = (email) => crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex');

// Licenses made before lic:cust existed are found through the customer's
// Checkout sessions, then remembered.
async function keysForCustomer(customer) {
    if (!customer) return [];
    const [known] = await kv([['SMEMBERS', `lic:cust:${customer}`]]);
    if (known && known.length) return known;
    const list = await stripe('GET', 'checkout/sessions', { customer, limit: 20 });
    const keys = [];
    for (const s of list.data || []) {
        const key = s.metadata?.product === 'cadence-pro' && normalizeKey(s.metadata.license_key);
        if (!key || keys.includes(key)) continue;
        const [exists] = await kv([['EXISTS', `lic:${key}`]]);
        if (exists) keys.push(key);
    }
    if (keys.length) await kv([['SADD', `lic:cust:${customer}`, ...keys]]);
    return keys;
}

async function keysForEmail(email) {
    const id = emailId(email);
    const [known] = await kv([['SMEMBERS', `lic:email:${id}`]]);
    if (known && known.length) return known;
    const keys = [];
    const typed = String(email).trim();
    // Stripe matches the address exactly, so try it as typed and lowercased.
    for (const address of new Set([typed, typed.toLowerCase()])) {
        const list = await stripe('GET', 'customers', { email: address, limit: 10 });
        for (const c of list.data || []) {
            for (const key of await keysForCustomer(c.id)) if (!keys.includes(key)) keys.push(key);
        }
    }
    if (keys.length) await kv([['SADD', `lic:email:${id}`, ...keys]]);
    return keys;
}

// ---------------------------------------------------------------------------
// Device seats (off unless CADENCE_MAX_DEVICES is a positive number)
// ---------------------------------------------------------------------------

const DEVICE_RE = /^[A-Za-z0-9._:-]{8,128}$/;
const DEVICE_STALE = 30 * DAY; // a Mac not seen this long gives its seat up

function maxDevices() {
    const n = parseInt(process.env.CADENCE_MAX_DEVICES || '', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeDevice(raw) {
    return typeof raw === 'string' && DEVICE_RE.test(raw) ? raw : null;
}

function deviceList(hash) {
    return Object.entries(hash || {})
        .map(([id, v]) => {
            let d = {};
            try {
                d = JSON.parse(v) || {};
            } catch {}
            return { id, name: String(d.n || ''), last_seen: Number(d.t || 0), first_seen: Number(d.c || d.t || 0) };
        })
        .sort((a, b) => b.last_seen - a.last_seen);
}

// -> { ok: true, used, max } or { ok: false, max, devices }
async function claimDevice(key, device, name) {
    const max = maxDevices();
    if (!max || !device) return { ok: true, used: 0, max: 0 };
    const now = Math.floor(Date.now() / 1000);
    const hkey = `lic:dev:${key}`;
    const [flat] = await kv([['HGETALL', hkey]]);
    let devices = deviceList(hashToObject(flat));
    const mine = devices.find((d) => d.id === device);
    const cleanName = String(name || mine?.name || '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 64);
    const entry = JSON.stringify({ n: cleanName, t: now, c: mine?.first_seen || now });
    if (mine) {
        await kv([['HSET', hkey, device, entry]]);
        return { ok: true, used: devices.length, max };
    }
    // A new Mac: one at a time per license, so two arriving together for
    // the last seat can't both take it or both be turned away.
    const lock = `lic:devlock:${key}`;
    let locked = false;
    for (let i = 0; i < 10 && !locked; i++) {
        const [got] = await kv([['SET', lock, '1', 'NX', 'EX', 5]]);
        locked = got === 'OK';
        if (!locked) await new Promise((r) => setTimeout(r, 30 + i * 15));
    }
    if (!locked) throw Object.assign(new Error('device seats busy'), { status: 503 });
    try {
        const [fresh] = await kv([['HGETALL', hkey]]);
        devices = deviceList(hashToObject(fresh));
        const stale = devices.filter((d) => d.last_seen < now - DEVICE_STALE);
        if (stale.length) {
            await kv([['HDEL', hkey, ...stale.map((d) => d.id)]]);
            devices = devices.filter((d) => !stale.includes(d));
        }
        if (devices.length >= max && !devices.some((d) => d.id === device)) {
            return {
                ok: false,
                max,
                devices: devices.map(({ id, name: n, last_seen }) => ({ id, name: n, last_seen })),
            };
        }
        const [, used] = await kv([
            ['HSET', hkey, device, entry],
            ['HLEN', hkey],
        ]);
        return { ok: true, used: Number(used), max };
    } finally {
        await kv([['DEL', lock]]).catch(() => {});
    }
}

async function releaseDevice(key, device) {
    if (!device) return false;
    const [removed] = await kv([['HDEL', `lic:dev:${key}`, device]]);
    return Number(removed) > 0;
}

// ---------------------------------------------------------------------------
// Rate limits. A counter per caller per window; if the store is down the
// request goes through (a limit must never be why a buyer can't buy).
// ---------------------------------------------------------------------------

function callerId(req) {
    const ip = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || '')
        .split(',')[0]
        .trim();
    return ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 20) : null;
}

async function allow(name, id, max, windowSeconds) {
    if (!id) return true;
    try {
        const rkey = `rl:${name}:${id}`;
        const [, n] = await kv([
            ['SET', rkey, '0', 'EX', windowSeconds, 'NX'],
            ['INCR', rkey],
        ]);
        return Number(n) <= max;
    } catch (e) {
        console.error('[billing] rate limit', e.message);
        return true;
    }
}

// ---------------------------------------------------------------------------
// Creating a license from a finished Checkout session (webhook and the
// welcome page both call this, possibly at once; every write here can be
// repeated safely, so whichever runs, and however often, the result is one
// license, one founding seat and one email)
// ---------------------------------------------------------------------------

// 100%-off promo codes finish with no_payment_required.
const SETTLED = new Set(['paid', 'no_payment_required']);

async function licenseFromSession(session) {
    if (session.metadata?.product !== 'cadence-pro') return null;
    if (session.status !== 'complete') return null;
    if (session.mode === 'payment' && !SETTLED.has(session.payment_status)) return null;
    let key = normalizeKey(session.metadata.license_key);
    const plan = session.metadata.plan;
    if (!key || !PLANS[plan]) return null;

    const [isNew] = await kv([['SET', `lic:session:${session.id}`, key, 'NX']]);
    if (isNew !== 'OK') {
        const [mapped] = await kv([['GET', `lic:session:${session.id}`]]);
        key = normalizeKey(mapped) || key;
        const [exists] = await kv([['EXISTS', `lic:${key}`]]);
        if (exists) return key;
        // The session was claimed but its license never got written (a
        // crash in between): write it now.
    }

    const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
    const fields = {
        email,
        plan,
        customer: session.customer || '',
        subscription: session.subscription || '',
        status: 'active',
        period_end: 0,
        cancel_at: 0,
        created: new Date((session.created || Date.now() / 1000) * 1000).toISOString(),
        session: session.id,
        issued: Math.floor(Date.now() / 1000),
    };
    if (session.subscription) {
        try {
            const sub = await stripe('GET', `subscriptions/${session.subscription}`);
            Object.assign(fields, subFields(sub));
        } catch (e) {
            console.error('[billing] subscription read', e.message);
            fields.period_end = Math.floor(Date.now() / 1000) + 31 * DAY;
        }
    }
    if (plan === 'lifetime') fields.seat = '1';
    const cmds = [['HSET', `lic:${key}`, ...Object.entries(fields).flatMap(([k, v]) => [k, String(v)])]];
    if (session.subscription) cmds.push(['SET', `lic:sub:${session.subscription}`, key]);
    if (session.customer) cmds.push(['SADD', `lic:cust:${session.customer}`, key]);
    if (email) cmds.push(['SADD', `lic:email:${emailId(email)}`, key]);
    if (plan === 'lifetime') cmds.push(['SADD', 'founding:seats', key], ['ZREM', 'founding:holds', key]);
    const claim = session.metadata.claim;
    if (claim && /^[0-9a-f]{32}$/.test(claim)) {
        cmds.push(['SET', `lic:claim:${claim}`, key, 'EX', DAY]);
        // Who opened this Checkout: only they are handed the key (license.js).
        if (session.metadata.claim_by) cmds.push(['SET', `lic:claimby:${claim}`, session.metadata.claim_by, 'EX', DAY]);
    }
    await kv(cmds);
    if (plan === 'lifetime') {
        const [seats, legacy] = await kv([['SCARD', 'founding:seats'], ['GET', 'founding:sold']]);
        if (Number(seats || 0) + Math.max(0, Number(legacy || 0)) > FOUNDING_SEATS) {
            console.error('[billing] FOUNDING SEATS OVERSOLD: more than', FOUNDING_SEATS, 'paid. Refund the latest in Stripe.');
        }
    }

    // The key on later invoices too, so a buyer who loses it finds it in
    // the billing portal. (The first invoice gets it from Checkout.)
    if (session.customer) {
        await stripe('POST', `customers/${session.customer}`, {
            invoice_settings: { custom_fields: { 0: { name: 'License key', value: key } } },
        }).catch((e) => console.error('[billing] customer key field', e.message));
    }
    return key;
}

// Sends the purchase email if it hasn't gone out yet. Never throws: a
// license exists whether or not its email could be sent. -> was it sent
// (now or earlier)?
async function sendPurchaseEmail(key) {
    try {
        const lic = await getLicense(key);
        if (!lic) return false;
        if (lic.emailed) return true;
        if (!lic.email || !mailer.provider()) {
            if (lic.email) console.log('[billing] purchase email not sent: no email provider configured');
            return false;
        }
        // One sender at a time; the lock lapses so a failed send can be retried.
        const [lock] = await kv([['SET', `lic:mailing:${key}`, '1', 'NX', 'EX', 60]]);
        if (lock !== 'OK') return false;
        const result = await mailer.send(mailer.purchaseEmail(key, lic));
        if (result.sent) await setLicense(key, { emailed: new Date().toISOString() });
        else await kv([['DEL', `lic:mailing:${key}`], ['HINCRBY', `lic:${key}`, 'email_tries', 1]]);
        return result.sent;
    } catch (e) {
        console.error('[billing] purchase email', e.message);
        return false;
    }
}

// Is a purchase email still owed and worth another try? The webhook asks
// Stripe to deliver again while it is, which is what retries a failed send.
const EMAIL_TRIES = 8;
async function purchaseEmailOwed(key) {
    if (!mailer.provider()) return false;
    const lic = await getLicense(key);
    if (!lic || !lic.email || lic.emailed) return false;
    // Another delivery is sending it right now; it asks for the retry if it fails.
    const [sending] = await kv([['EXISTS', `lic:mailing:${key}`]]);
    if (sending) return false;
    if (Number(lic.email_tries || 0) >= EMAIL_TRIES) {
        console.error('[billing] purchase email given up after', EMAIL_TRIES, 'tries; send the key by hand');
        return false;
    }
    return true;
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
    PAID,
    FOUNDING_SEATS,
    SITE,
    stripe,
    verifyWebhook,
    periodEnd,
    subFields,
    kv,
    getLicense,
    setLicense,
    newKey,
    normalizeKey,
    licenseId,
    liveStatus,
    tokenFor,
    holdFoundingSeat,
    releaseFoundingHold,
    bindFoundingHold,
    extendFoundingHold,
    revokeLicense,
    keysForCustomer,
    keysForEmail,
    maxDevices,
    normalizeDevice,
    claimDevice,
    releaseDevice,
    callerId,
    allow,
    licenseFromSession,
    sendPurchaseEmail,
    purchaseEmailOwed,
    readRaw,
    readJson,
};
