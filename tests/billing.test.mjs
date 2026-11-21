// Cadence Pro billing, end to end against in-memory Stripe, Upstash and email.
// Run:  node --test tests/
// No network: any call the mocks don't know fails the test.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { install, call, signedEvent } from './mocks.mjs';

const require = createRequire(import.meta.url);
const load = (name) => require(`../api/${name}.js`);

let world;
let checkout, webhook, license, resendKey;
let ipCounter = 0;

beforeEach(() => {
    world = install();
    // Fresh modules: checkout.js remembers whether Stripe took the invoice field.
    for (const k of Object.keys(require.cache)) if (k.includes('/api/')) delete require.cache[k];
    checkout = load('checkout');
    webhook = load('stripe-webhook');
    license = load('license');
    resendKey = load('resend-key');
});

// ---- a buyer ------------------------------------------------------------

const freshIp = () => `198.51.100.${++ipCounter % 250}.${ipCounter}`;

async function openCheckout(plan, { claim, ip = freshIp(), headers = {} } = {}) {
    const r = await call(checkout, { query: { plan, claim }, headers: { 'x-forwarded-for': ip, ...headers } });
    const id = r.location?.startsWith('https://checkout.stripe.test/') ? r.location.split('/').pop() : null;
    return { r, session: id ? world.stripe.sessions[id] : null };
}

// What Stripe does when the buyer pays in Checkout.
function pay(session, { email = 'Buyer@Example.com', payment = 'paid', price } = {}) {
    const S = world.stripe;
    const n = crypto.randomBytes(5).toString('hex');
    session.status = 'complete';
    session.payment_status = payment;
    session.customer = `cus_${n}`;
    session.customer_details = { email };
    S.customers[session.customer] = { id: session.customer, email };
    if (session.mode === 'subscription') {
        session.subscription = `sub_${n}`;
        S.subscriptions[session.subscription] = {
            id: session.subscription,
            status: 'active',
            customer: session.customer,
            cancel_at_period_end: false,
            cancel_at: null,
            metadata: session.metadata,
            items: { data: [{ current_period_end: now() + 30 * 86400, price: { id: price || `price_${session.metadata.plan}` } }] },
        };
    } else if (payment !== 'no_payment_required') {
        session.payment_intent = `pi_${n}`;
        S.payment_intents[session.payment_intent] = { id: session.payment_intent, customer: session.customer, metadata: session.metadata };
    }
    return session;
}

const now = () => Math.floor(Date.now() / 1000);
const event = (type, object) => call(webhook, signedEvent(type, object));
const activate = (key, extra = {}) => call(license, { method: 'POST', body: { key, ...extra } });
const welcome = (session, ip = '203.0.113.7') => call(license, { query: { session_id: session.id }, headers: { 'x-forwarded-for': ip } });
const stripeDown = () => (world.stripe.refuse = () => ({ status: 500, message: 'down' }));
const stripeUp = () => (world.stripe.refuse = null);
const captureLogs = async (fn) => {
    const seen = [];
    const { log, error } = console;
    console.log = console.error = (...a) => seen.push(a.join(' '));
    try { await fn(); } finally { console.log = log; console.error = error; }
    return seen.join('\n');
};
const lic = (key) => Object.fromEntries(world.kv.get(`lic:${key}`) || []);
const seats = () => world.kv.get('founding:seats')?.size || 0;
const holds = () => world.kv.get('founding:holds')?.size || 0;

async function buy(plan, opts = {}) {
    const { session } = await openCheckout(plan, opts);
    pay(session, opts);
    const r = await event('checkout.session.completed', session);
    assert.equal(r.status, opts.webhook || 200);
    return { session, key: session.metadata.license_key };
}

function verifyToken(token) {
    const [payload, sig] = token.split('.');
    assert.ok(crypto.verify(null, Buffer.from(payload), world.publicKey, Buffer.from(sig, 'base64url')), 'token signature');
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

// ---- 1. the key is emailed, once ------------------------------------------

test('a purchase makes one license and sends one email, however often Stripe and the page ask', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const { session } = await openCheckout('yearly', { claim: 'a'.repeat(32), ip: '192.0.2.50' });
    pay(session);
    const key = session.metadata.license_key;

    // The webhook (delivered three times) and the welcome page, all at once.
    const results = await Promise.all([
        event('checkout.session.completed', session),
        event('checkout.session.completed', session),
        welcome(session),
        event('checkout.session.completed', session),
    ]);
    assert.deepEqual(results.map((r) => r.status), [200, 200, 200, 200]);
    await event('checkout.session.completed', session);
    const page = await welcome(session);

    assert.equal(page.body.key, key);
    assert.equal(page.body.emailed, true);
    assert.equal(page.body.email, 'buyer@example.com');
    assert.equal(world.emails.length, 1, 'exactly one purchase email');
    const mail = world.emails[0];
    assert.equal(mail.to, 'buyer@example.com');
    assert.ok(mail.text.includes(key) && mail.html.includes(key), 'email carries the key');
    assert.match(mail.text, /Settings → Pro/);
    assert.match(mail.text, /billing\.stripe\.com/);
    assert.equal(mail.headers['Idempotency-Key'], `cadence-purchase-${key}`);
    assert.doesNotMatch(mail.text, /iPhone app/i, 'no iPhone section without a TestFlight link');

    assert.equal(lic(key).plan, 'yearly');
    assert.equal(world.stripe.customers[session.customer].key_field, key, 'later invoices print the key');
    const claim = await call(license, { query: { claim: 'a'.repeat(32) }, headers: { 'x-forwarded-for': '192.0.2.50' } });
    assert.equal(claim.body.key, key);
});

test('email trouble never costs the buyer their license; it is sent on the next chance', async () => {
    process.env.RESEND_API_KEY = 're_test';
    world.emailFails = true;
    const { session, key } = await buy('monthly', { webhook: 500 });
    assert.equal(lic(key).status, 'active');
    assert.equal(world.emails.length, 0);
    assert.equal((await activate(key)).status, 200);

    world.emailFails = false;
    const page = await welcome(session);
    assert.equal(page.body.emailed, true);
    assert.equal(world.emails.length, 1);
});

test('a purchase email that fails is retried: Stripe is asked to deliver again until it goes', async () => {
    process.env.RESEND_API_KEY = 're_test';
    world.emailFails = true;
    const { session, key } = await buy('monthly', { webhook: 500 });
    assert.equal((await event('checkout.session.completed', session)).status, 500, 'still failing: ask again');
    assert.equal(lic(key).status, 'active', 'the license is there all along');

    world.emailFails = false;
    assert.equal((await event('checkout.session.completed', session)).status, 200);
    assert.equal(world.emails.length, 1);
    assert.equal((await event('checkout.session.completed', session)).status, 200);
    assert.equal(world.emails.length, 1, 'and only once');
});

test('an email that never goes stops asking Stripe after 8 tries', async () => {
    process.env.RESEND_API_KEY = 're_test';
    world.emailFails = true;
    const { session } = await buy('monthly', { webhook: 500 });
    const statuses = [];
    for (let i = 0; i < 8; i++) statuses.push((await event('checkout.session.completed', session)).status);
    assert.deepEqual(statuses.slice(0, 6), [500, 500, 500, 500, 500, 500]);
    assert.equal(statuses.at(-1), 200);
});

