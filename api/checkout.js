// GET /api/checkout?plan=monthly|yearly|lifetime[&claim=<32 hex>]  ->  303 to Stripe Checkout
//
// The license key is minted here and rides in the session metadata, so the
// one-time founding invoice can print it. Nothing is stored until the
// session completes (see _billing.licenseFromSession). The Mac app passes
// ?claim=<nonce> and polls /api/license?claim= to pick the key up itself.

const { PLANS, FOUNDING_SEATS, SITE, stripe, kv, newKey } = require('./_billing');

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'method_not_allowed' });
    }
    const plan = String(req.query.plan || '');
    const spec = PLANS[plan];
    const price = spec && process.env[spec.env];
    if (!price) return res.redirect(303, `${SITE}/pricing`);
    const claim = /^[0-9a-f]{32}$/.test(String(req.query.claim || '')) ? String(req.query.claim) : undefined;

    try {
        if (plan === 'lifetime') {
            const [sold] = await kv([['GET', 'founding:sold']]);
            if (Number(sold || 0) >= FOUNDING_SEATS) return res.redirect(303, `${SITE}/pricing?soldout=1`);
        }
        const key = newKey();
        const metadata = { product: 'cadence-pro', plan, license_key: key, claim };
        const params = {
            mode: spec.mode,
            line_items: { 0: { price, quantity: 1 } },
            success_url: `${SITE}/pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${SITE}/pricing`,
            allow_promotion_codes: true,
            metadata,
        };
        if (spec.mode === 'payment') {
            params.customer_creation = 'always';
            // Spore's account: say Cadence on the card statement.
            params.payment_intent_data = { statement_descriptor_suffix: 'CADENCE PRO', metadata };
            params.invoice_creation = {
                enabled: true,
                invoice_data: {
                    custom_fields: { 0: { name: 'License key', value: key } },
                    metadata,
                },
            };
        } else {
            params.subscription_data = { metadata };
        }
        const session = await stripe('POST', 'checkout/sessions', params);
        return res.redirect(303, session.url);
    } catch (e) {
        console.error('[checkout]', e.message);
        return res.redirect(303, `${SITE}/pricing?checkout=error`);
    }
};
