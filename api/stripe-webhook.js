// POST /api/stripe-webhook  <- Stripe events for Cadence Pro
//
// The endpoint lives on Spore's Stripe account next to Spore's own, so it
// sees every event there and ignores anything that isn't Cadence's
// (metadata.product, or a subscription/customer with a Cadence license).
//
// Events it acts on (the list is chosen in Stripe, on the endpoint):
//   checkout.session.completed, checkout.session.async_payment_succeeded,
//   checkout.session.async_payment_failed, checkout.session.expired,
//   customer.subscription.created / updated / deleted / paused / resumed,
//   charge.refunded, charge.dispute.created, charge.dispute.closed
//
// Stripe delivers events more than once and out of order. Every handler
// re-reads the object from Stripe instead of trusting the event's copy and
// only makes changes that are safe to repeat.

const {
    PAID,
    stripe,
    verifyWebhook,
    subFields,
    kv,
    getLicense,
    setLicense,
    normalizeKey,
    releaseFoundingHold,
    extendFoundingHold,
    revokeLicense,
    keysForCustomer,
    licenseFromSession,
    sendPurchaseEmail,
    purchaseEmailOwed,
    readRaw,
} = require('./_billing');

async function fulfil(sessionId) {
    // Read it back: the event copy may predate payment settling.
    const session = await stripe('GET', `checkout/sessions/${sessionId}`);
    const key = await licenseFromSession(session);
    if (key) {
        // A send that failed is retried by having Stripe deliver again (it
        // keeps trying, further apart, for days). The license is already safe.
        if (!(await sendPurchaseEmail(key)) && (await purchaseEmailOwed(key))) {
            throw new Error('purchase email not sent yet; asking Stripe to deliver again');
        }
    } else if (session.metadata?.plan === 'lifetime' && session.status === 'complete' && session.payment_status === 'unpaid') {
        // A bank payment that takes days to clear keeps its founding seat.
        const pending = normalizeKey(session.metadata.license_key);
        if (pending) await extendFoundingHold(pending);
    }
    return key;
}

async function cancelSubscription(id, why) {
    try {
        await stripe('DELETE', `subscriptions/${id}`);
        console.log('[stripe-webhook] canceled subscription', id, why);
    } catch (e) {
        // Already canceled is fine; anything else needs a person.
        console.error('[stripe-webhook] could not cancel subscription', id, why, e.message);
    }
}

// The invoice a charge paid. Older Stripe versions name it on the charge
// or payment intent; newer ones only through invoice payments.
async function invoiceForPayment(charge, pi) {
    const direct = charge.invoice || pi.invoice;
    if (direct) return typeof direct === 'string' ? direct : direct.id;
    const list = await stripe('GET', 'invoice_payments', {
        payment: { type: 'payment_intent', payment_intent: pi.id },
        limit: 1,
    });
    const inv = list.data?.[0]?.invoice;
    return inv ? (typeof inv === 'string' ? inv : inv.id) : null;
}

async function subscriptionForPayment(charge, pi) {
    const invoiceId = await invoiceForPayment(charge, pi);
    if (!invoiceId) return null;
    const inv = await stripe('GET', `invoices/${invoiceId}`);
    const sub = inv.subscription || inv.parent?.subscription_details?.subscription;
    return sub ? (typeof sub === 'string' ? sub : sub.id) : null;
}