test('with no email provider the webhook does not ask for retries', async () => {
    const { session } = await buy('monthly');
    assert.equal((await event('checkout.session.completed', session)).status, 200);
});

test('with no email provider chosen nothing is sent and nothing breaks', async () => {
    const { session, key } = await buy('monthly');
    const page = await welcome(session);
    assert.equal(page.status, 200);
    assert.equal(page.body.emailed, false);
    assert.equal(world.emails.length, 0);
    assert.equal(lic(key).emailed, undefined);
});

test('Mailgun works as the other adapter', async () => {
    process.env.MAILGUN_API_KEY = 'key-x';
    process.env.MAILGUN_DOMAIN = 'mg.cadencevoice.ai';
    const { key } = await buy('lifetime');
    assert.equal(world.emails.length, 1);
    assert.equal(world.emails[0].provider, 'mailgun');
    assert.ok(world.emails[0].text.includes(key));
    assert.match(world.emails[0].text, /founding member/);
});

// ---- 2. the first invoice carries the key ---------------------------------

test('a subscription Checkout asks Stripe to print the key on its invoices, the first included', async () => {
    const { session } = await openCheckout('monthly');
    assert.equal(session.request['subscription_data[invoice_settings][custom_fields][0][name]'], 'License key');
    assert.equal(session.request['subscription_data[invoice_settings][custom_fields][0][value]'], session.metadata.license_key);
    assert.equal(session.request['subscription_data[metadata][license_key]'], session.metadata.license_key);
});

test('an account whose Stripe version lacks that field still gets a Checkout', async () => {
    world.stripe.refuse = ({ path, params }) =>
        path === 'checkout/sessions' && [...params.keys()].some((k) => k.includes('invoice_settings'))
            ? { message: 'Received unknown parameter: subscription_data[invoice_settings][custom_fields]', code: 'parameter_unknown', param: 'subscription_data[invoice_settings][custom_fields]' }
            : null;
    const a = await openCheckout('monthly');
    assert.ok(a.session, 'fell back to a Checkout without the field');
    assert.equal(a.session.request['subscription_data[invoice_settings][custom_fields][0][value]'], undefined);
    const before = world.stripe.calls.length;
    const b = await openCheckout('yearly');
    assert.ok(b.session);
    assert.equal(world.stripe.calls.length - before, 1, "doesn't ask again once refused");
});

test('the founding invoice prints the key as before', async () => {
    const { session } = await openCheckout('lifetime');
    assert.equal(session.request['invoice_creation[invoice_data][custom_fields][0][value]'], session.metadata.license_key);
});

// ---- 3. plan follows the subscription --------------------------------------

test('switching monthly to yearly in the portal updates the license, even from a stale event', async () => {
    const { session, key } = await buy('monthly');
    const sub = world.stripe.subscriptions[session.subscription];
    const stale = structuredClone(sub);

    sub.items.data[0].price.id = 'price_yearly';
    sub.items.data[0].current_period_end = now() + 365 * 86400;
    // Stripe delivers the old copy last.
    await event('customer.subscription.updated', sub);
    await event('customer.subscription.updated', stale);

    assert.equal(lic(key).plan, 'yearly');
    const r = await activate(key);
    assert.equal(r.body.plan, 'yearly');
    assert.equal(verifyToken(r.body.token).plan, 'yearly');
    assert.equal(r.body.renews, sub.items.data[0].current_period_end);
    assert.equal(r.body.cancel_at_period_end, false);
    assert.equal(r.body.ends_at, null);
});

test('a missed webhook is caught at the next license check', async () => {
    const { session, key } = await buy('monthly');
    const sub = world.stripe.subscriptions[session.subscription];
    world.kv.get(`lic:${key}`).set('period_end', String(now() - 60)); // the stored period ran out
    sub.items.data[0].price.id = 'price_yearly';
    sub.items.data[0].current_period_end = now() + 365 * 86400;
    const r = await activate(key);
    assert.equal(r.status, 200);
    assert.equal(r.body.plan, 'yearly');
    assert.equal(lic(key).plan, 'yearly');
});

test('cancelling at period end keeps Pro and says when it ends', async () => {
    const { session, key } = await buy('yearly');
    const sub = world.stripe.subscriptions[session.subscription];
    sub.cancel_at_period_end = true;
    await event('customer.subscription.updated', sub);
    const r = await activate(key);
    assert.equal(r.status, 200);
    assert.equal(r.body.cancel_at_period_end, true);
    assert.equal(r.body.ends_at, sub.items.data[0].current_period_end);

    sub.status = 'canceled';
    await event('customer.subscription.deleted', sub);
    const after = await activate(key);
    assert.equal(after.status, 402);
    assert.deepEqual(after.body, { error: 'not_paid', plan: 'yearly', reason: 'canceled' });
});

// ---- 4. the 100 founding seats ---------------------------------------------

test('a refunded founding seat goes back into the 100, once', async () => {
    world.kv.set('founding:sold', '5'); // seats counted the old way
    const { session, key } = await buy('lifetime');
    assert.equal(seats(), 1);
    assert.equal(holds(), 0, 'the checkout hold became a seat');
    const charge = { id: 'ch_1', payment_intent: session.payment_intent, refunded: true };

    await event('charge.refunded', charge);
    await event('charge.refunded', charge);
    await event('charge.refunded', charge);
    assert.equal(seats(), 0);
    assert.equal(world.kv.get('founding:sold'), '5', 'the old count is not touched for a new seat');
    assert.equal(lic(key).status, 'revoked');
    const r = await activate(key);
    assert.equal(r.status, 402);
    assert.equal(r.body.reason, 'refunded');
});

test('a partial refund leaves the seat alone', async () => {
    const { session, key } = await buy('lifetime');
    await event('charge.refunded', { id: 'ch_1', payment_intent: session.payment_intent, refunded: false });
    assert.equal(seats(), 1);
    assert.equal((await activate(key)).status, 200);
});

test('seats sold before this change are still counted, and refunding one frees it once', async () => {
    world.kv.set('founding:sold', '99');
    const old = 'CAD-AAAA-BBBB-CCCC-DDDD';
    world.kv.set(`lic:${old}`, new Map(Object.entries({ email: 'old@example.com', plan: 'lifetime', status: 'active', session: 'cs_test_old' })));
    world.stripe.payment_intents.pi_old = { id: 'pi_old', metadata: { product: 'cadence-pro', plan: 'lifetime', license_key: old } };

    const last = await openCheckout('lifetime');
    assert.ok(last.session, 'seat 100 can be bought');
    const over = await openCheckout('lifetime');
    assert.match(over.r.location, /founding=busy/, 'the 101st is refused while the 100th is in checkout');

    pay(last.session);
    await event('checkout.session.completed', last.session);
    const gone = await openCheckout('lifetime');
    assert.match(gone.r.location, /soldout=1/);

    const charge = { id: 'ch_old', payment_intent: 'pi_old', refunded: true };
    await event('charge.refunded', charge);
    await event('charge.refunded', charge);
    assert.equal(world.kv.get('founding:sold'), '98', 'freed exactly once');
    assert.ok((await openCheckout('lifetime')).session, 'the freed seat is for sale again');
});

test('two people cannot both be sold the last seat', async () => {
    world.kv.set('founding:sold', '99');
    const tries = await Promise.all(Array.from({ length: 8 }, () => openCheckout('lifetime')));
    assert.equal(tries.filter((t) => t.session).length, 1);
    assert.equal(holds(), 1);
});

