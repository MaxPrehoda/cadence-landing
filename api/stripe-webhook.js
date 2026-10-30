// POST /api/stripe-webhook  <- Stripe events for Cadence Pro
//
// The endpoint lives on Spore's Stripe account next to Spore's own, so it
// sees every event there and ignores anything that isn't Cadence's
// (metadata.product, or a subscription with a Cadence license).

const { stripe, verifyWebhook, periodEnd, kv, setLicense, licenseFromSession, readRaw } = require('./_billing');

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
    const event = JSON.parse(raw);
    const obj = event.data?.object || {};

    try {
        switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded': {
                if (obj.metadata?.product !== 'cadence-pro') break;
                // Read it back: the event copy may predate payment settling.
                const session = await stripe('GET', `checkout/sessions/${obj.id}`);
                const key = await licenseFromSession(session);
                console.log('[stripe-webhook] license', key ? 'ready' : 'skipped', obj.id);
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const [key] = await kv([['GET', `lic:sub:${obj.id}`]]);
                if (!key) break;
                const status = event.type === 'customer.subscription.deleted' ? 'canceled' : obj.status;
                await setLicense(key, { status, period_end: periodEnd(obj) });
                console.log('[stripe-webhook] subscription', obj.id, status);
                break;
            }
            case 'charge.refunded': {
                // A refunded founding seat stops working.
                if (!obj.payment_intent || !obj.refunded) break;
                const pi = await stripe('GET', `payment_intents/${obj.payment_intent}`);
                if (pi.metadata?.product !== 'cadence-pro' || pi.metadata.plan !== 'lifetime') break;
                const key = pi.metadata.license_key;
                const [exists] = await kv([['EXISTS', `lic:${key}`]]);
                if (exists) await setLicense(key, { status: 'revoked' });
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
