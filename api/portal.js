// POST /api/portal  { key }  ->  { url } of a Stripe billing portal session for that license
//
// Cancel, change card, switch monthly/yearly and see invoices (each one
// carries the license key). Founding seats have no subscription but still
// get their receipts there. POST so the key never sits in a URL.

const { SITE, stripe, getLicense, normalizeKey, readJson } = require('./_billing');

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'method_not_allowed' });
    }
    let body;
    try {
        body = await readJson(req);
    } catch {
        return res.status(400).json({ error: 'bad_request' });
    }
    const key = normalizeKey(body.key);
    if (!key) return res.status(422).json({ error: 'invalid_key' });
    try {
        const lic = await getLicense(key);
        if (!lic || !lic.customer) return res.status(404).json({ error: 'unknown_key' });
        // Cadence's own portal settings, not Spore's default on the shared account.
        const session = await stripe('POST', 'billing_portal/sessions', {
            customer: lic.customer,
            configuration: process.env.CADENCE_PORTAL_CONFIG || undefined,
            return_url: `${SITE}/pricing`,
        });
        return res.status(200).json({ url: session.url });
    } catch (e) {
        console.error('[portal]', e.message);
        return res.status(502).json({ error: 'unavailable' });
    }
};