test('an abandoned founding Checkout gives its seat back', async () => {
    world.kv.set('founding:sold', '99');
    const a = await openCheckout('lifetime');
    assert.equal(a.session.request.expires_at > now() + 29 * 60, true);
    assert.equal(a.session.request.expires_at < now() + 33 * 60, true);
    assert.equal((await openCheckout('lifetime')).session, null);
    a.session.status = 'expired';
    await event('checkout.session.expired', a.session);
    assert.ok((await openCheckout('lifetime')).session);
});

const lapse = (session) => world.kv.get('founding:holds').set(session.metadata.license_key, now() - 1);

test('a hold whose Checkout ran out, and Stripe never said so, is given back', async () => {
    world.kv.set('founding:sold', '99');
    const a = await openCheckout('lifetime');
    lapse(a.session);
    a.session.status = 'expired';
    assert.ok((await openCheckout('lifetime')).session);
    assert.equal(holds(), 1);
});

test('a lapsed hold is kept while its Checkout can still be paid, or Stripe cannot be asked', async () => {
    world.kv.set('founding:sold', '99');
    const a = await openCheckout('lifetime');
    lapse(a.session);
    assert.match((await openCheckout('lifetime')).r.location, /founding=busy/, 'still open at Stripe');
    assert.ok(world.kv.get('founding:holds').get(a.session.metadata.license_key) > now(), 'pushed out to when the session ends');

    lapse(a.session);
    a.session.status = 'expired';
    world.stripe.refuse = ({ method, path }) => (method === 'GET' && path.startsWith('checkout/sessions/') ? { status: 500, message: 'down' } : null);
    assert.match((await openCheckout('lifetime')).r.location, /founding=busy/, 'Stripe unreachable: not given away');
    stripeUp();
    assert.ok((await openCheckout('lifetime')).session);
});

test('the last seat is not sold twice when the first buyer paid and the webhook is late', async () => {
    world.kv.set('founding:sold', '99');
    const a = await openCheckout('lifetime');
    pay(a.session); // paid at Stripe; no event has reached us
    lapse(a.session);
    const b = await openCheckout('lifetime');
    assert.equal(b.session, null);
    assert.match(b.r.location, /soldout=1/);
    assert.equal(seats(), 1);
    assert.equal((await activate(a.session.metadata.license_key)).status, 200, 'the paid buyer has their license');
    await event('checkout.session.completed', a.session);
    assert.equal(seats(), 1);
});

test('a lapsed bank-payment hold: kept while the bank is working, given back once it has failed', async () => {
    world.kv.set('founding:sold', '99');
    const a = await openCheckout('lifetime');
    pay(a.session, { payment: 'unpaid' });
    world.stripe.payment_intents[a.session.payment_intent].status = 'processing';
    lapse(a.session);
    assert.equal((await openCheckout('lifetime')).session, null);
    lapse(a.session);
    world.stripe.payment_intents[a.session.payment_intent].status = 'requires_payment_method';
    assert.ok((await openCheckout('lifetime')).session);
});

test('a hold that never got a Checkout (the request died) is dropped once its time is up', async () => {
    world.kv.set('founding:sold', '99');
    world.kv.set('founding:holds', new Map([['CAD-AAAA-AAAA-AAAA-AAAA', now() - 1]]));
    assert.ok((await openCheckout('lifetime')).session);
});

test('one visitor opening a second founding Checkout closes the first: one seat held, one payable', async () => {
    world.kv.set('founding:sold', '98');
    const a = await openCheckout('lifetime', { ip: '192.0.2.1' });
    const b = await openCheckout('lifetime', { ip: '192.0.2.1' });
    assert.ok(a.session && b.session);
    assert.equal(a.session.status, 'expired', 'the first can no longer be paid');
    assert.equal(b.session.status, 'open');
    assert.equal(holds(), 1);
    assert.ok((await openCheckout('lifetime', { ip: '192.0.2.2' })).session, 'someone else can still buy the other');
});

test('a second founding Checkout does not drop the hold of a first that was already paid', async () => {
    world.kv.set('founding:sold', '98');
    const a = await openCheckout('lifetime', { ip: '192.0.2.1' });
    pay(a.session); // paid; event not here yet
    const b = await openCheckout('lifetime', { ip: '192.0.2.1' });
    assert.ok(b.session);
    assert.equal(holds(), 2, 'both count until the first becomes a license');
    assert.equal((await openCheckout('lifetime', { ip: '192.0.2.2' })).session, null);
    await event('checkout.session.completed', a.session);
    assert.equal(seats(), 1);
    assert.equal(holds(), 1);
});

test('two founding Checkouts from one visitor at the same moment leave one open and one seat held', async () => {
    const [a, b] = await Promise.all([openCheckout('lifetime', { ip: '192.0.2.9' }), openCheckout('lifetime', { ip: '192.0.2.9' })]);
    const open = Object.values(world.stripe.sessions).filter((x) => x.status === 'open');
    assert.equal(open.length, 1);
    assert.equal(holds(), 1);
    assert.equal([a, b].filter((x) => x.session && x.session.status === 'open').length, 1);
});

test('however the seats are raced for, paid seats plus open Checkouts never pass 100', async () => {
    world.kv.set('founding:sold', '97');
    const tries = await Promise.all(Array.from({ length: 12 }, () => openCheckout('lifetime')));
    const got = tries.filter((t) => t.session);
    assert.ok(got.length <= 3);
    for (const t of got) pay(t.session);
    await Promise.all(got.map((t) => event('checkout.session.completed', t.session)));
    assert.ok(97 + seats() <= 100);
    assert.ok(97 + seats() + holds() <= 100);
});

test('if Stripe will not open a founding Checkout the hold is dropped', async () => {
    world.stripe.refuse = ({ path }) => (path === 'checkout/sessions' ? { status: 500, message: 'down' } : null);
    const a = await openCheckout('lifetime');
    assert.match(a.r.location, /checkout=error/);
    assert.equal(holds(), 0);
});

// ---- 5. disputes -------------------------------------------------------------

test('an opened dispute changes nothing; a lost one revokes the license and stops the subscription', async () => {
    const { session, key } = await buy('monthly');
    const sub = world.stripe.subscriptions[session.subscription];
    world.stripe.payment_intents.pi_sub = { id: 'pi_sub', customer: session.customer, metadata: {} };
    const dispute = { id: 'du_1', payment_intent: 'pi_sub', reason: 'fraudulent', status: 'needs_response' };

    assert.equal((await event('charge.dispute.created', dispute)).status, 200);
    assert.equal((await activate(key)).status, 200);

    await event('charge.dispute.closed', { ...dispute, status: 'won' });
    assert.equal((await activate(key)).status, 200, 'a won dispute keeps Pro');

    await event('charge.dispute.closed', { ...dispute, status: 'lost' });
    await event('charge.dispute.closed', { ...dispute, status: 'lost' });
    assert.equal(lic(key).status, 'revoked');
    assert.equal(sub.status, 'canceled', 'no more charges for a dead license');
    const r = await activate(key);
    assert.equal(r.status, 402);
    assert.equal(r.body.reason, 'disputed');

    // The cancellation's own event must not bring the license back or relabel it.
    await event('customer.subscription.deleted', sub);
    sub.status = 'active';
    await event('customer.subscription.updated', sub);
    assert.equal(lic(key).status, 'revoked');
    assert.equal((await activate(key)).body.reason, 'disputed');
});