// The Cadence licenses a disputed or refunded charge paid for.
async function keysForPayment(paymentIntentId, customerId) {
    let customer = customerId;
    if (paymentIntentId) {
        const pi = await stripe('GET', `payment_intents/${paymentIntentId}`);
        if (pi.metadata?.product === 'cadence-pro') {
            const key = normalizeKey(pi.metadata.license_key);
            const [exists] = key ? await kv([['EXISTS', `lic:${key}`]]) : [0];
            return exists ? [key] : [];
        }
        customer = customer || pi.customer;
    }
    return typeof customer === 'string' ? keysForCustomer(customer) : [];
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'method_not_allowed' });
    }
    let raw;
    try {
        raw = await readRaw(req, 512 * 1024);
    } catch {
        return res.status(400).json({ error: 'bad_request' });
    }
    if (!verifyWebhook(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) {
        return res.status(400).json({ error: 'bad_signature' });
    }
    let event;
    try {
        event = JSON.parse(raw);
    } catch {
        return res.status(400).json({ error: 'bad_request' });
    }
    const obj = event.data?.object || {};

    try {
        switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded': {
                if (obj.metadata?.product !== 'cadence-pro') break;
                const key = await fulfil(obj.id);
                // No session id in the logs: for a day it can fetch the key.
                console.log('[stripe-webhook] license', key ? 'ready' : 'waiting for payment', obj.metadata.plan);
                break;
            }
            case 'checkout.session.async_payment_failed': {
                // A bank debit or similar that bounced after Checkout finished.
                if (obj.metadata?.product !== 'cadence-pro') break;
                const key = normalizeKey(obj.metadata.license_key);
                if (obj.metadata.plan === 'lifetime') {
                    if (key) await releaseFoundingHold(key);
                } else if (obj.subscription) {
                    // Stripe leaves such a subscription active with its
                    // first invoice void. It was never paid for: end it.
                    await cancelSubscription(obj.subscription, 'first payment failed');
                }
                console.log('[stripe-webhook] payment failed after checkout', obj.metadata.plan);
                break;
            }
            case 'checkout.session.expired': {
                if (obj.metadata?.product !== 'cadence-pro' || obj.metadata.plan !== 'lifetime') break;
                const key = normalizeKey(obj.metadata.license_key);
                if (key) await releaseFoundingHold(key);
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
            case 'customer.subscription.paused':
            case 'customer.subscription.resumed': {
                const [key] = await kv([['GET', `lic:sub:${obj.id}`]]);
                if (!key) {
                    // A Cadence subscription with no license yet: the
                    // checkout event was missed or hasn't arrived. Make it.
                    if (obj.metadata?.product !== 'cadence-pro' || !PAID.has(obj.status)) break;
                    const list = await stripe('GET', 'checkout/sessions', { subscription: obj.id, limit: 1 });
                    if (list.data?.[0]) await fulfil(list.data[0].id);
                    break;
                }
                const lic = await getLicense(key);
                if (!lic || lic.status === 'revoked') break;
                // Events arrive out of order; Stripe's current copy is the truth.
                const sub = await stripe('GET', `subscriptions/${obj.id}`);
                const fields = subFields(sub);
                await setLicense(key, fields);
                console.log('[stripe-webhook] subscription', obj.id, fields.status, fields.plan || lic.plan);
                break;
            }
            case 'charge.refunded': {
                // Only a payment refunded in full; a partial refund changes nothing.
                if (!obj.payment_intent || !obj.refunded) break;
                const pi = await stripe('GET', `payment_intents/${obj.payment_intent}`);
                if (pi.metadata?.product === 'cadence-pro') {
                    // A refunded founding seat stops working and goes back
                    // into the 100.
                    if (pi.metadata.plan !== 'lifetime') break;
                    const key = normalizeKey(pi.metadata.license_key);
                    if (key && (await revokeLicense(key, 'refunded'))) console.log('[stripe-webhook] refunded founding seat freed');
                    break;
                }
                // A subscription payment: Pro goes off when the payment for
                // the period now running is refunded in full, and the
                // subscription is ended so it isn't charged again. Refunding
                // an older payment leaves the current, paid period alone.
                let subId;
                try {
                    subId = await subscriptionForPayment(obj, pi);
                } catch (e) {
                    // The Stripe key can't read invoices (or the invoice is
                    // gone). Failing here would make Stripe redeliver every
                    // refund on the account, Spore's included, for days.
                    if (![401, 403, 404].includes(e.status)) throw e;
                    console.error('[stripe-webhook] cannot tell which subscription a refund belongs to:', e.message);
                    break;
                }
                const [key] = subId ? await kv([['GET', `lic:sub:${subId}`]]) : [null];
                if (!key) break;
                const sub = await stripe('GET', `subscriptions/${subId}`);
                const latest = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id;
                if (latest && latest !== (await invoiceForPayment(obj, pi))) {
                    console.log('[stripe-webhook] refund of an earlier subscription payment; license left on');
                    break;
                }
                if (await revokeLicense(key, 'refunded')) {
                    console.log('[stripe-webhook] refunded subscription turned off');
                    if (sub.status !== 'canceled') await cancelSubscription(subId, 'payment refunded');
                }
                break;
            }
            case 'charge.dispute.created': {
                const keys = await keysForPayment(obj.payment_intent, null);
                if (keys.length) {
                    console.error('[stripe-webhook] DISPUTE OPENED on a Cadence Pro payment', obj.id, obj.reason, 'answer it in Stripe');
                }
                break;
            }
            case 'charge.dispute.closed': {
                const keys = await keysForPayment(obj.payment_intent, null);
                if (!keys.length) break;
                console.log('[stripe-webhook] dispute closed', obj.id, obj.status);
                if (obj.status !== 'lost') break;
                for (const key of keys) {
                    const lic = await revokeLicense(key, 'disputed');
                    // Don't keep charging for a license that no longer works.
                    if (lic?.subscription) await cancelSubscription(lic.subscription, 'dispute lost');
                }
                break;
            }
            default:
                break;
        }
    } catch (e) {
        console.error('[stripe-webhook]', event.type, e.message);
        return res.status(500).json({ error: 'handler_failed' });
    }
    return res.status(200).json({ received: true });
};
