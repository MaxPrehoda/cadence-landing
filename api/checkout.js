// GET /api/checkout?plan=monthly|yearly|lifetime[&claim=<32 hex>]  ->  303 to Stripe Checkout
//
// The license key is minted here and rides in the session metadata, so the
// first invoice can print it. Nothing is stored until the session completes
// (see _billing.licenseFromSession), apart from a short hold on a founding
// seat. The Mac app passes ?claim=<nonce> and polls /api/license?claim= to
// pick the key up itself.
//
// Optional env:
//   CADENCE_STRIPE_TAX=1          let Stripe Tax work out and collect sales tax / VAT
//   CADENCE_STRIPE_API_VERSION    Stripe API version for creating the session (e.g. 2026-10-28.endive)

const {
    PLANS,
    FOUNDING_SEATS,
    SITE,
    stripe,
    newKey,
    holdFoundingSeat,
    releaseFoundingHold,
    bindFoundingHold,
    callerId,
    allow,
} = require('./_billing');

// Link previewers and crawlers follow the plan links; they never buy.
// (Telegram's and Discord's previewers say "bot". A chat app's own in-app
// browser is a person, so the app names alone are not matched.)
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|^whatsapp\/|embedly|headless|python-requests|curl\/|wget\//i;

// Printing the key on a subscription's first invoice needs a Stripe API
// version that has subscription_data.invoice_settings.custom_fields
// (2026-10-28.endive or later). An account on an older version refuses the
// field; remember that and stop asking.
let firstInvoiceField = true;

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
    if (BOT.test(String(req.headers['user-agent'] || ''))) return res.redirect(303, `${SITE}/pricing`);
    const claim = /^[0-9a-f]{32}$/.test(String(req.query.claim || '')) ? String(req.query.claim) : undefined;

    const caller = callerId(req);
    if (!(await allow('checkout', caller, 12, 600))) return res.redirect(303, `${SITE}/pricing?checkout=slow`);

    const key = newKey();
    let held = false;
    try {
        // claim_by: the app that polls for this claim is only handed the key
        // from the address this Checkout was opened from, or once the buyer
        // says so on the welcome page ('-' when the address is unknown).
        const metadata = { product: 'cadence-pro', plan, license_key: key, claim, claim_by: claim ? caller || '-' : undefined };
        const params = {
            mode: spec.mode,
            line_items: { 0: { price, quantity: 1 } },
            success_url: `${SITE}/pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${SITE}/pricing`,
            allow_promotion_codes: true,
            metadata,
        };
        if (process.env.CADENCE_STRIPE_TAX === '1') params.automatic_tax = { enabled: true };
        if (spec.mode === 'payment') {
            // One of the 100 seats is held while this Checkout is open, so
            // the last seat can't be sold twice. The session is kept short
            // so an abandoned one gives the seat back soon.
            const hold = await holdFoundingSeat(key, caller);
            if (!hold.ok) {
                return res.redirect(303, `${SITE}/pricing?${hold.sold >= FOUNDING_SEATS ? 'soldout=1' : 'founding=busy'}`);
            }
            held = true;
            params.expires_at = Math.floor(Date.now() / 1000) + 31 * 60;
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

        const version = process.env.CADENCE_STRIPE_API_VERSION || undefined;
        let session;
        if (spec.mode === 'subscription' && firstInvoiceField) {
            const withField = {
                ...params,
                subscription_data: {
                    metadata,
                    invoice_settings: { custom_fields: { 0: { name: 'License key', value: key } } },
                },
            };
            try {
                session = await stripe('POST', 'checkout/sessions', withField, { version });
            } catch (e) {
                if (e.status !== 400 || !String(e.param || e.message).includes('invoice_settings')) throw e;
                console.error('[checkout] Stripe refused the first-invoice key field:', e.message);
                firstInvoiceField = false;
            }
        }
        if (!session) session = await stripe('POST', 'checkout/sessions', params, { version });
        if (held && !(await bindFoundingHold(key, session.id, caller))) {
            // A newer founding Checkout from this visitor replaced this one.
            return res.redirect(303, `${SITE}/pricing`);
        }
        return res.redirect(303, session.url);
    } catch (e) {
        console.error('[checkout]', e.message);
        if (held) await releaseFoundingHold(key).catch(() => {});
        return res.redirect(303, `${SITE}/pricing?checkout=error`);
    }
};