test('a lost dispute on a founding payment frees the seat', async () => {
    const { session, key } = await buy('lifetime');
    await event('charge.dispute.closed', { id: 'du_2', payment_intent: session.payment_intent, status: 'lost' });
    assert.equal(seats(), 0);
    assert.equal((await activate(key)).body.reason, 'disputed');
});

test("disputes and refunds on Spore's own payments are ignored", async () => {
    world.stripe.payment_intents.pi_spore = { id: 'pi_spore', customer: 'cus_spore', metadata: { product: 'spore' } };
    world.stripe.customers.cus_spore = { id: 'cus_spore', email: 's@example.com' };
    assert.equal((await event('charge.dispute.closed', { id: 'du_3', payment_intent: 'pi_spore', status: 'lost' })).status, 200);
    assert.equal((await event('charge.refunded', { id: 'ch_s', payment_intent: 'pi_spore', refunded: true })).status, 200);
    assert.equal((await event('customer.subscription.updated', { id: 'sub_spore', status: 'active', metadata: {} })).status, 200);
});

// ---- 6. device seats ---------------------------------------------------------

test('device seats are off unless a cap is set', async () => {
    const { key } = await buy('yearly');
    for (const d of ['mac-aaaaaaaa', 'mac-bbbbbbbb', 'mac-cccccccc', 'mac-dddddddd']) {
        const r = await activate(key, { device: d });
        assert.equal(r.status, 200);
        assert.equal(r.body.devices, undefined);
    }
    assert.equal(world.kv.get(`lic:dev:${key}`), undefined, 'nothing about Macs is stored');
    assert.deepEqual((await activate(key, { device: 'mac-aaaaaaaa', release: true })).body, { released: false });
});

test('with a cap, the third Mac is told why, and freeing a seat lets it in', async () => {
    process.env.CADENCE_MAX_DEVICES = '2';
    const { key } = await buy('yearly');
    assert.deepEqual((await activate(key, { device: 'mac-aaaaaaaa', device_name: "Max's MacBook Pro" })).body.devices, { used: 1, max: 2 });
    assert.deepEqual((await activate(key, { device: 'mac-bbbbbbbb', device_name: 'Studio' })).body.devices, { used: 2, max: 2 });
    assert.equal((await activate(key, { device: 'mac-aaaaaaaa' })).status, 200, 'a known Mac keeps refreshing');

    const third = await activate(key, { device: 'mac-cccccccc' });
    assert.equal(third.status, 409);
    assert.equal(third.body.error, 'device_limit');
    assert.equal(third.body.max, 2);
    assert.match(third.body.message, /already on 2 Macs/);
    assert.deepEqual(third.body.devices.map((d) => d.name).sort(), ["Max's MacBook Pro", 'Studio']);
    assert.ok(third.body.devices.every((d) => d.id && d.last_seen > 0));

    assert.equal((await activate(key)).status, 200, 'the 0.9.0 app, which sends no device id, is never refused');

    assert.deepEqual((await activate(key, { device: 'mac-bbbbbbbb', release: true })).body, { released: true });
    assert.equal((await activate(key, { device: 'mac-cccccccc' })).status, 200);
    assert.equal((await activate(key, { device: 'mac-bbbbbbbb' })).status, 409);
});

test('a Mac not seen for a month gives its seat up', async () => {
    process.env.CADENCE_MAX_DEVICES = '1';
    const { key } = await buy('yearly');
    await activate(key, { device: 'mac-aaaaaaaa' });
    assert.equal((await activate(key, { device: 'mac-bbbbbbbb' })).status, 409);
    world.kv.get(`lic:dev:${key}`).set('mac-aaaaaaaa', JSON.stringify({ n: '', t: now() - 31 * 86400, c: 1 }));
    assert.equal((await activate(key, { device: 'mac-bbbbbbbb' })).status, 200);
});

test('Macs racing for the last seats: exactly as many win as there are seats', async () => {
    process.env.CADENCE_MAX_DEVICES = '1';
    const one = await buy('yearly');
    const rs = await Promise.all(['mac-aaaaaaaa', 'mac-bbbbbbbb', 'mac-cccccccc'].map((d) => activate(one.key, { device: d })));
    assert.deepEqual(rs.map((r) => r.status).sort(), [200, 409, 409]);
    assert.equal(world.kv.get(`lic:dev:${one.key}`).size, 1);

    process.env.CADENCE_MAX_DEVICES = '2';
    const two = await buy('yearly');
    const rs2 = await Promise.all(['mac-aaaaaaaa', 'mac-bbbbbbbb', 'mac-cccccccc', 'mac-dddddddd'].map((d) => activate(two.key, { device: d })));
    assert.deepEqual(rs2.map((r) => r.status).sort(), [200, 200, 409, 409]);
    assert.equal(world.kv.get(`lic:dev:${two.key}`).size, 2);
    assert.equal(world.kv.get(`lic:devlock:${two.key}`), undefined, 'nothing left locked');
});

test('a junk device id is treated as none', async () => {
    process.env.CADENCE_MAX_DEVICES = '1';
    const { key } = await buy('yearly');
    assert.equal((await activate(key, { device: { $gt: '' } })).status, 200);
    assert.equal((await activate(key, { device: 'x' })).status, 200);
    assert.equal(world.kv.get(`lic:dev:${key}`), undefined);
});

// ---- 7. sales tax --------------------------------------------------------------

test('Stripe Tax is asked for only when switched on', async () => {
    const off = await openCheckout('monthly');
    assert.equal(off.session.request['automatic_tax[enabled]'], undefined);
    process.env.CADENCE_STRIPE_TAX = '1';
    const sub = await openCheckout('monthly');
    const once = await openCheckout('lifetime');
    assert.equal(sub.session.request['automatic_tax[enabled]'], 'true');
    assert.equal(once.session.request['automatic_tax[enabled]'], 'true');
});

// ---- 8. iPhone -----------------------------------------------------------------

test('the iPhone step appears only when a TestFlight link is set', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.CADENCE_TESTFLIGHT_URL = 'https://testflight.apple.com/join/AbCdEf';
    const { session, key } = await buy('yearly');
    assert.equal((await welcome(session)).body.iphone_url, 'https://testflight.apple.com/join/AbCdEf');
    assert.equal((await activate(key)).body.iphone_url, 'https://testflight.apple.com/join/AbCdEf');
    assert.match(world.emails[0].text, /iPhone app/i);
    assert.ok(world.emails[0].html.includes('https://testflight.apple.com/join/AbCdEf'));

    process.env.CADENCE_TESTFLIGHT_URL = 'javascript:alert(1)';
    assert.equal((await welcome(session)).body.iphone_url, undefined, 'only an https link is passed on');
    delete process.env.CADENCE_TESTFLIGHT_URL;
    assert.equal((await activate(key)).body.iphone_url, undefined);
});

// ---- 9. the clumsy and the hostile ----------------------------------------------

test('a bank payment: no key until the money arrives, then the license and the email', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const { session } = await openCheckout('lifetime');
    const key = session.metadata.license_key;
    pay(session, { payment: 'unpaid' });
    await event('checkout.session.completed', session);
    assert.equal(world.kv.get(`lic:${key}`), undefined);
    assert.equal(world.emails.length, 0);
    const page = await welcome(session);
    assert.equal(page.status, 202);
    assert.deepEqual(page.body, { status: 'processing', will_email: true });
    assert.ok(world.kv.get('founding:holds').get(key) > now() + 9 * 86400, 'its seat is kept while the bank clears it');

    session.payment_status = 'paid';
    await event('checkout.session.async_payment_succeeded', session);
    assert.equal((await activate(key)).status, 200);
    assert.equal(world.emails.length, 1);
    assert.equal(seats(), 1);
    assert.equal(holds(), 0);
});

test('a bank payment that bounces: the founding seat comes back', async () => {
    const { session } = await openCheckout('lifetime');
    pay(session, { payment: 'unpaid' });
    await event('checkout.session.completed', session);
    assert.equal(holds(), 1);
    await event('checkout.session.async_payment_failed', session);
    assert.equal(holds(), 0);
    assert.equal(seats(), 0);
    assert.equal((await activate(session.metadata.license_key)).status, 404);
});

test('a subscription whose first bank payment bounces is ended, not left running unpaid', async () => {
    const { session } = await openCheckout('monthly');
    pay(session, { payment: 'unpaid' });
    await event('checkout.session.completed', session);
    const key = session.metadata.license_key;
    assert.equal((await activate(key)).status, 200, 'Pro while the bank works on it');
    await event('checkout.session.async_payment_failed', session);
    const sub = world.stripe.subscriptions[session.subscription];
    assert.equal(sub.status, 'canceled');
    await event('customer.subscription.deleted', sub);
    assert.equal((await activate(key)).status, 402);
});

test('a promo code that takes the price to $0 still gets a license', async () => {
    const { session } = await openCheckout('lifetime');
    pay(session, { payment: 'no_payment_required' });
    await event('checkout.session.completed', session);
    assert.equal((await activate(session.metadata.license_key)).status, 200);
});

test('an unfinished or expired Checkout never yields a key', async () => {
    const { session } = await openCheckout('yearly');
    assert.equal((await welcome(session)).status, 404);
    session.status = 'expired';
    assert.equal((await welcome(session)).status, 404);
    assert.equal((await call(license, { query: { session_id: 'cs_test_doesnotexist00' } })).status, 404);
    assert.equal((await call(license, { query: { session_id: "x' OR 1=1" } })).status, 400);
    assert.equal((await call(license, { query: { claim: 'b'.repeat(32) } })).status, 404);
});

test('a session someone else made on the shared account is not a Cadence purchase', async () => {
    world.stripe.sessions.cs_test_sporesession00 = { id: 'cs_test_sporesession00', mode: 'payment', status: 'complete', payment_status: 'paid', metadata: { product: 'spore', license_key: 'CAD-AAAA-BBBB-CCCC-DDDD', plan: 'lifetime' } };
    assert.equal((await call(license, { query: { session_id: 'cs_test_sporesession00' } })).status, 404);
    assert.equal((await event('checkout.session.completed', world.stripe.sessions.cs_test_sporesession00)).status, 200);
    assert.equal(world.kv.get('lic:CAD-AAAA-BBBB-CCCC-DDDD'), undefined);
});

test('a license half-written by a crash is finished on the next delivery', async () => {
    const { session } = await openCheckout('yearly');
    pay(session);
    const key = session.metadata.license_key;
    world.kv.set(`lic:session:${session.id}`, key); // claimed, then the function died
    await event('checkout.session.completed', session);
    assert.equal(lic(key).plan, 'yearly');
    assert.equal((await activate(key)).status, 200);
});

test('a subscription whose checkout event never arrived is picked up from its own event', async () => {
    const { session } = await openCheckout('monthly');
    pay(session);
    const sub = world.stripe.subscriptions[session.subscription];
    await event('customer.subscription.updated', sub);
    assert.equal((await activate(session.metadata.license_key)).status, 200);
});

test('the webhook refuses anything not signed by Stripe', async () => {
    const good = signedEvent('checkout.session.completed', { id: 'cs_test_x', metadata: {} });
    assert.equal((await call(webhook, { ...good, headers: {} })).status, 400);
    assert.equal((await call(webhook, { ...good, headers: { 'stripe-signature': 't=1,v1=00' } })).status, 400);
    assert.equal((await call(webhook, { ...good, headers: { 'stripe-signature': `t=${now()},v1=${'é'.repeat(64)}` } })).status, 400);
    assert.equal((await call(webhook, { ...good, raw: good.raw + ' ' })).status, 400);
    assert.equal((await call(webhook, good)).status, 200);
    assert.equal((await call(webhook, { method: 'GET' })).status, 405);
});

test('when the store is down the webhook asks Stripe to try again', async () => {
    const { session } = await openCheckout('yearly');
    pay(session);
    world.kvDown = true;
    assert.equal((await event('checkout.session.completed', session)).status, 500);
    world.kvDown = false;
    assert.equal((await event('checkout.session.completed', session)).status, 200);
    assert.equal((await activate(session.metadata.license_key)).status, 200);
});

test('bots and floods do not open Checkouts', async () => {
    const before = world.stripe.calls.length;
    const bot = await openCheckout('yearly', { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } });
    assert.match(bot.r.location, /\/pricing$/);
    const unfurl = await openCheckout('lifetime', { headers: { 'user-agent': 'Slackbot-LinkExpanding 1.0' } });
    assert.match(unfurl.r.location, /\/pricing$/);
    for (const ua of ['WhatsApp/2.23.20.0 A', 'TelegramBot (like TwitterBot)', 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)']) {
        assert.match((await openCheckout('yearly', { headers: { 'user-agent': ua } })).r.location, /\/pricing$/);
    }
    assert.equal(world.stripe.calls.length, before);
    assert.equal(holds(), 0);
    // A person in a chat app's in-app browser is a buyer.
    for (const ua of ['Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36 Discord-Android/230013', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Telegram-iOS']) {
        assert.ok((await openCheckout('yearly', { headers: { 'user-agent': ua } })).session);
    }

    let opened = 0;
    let slowed = 0;
    for (let i = 0; i < 20; i++) {
        const r = await openCheckout('monthly', { ip: '192.0.2.50' });
        if (r.session) opened++;
        else if (/checkout=slow/.test(r.r.location)) slowed++;
    }
    assert.equal(opened, 12);
    assert.equal(slowed, 8);
    assert.ok((await openCheckout('monthly', { ip: '192.0.2.51' })).session, 'other visitors are unaffected');
});

test('unknown plans, wrong methods and junk bodies get plain answers', async () => {
    assert.match((await openCheckout('enterprise')).r.location, /\/pricing$/);
    assert.equal((await call(checkout, { method: 'POST', query: { plan: 'yearly' } })).status, 405);
    assert.equal((await activate('cad-zzzz')).status, 422);
    assert.equal((await activate('CAD-AAAA-BBBB-CCCC-DDDD')).status, 404);
    assert.equal((await call(license, { method: 'POST', body: 'not json' })).status, 400);
    assert.equal((await call(license, { method: 'POST', body: 'null' })).status, 400);
    assert.equal((await call(license, { method: 'DELETE' })).status, 405);
});

test('a pasted key with spaces and lowercase works', async () => {
    const { key } = await buy('yearly');
    assert.equal((await activate(`  ${key.toLowerCase()} `)).status, 200);
});

test('the token is signed and names the plan and the buyer', async () => {
    const { key } = await buy('monthly');
    const claims = verifyToken((await activate(key)).body.token);
    assert.equal(claims.plan, 'monthly');
    assert.equal(claims.email, 'buyer@example.com');
});

// A subscription with two days left in its period, in the given state.
async function twoDaysLeft(change = () => {}) {
    const { session, key } = await buy('monthly');
    const sub = world.stripe.subscriptions[session.subscription];
    sub.items.data[0].current_period_end = now() + 2 * 86400;
    change(sub);
    await event('customer.subscription.updated', sub);
    return { key, sub };
}
const tokenDays = async (key) => (verifyToken((await activate(key)).body.token).exp - now()) / 86400;
const near = (days, want) => Math.abs(days - want) < 0.01;

test('a subscription set to renew gets the full 14-day token across its renewal date', async () => {
    const { key } = await twoDaysLeft();
    assert.ok(near(await tokenDays(key), 14));
});

test('a cancelled subscription gets a token that stops at the paid period plus the grace', async () => {
    const atPeriodEnd = await twoDaysLeft((sub) => (sub.cancel_at_period_end = true));
    assert.ok(near(await tokenDays(atPeriodEnd.key), 5));
    const onADate = await twoDaysLeft((sub) => (sub.cancel_at = now() + 2 * 86400));
    assert.ok(near(await tokenDays(onADate.key), 5));
});

test('a subscription behind on payment keeps the capped token', async () => {
    const { key } = await twoDaysLeft((sub) => (sub.status = 'past_due'));
    assert.ok(near(await tokenDays(key), 5));
});

test('a period that ran out while Stripe cannot be reached keeps the capped token', async () => {
    const { key, sub } = await twoDaysLeft();
    world.kv.get(`lic:${key}`).set('period_end', String(now() - 86400));
    delete world.stripe.subscriptions[sub.id];
    const r = await activate(key);
    assert.equal(r.status, 200);
    assert.ok(near((verifyToken(r.body.token).exp - now()) / 86400, 2));
});

test('a renewal Stripe already took is seen at the next check and the token runs 14 days again', async () => {
    const { key, sub } = await twoDaysLeft();
    world.kv.get(`lic:${key}`).set('period_end', String(now() - 86400));
    sub.items.data[0].current_period_end = now() + 30 * 86400;
    assert.ok(near(await tokenDays(key), 14));
});

// ---- review S1: Stripe unreachable is not "not paid" ------------------------------

test('Stripe unreachable long past the renewal date: the answer is "try later", never "not paid"', async () => {
    const { key } = await buy('monthly');
    world.kv.get(`lic:${key}`).set('period_end', String(now() - 10 * 86400)); // well past the 3 days of grace
    stripeDown();
    const r = await activate(key);
    assert.equal(r.status, 503);
    assert.deepEqual(r.body, { error: 'unavailable' });
    assert.equal(lic(key).status, 'active', 'nothing was written');

    stripeUp(); // Stripe is back and the subscription had renewed all along
    const back = await activate(key);
    assert.equal(back.status, 200);
    assert.ok(verifyToken(back.body.token).exp > now());
});

test('Stripe unreachable with a late card payment on file: still "try later"', async () => {
    const { key } = await buy('monthly');
    world.kv.get(`lic:${key}`).set('status', 'past_due').set('period_end', String(now() - 10 * 86400));
    stripeDown();
    assert.equal((await activate(key)).status, 503);
});

test('Stripe unreachable inside the grace period: Pro stays on from what is stored', async () => {
    const { key } = await buy('monthly');
    world.kv.get(`lic:${key}`).set('period_end', String(now() - 86400));
    stripeDown();
    assert.equal((await activate(key)).status, 200);
});

test('Stripe unreachable for a subscription already known to have ended: it stays ended', async () => {
    const { session, key } = await buy('monthly');
    const sub = world.stripe.subscriptions[session.subscription];
    sub.status = 'canceled';
    await event('customer.subscription.deleted', sub);
    stripeDown();
    const r = await activate(key);
    assert.equal(r.status, 402);
    assert.equal(r.body.reason, 'canceled');
});

test('Stripe reachable and the subscription really has lapsed: that is "not paid"', async () => {
    const { session, key } = await buy('monthly');
    world.kv.get(`lic:${key}`).set('period_end', String(now() - 10 * 86400));
    const sub = world.stripe.subscriptions[session.subscription];
    sub.status = 'canceled';
    assert.equal((await activate(key)).status, 402);
});

// ---- review S2: a refunded subscription payment -------------------------------

// The invoice and charge Stripe makes for a subscription period.
function invoiceFor(session, id) {
    const S = world.stripe;
    const sub = S.subscriptions[session.subscription];
    const pi = `pi_${id}`;
    S.invoices[`in_${id}`] = { id: `in_${id}`, pi, parent: { subscription_details: { subscription: sub.id } } };
    S.payment_intents[pi] = { id: pi, customer: sub.customer, metadata: {} };
    sub.latest_invoice = `in_${id}`;
    return { id: `ch_${id}`, payment_intent: pi, refunded: true, amount_refunded: 1500 };
}

test('refunding the current subscription payment in full turns Pro off and ends the subscription', async () => {
    const { session, key } = await buy('monthly');
    const charge = invoiceFor(session, 'one');
    for (let i = 0; i < 2; i++) assert.equal((await event('charge.refunded', charge)).status, 200);
    const r = await activate(key);
    assert.equal(r.status, 402);
    assert.deepEqual(r.body, { error: 'not_paid', plan: 'monthly', reason: 'refunded' });
    assert.equal(world.stripe.subscriptions[session.subscription].status, 'canceled', 'not charged again');
    assert.equal(world.stripe.calls.filter((c) => c.method === 'DELETE').length, 1);
});

test('a partial refund of a subscription payment changes nothing', async () => {
    const { session, key } = await buy('monthly');
    const charge = { ...invoiceFor(session, 'one'), refunded: false };
    await event('charge.refunded', charge);
    assert.equal((await activate(key)).status, 200);
    assert.equal(world.stripe.subscriptions[session.subscription].status, 'active');
});

test('refunding an older subscription payment leaves the current paid period alone', async () => {
    const { session, key } = await buy('monthly');
    const old = invoiceFor(session, 'old');
    invoiceFor(session, 'new'); // a later period has been paid since
    await event('charge.refunded', old);
    assert.equal((await activate(key)).status, 200);
    assert.equal(world.stripe.subscriptions[session.subscription].status, 'active');
});

test('a refunded subscription payment on an older Stripe version (invoice named on the charge) works too', async () => {
    const { session, key } = await buy('yearly');
    const charge = invoiceFor(session, 'one');
    world.stripe.invoices.in_one = { id: 'in_one', subscription: session.subscription };
    await event('charge.refunded', { ...charge, invoice: 'in_one' });
    assert.equal((await activate(key)).status, 402);
});

test("a refund of one of Spore's own subscription payments is ignored", async () => {
    const { key } = await buy('monthly');
    world.stripe.subscriptions.sub_spore = { id: 'sub_spore', status: 'active', latest_invoice: 'in_spore', items: { data: [] } };
    world.stripe.invoices.in_spore = { id: 'in_spore', pi: 'pi_spore', subscription: 'sub_spore' };
    world.stripe.payment_intents.pi_spore = { id: 'pi_spore', metadata: {} };
    assert.equal((await event('charge.refunded', { id: 'ch_s', payment_intent: 'pi_spore', refunded: true })).status, 200);
    assert.equal(world.stripe.subscriptions.sub_spore.status, 'active');
    assert.equal((await activate(key)).status, 200);
});

test('a Stripe key that cannot read invoices: refunds are acknowledged, not failed for days', async () => {
    const { session, key } = await buy('monthly');
    const charge = invoiceFor(session, 'one');
    world.stripe.refuse = ({ path }) => (/^invoice/.test(path) ? { status: 403, message: 'permission' } : null);
    assert.equal((await event('charge.refunded', charge)).status, 200);
    assert.equal((await event('charge.refunded', { id: 'ch_s', payment_intent: charge.payment_intent, refunded: true })).status, 200);
    assert.equal((await activate(key)).status, 200, 'nothing was changed');
    world.stripe.refuse = ({ path }) => (/^invoice/.test(path) ? { status: 500, message: 'down' } : null);
    assert.equal((await event('charge.refunded', charge)).status, 500, 'a passing outage is retried');
});

// ---- review S6: a claim only hands the key to whoever opened the Checkout ---------

const CLAIM = 'c'.repeat(32);
const pollClaim = (ip) => call(license, { query: { claim: CLAIM }, headers: { 'x-forwarded-for': ip } });
const confirmApp = (session) => call(license, { method: 'POST', body: { session_id: session.id, release_to_app: true } });

test('the app that opened Checkout picks its key up by itself, as 0.9.0 does', async () => {
    const { session, key } = await buy('yearly', { claim: CLAIM, ip: '192.0.2.10' });
    const r = await pollClaim('192.0.2.10');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { key });
    assert.equal((await welcome(session)).body.app, 'on');
});

test('a link prepared by someone else does not hand them the key the buyer paid for', async () => {
    // The stranger made the claim and sent the buyer the link; the buyer opens it and pays.
    const { session, key } = await buy('yearly', { claim: CLAIM, ip: '192.0.2.10' });
    for (let i = 0; i < 3; i++) {
        const r = await pollClaim('198.51.100.99');
        assert.equal(r.status, 404);
        assert.deepEqual(r.body, { error: 'not_yet' });
    }
    assert.equal((await call(license, { query: { claim: CLAIM }, headers: { 'x-forwarded-for': '' } })).status, 404, 'no address is not a match');
    const page = await welcome(session);
    assert.equal(page.body.key, key, 'the buyer still gets it');
    assert.equal(page.body.app, 'ask', 'and is asked whether that app is theirs');
});

test('an app on another address (VPN, private relay) gets the key once the buyer says yes', async () => {
    const { session, key } = await buy('yearly', { claim: CLAIM, ip: '192.0.2.10' });
    assert.equal((await pollClaim('198.51.100.99')).status, 404);
    assert.equal((await welcome(session)).body.app, 'ask');
    assert.deepEqual((await confirmApp(session)).body, { ok: true });
    assert.deepEqual((await pollClaim('198.51.100.99')).body, { key });
    assert.equal((await welcome(session)).body.app, 'on');
});

test('saying yes needs a real, paid Cadence session with a claim', async () => {
    assert.equal((await call(license, { method: 'POST', body: { session_id: 'cs_test_nosuchsession', release_to_app: true } })).status, 404);
    assert.equal((await call(license, { method: 'POST', body: { session_id: 'nonsense', release_to_app: true } })).status, 400);
    const unpaid = await openCheckout('yearly', { claim: CLAIM });
    assert.equal((await confirmApp(unpaid.session)).status, 404);
    const noClaim = await buy('yearly');
    assert.equal((await confirmApp(noClaim.session)).status, 404);
});

test('a Checkout opened before claims were bound still hands its key over', async () => {
    const { session } = await openCheckout('yearly', { claim: CLAIM });
    delete session.metadata.claim_by; // what the live site made before this change
    pay(session);
    await event('checkout.session.completed', session);
    assert.equal((await pollClaim('198.51.100.99')).status, 200);
});

test('a purchase from the website, with no app waiting, says nothing about an app', async () => {
    const { session } = await buy('yearly');
    assert.equal('app' in (await welcome(session)).body, false);
});

// ---- review S7: session ids --------------------------------------------------

test('the welcome link shows the key for a day from its first showing, then never again', async () => {
    const { session, key } = await buy('yearly', { claim: CLAIM });
    assert.equal((await welcome(session)).body.key, key);
    assert.equal((await welcome(session)).body.key, key, 'a reload inside the day is fine');
    world.kv.get(`lic:${key}`).set('shown', String(now() - 86400 - 5));
    const late = await welcome(session);
    assert.equal(late.status, 410);
    assert.deepEqual(late.body, { error: 'expired' });
    assert.equal((await confirmApp(session)).status, 410, 'and cannot release it to an app either');
    assert.equal((await activate(key)).status, 200, 'the license itself is untouched');
});

test('a welcome link never opened stops working two weeks after the license was made', async () => {
    const { session, key } = await buy('yearly');
    world.kv.get(`lic:${key}`).set('issued', String(now() - 15 * 86400));
    assert.equal((await welcome(session)).status, 410);
});

test('a license made before this change (no issue time) goes by its creation date', async () => {
    const { session, key } = await buy('yearly');
    const h = world.kv.get(`lic:${key}`);
    h.delete('issued');
    h.set('created', new Date(Date.now() - 30 * 86400e3).toISOString());
    assert.equal((await welcome(session)).status, 410);
    h.set('created', new Date().toISOString());
    h.delete('shown');
    assert.equal((await welcome(session)).status, 200);
});

test('checkout session ids are never written to the logs', async () => {
    const ids = [];
    const logs = await captureLogs(async () => {
        const a = await buy('yearly');
        const b = await openCheckout('lifetime');
        pay(b.session, { payment: 'unpaid' });
        await event('checkout.session.completed', b.session);
        await event('checkout.session.async_payment_failed', b.session);
        const c = await openCheckout('lifetime');
        c.session.status = 'expired';
        await event('checkout.session.expired', c.session);
        await welcome(a.session);
        ids.push(a.session.id, b.session.id, c.session.id);
    });
    assert.ok(logs.length > 0);
    for (const id of ids) assert.equal(logs.includes(id), false);
    assert.doesNotMatch(logs, /cs_test_/);
});

// ---- send my key again -----------------------------------------------------------

test('"send my key again" answers the same for buyers and strangers, and mails only buyers', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const { key } = await buy('yearly', { email: 'pat@example.com' });
    world.emails.length = 0;

    const known = await call(resendKey, { method: 'POST', body: { email: ' Pat@Example.com ' } });
    const stranger = await call(resendKey, { method: 'POST', body: { email: 'nobody@example.com' } });
    assert.deepEqual([known.status, known.body], [200, { ok: true }]);
    assert.deepEqual([stranger.status, stranger.body], [known.status, known.body]);
    assert.equal(world.emails.length, 1);
    assert.equal(world.emails[0].to, 'pat@example.com');
    assert.ok(world.emails[0].text.includes(key));

    assert.equal((await call(resendKey, { method: 'POST', body: { email: 'nope' } })).status, 422);
    assert.deepEqual((await call(resendKey, { method: 'POST', body: { email: 'pat@example.com', company: 'Acme' } })).body, { ok: true });
    assert.equal(world.emails.length, 1, 'the honeypot sends nothing');
});

test('"send my key again" finds a license bought before the email index existed', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const old = 'CAD-AAAA-BBBB-CCCC-DDDD';
    world.kv.set(`lic:${old}`, new Map(Object.entries({ email: 'early@example.com', plan: 'lifetime', status: 'active', customer: 'cus_early' })));
    world.stripe.customers.cus_early = { id: 'cus_early', email: 'early@example.com' };
    world.stripe.sessions.cs_test_early0000000 = { id: 'cs_test_early0000000', customer: 'cus_early', metadata: { product: 'cadence-pro', plan: 'lifetime', license_key: old } };
    await call(resendKey, { method: 'POST', body: { email: 'early@example.com' } });
    assert.equal(world.emails.length, 1);
    assert.ok(world.emails[0].text.includes(old));
    assert.ok(world.kv.get(`lic:cust:cus_early`).has(old), 'remembered for next time');
});

test('"send my key again" is limited per visitor and per address, and off without a provider', async () => {
    assert.deepEqual((await call(resendKey, { method: 'GET' })).body, { enabled: false });
    assert.equal((await call(resendKey, { method: 'POST', body: { email: 'pat@example.com' } })).status, 503);

    process.env.RESEND_API_KEY = 're_test';
    assert.deepEqual((await call(resendKey, { method: 'GET' })).body, { enabled: true });
    await buy('yearly', { email: 'pat@example.com' });
    world.emails.length = 0;
    const statuses = [];
    for (let i = 0; i < 4; i++) {
        statuses.push((await call(resendKey, { method: 'POST', body: { email: 'pat@example.com' }, headers: { 'x-forwarded-for': `192.0.2.${100 + i}` } })).status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 200]);
    assert.equal(world.emails.length, 3, 'at most three emails a day to one address');

    const flood = [];
    for (let i = 0; i < 7; i++) flood.push((await call(resendKey, { method: 'POST', body: { email: `x${i}@example.com` }, headers: { 'x-forwarded-for': '192.0.2.200' } })).status);
    assert.deepEqual(flood, [200, 200, 200, 200, 200, 429, 429]);
});

// ---- accounts: one person's computers, whatever key each holds -------------

const mac = (n) => ({ id: String(n).repeat(32).slice(0, 32), name: `Computer ${n}` });
const phone = (c) => c.repeat(64).slice(0, 64);

test('two keys under one email are one account: the same secret, and each computer sees the other', async () => {
    const a = await buy('monthly', { email: 'Sam@Example.com' });
    const b = await buy('yearly', { email: 'sam@example.com ' });
    const first = await activate(a.key, { computer: mac(1) });
    assert.equal(first.status, 200);
    assert.match(first.body.account.secret, /^[0-9a-f]{64}$/);
    assert.deepEqual(first.body.account.computers.map((c) => c.id), [mac(1).id]);
    const second = await activate(b.key, { computer: mac(2) });
    assert.equal(second.body.account.secret, first.body.account.secret);
    assert.deepEqual(second.body.account.computers.map((c) => c.name).sort(), ['Computer 1', 'Computer 2']);
    // The first computer learns of the second without a new token.
    const roster = await activate(a.key, { computer: mac(1), roster: true });
    assert.equal(roster.status, 200);
    assert.equal(roster.body.token, undefined);
    assert.deepEqual(roster.body.account.computers.map((c) => c.id).sort(), [mac(1).id, mac(2).id]);
});

test('someone else is another account', async () => {
    const mine = await buy('monthly', { email: 'sam@example.com' });
    const theirs = await buy('monthly', { email: 'alex@example.com' });
    const a = await activate(mine.key, { computer: mac(1) });
    const b = await activate(theirs.key, { computer: mac(2) });
    assert.notEqual(a.body.account.secret, b.body.account.secret);
    assert.deepEqual(b.body.account.computers.map((c) => c.id), [mac(2).id]);
});

test('keys under different emails are one account once both computers are paired with the same iPhone', async () => {
    const home = await buy('monthly', { email: 'sam@example.com' });
    const work = await buy('monthly', { email: 'sam@work.example' });
    const a = await activate(home.key, { computer: mac(1), phones: [phone('a')] });
    const b = await activate(work.key, { computer: mac(2), phones: [phone('a')] });
    assert.equal(b.body.account.secret, a.body.account.secret);
    assert.deepEqual(b.body.account.computers.map((c) => c.id).sort(), [mac(1).id, mac(2).id]);
    // And it stays that way without the phone in the request.
    const later = await activate(work.key, { computer: mac(2), roster: true });
    assert.equal(later.body.account.secret, a.body.account.secret);
});

test('two accounts that turn out to share an iPhone are joined into the older one, computers and all', async () => {
    const home = await buy('monthly', { email: 'sam@example.com' });
    const work = await buy('monthly', { email: 'sam@work.example' });
    const a = await activate(home.key, { computer: mac(1) });
    const b = await activate(work.key, { computer: mac(2) });
    assert.notEqual(a.body.account.secret, b.body.account.secret);
    world.kv.set([...world.kv.keys()].find((k) => k.endsWith(':made') && world.kv.get(k) && k.includes(String(world.kv.get(`acct:h:e:${crypto.createHash('sha256').update('sam@work.example').digest('hex')}`)))), String(now() + 60));
    const joined = await activate(work.key, { computer: mac(2), phones: [phone('b')] });
    assert.equal(joined.body.account.secret, b.body.account.secret, 'nothing links them yet');
    const linked = await activate(home.key, { computer: mac(1), phones: [phone('b')] });
    assert.equal(linked.body.account.secret, a.body.account.secret, 'the older account is kept');
    assert.deepEqual(linked.body.account.computers.map((c) => c.id).sort(), [mac(1).id, mac(2).id]);
    const moved = await activate(work.key, { computer: mac(2), roster: true });
    assert.equal(moved.body.account.secret, a.body.account.secret, 'the other computer moves over when it next asks');
});

test('a license that lapsed gets no account, and a bad computer or phone id is ignored', async () => {
    const { session, key } = await buy('monthly', { email: 'sam@example.com' });
    const odd = await activate(key, { computer: { id: 'not-an-id', name: 'x' }, phones: ['nope', 7] });
    assert.equal(odd.status, 200);
    assert.deepEqual(odd.body.account.computers, []);
    world.stripe.subscriptions[session.subscription].status = 'canceled';
    world.kv.get(`lic:${key}`).set('period_end', String(now() - 60));
    const over = await activate(key, { computer: mac(1), roster: true });
    assert.equal(over.status, 402);
    assert.equal(over.body.account, undefined);
});

test('if the account store is down the license still comes back', async () => {
    const { key } = await buy('monthly', { email: 'sam@example.com' });
    const real = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
        if (typeof init?.body === 'string' && init.body.includes('acct:')) return new Response('down', { status: 500 });
        return real(url, init);
    };
    try {
        const logs = await captureLogs(async () => {
            const r = await activate(key, { computer: mac(1) });
            assert.equal(r.status, 200);
            assert.ok(r.body.token);
            assert.equal(r.body.account, undefined);
        });
        assert.match(logs, /account/);
    } finally {
        globalThis.fetch = real;
    }
});
