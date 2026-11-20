// GET /api/founding  ->  { seats: 100, left: <n> }
//
// How many of the 100 founding seats are still unsold, for the "N of 100
// left" line on the home page. A seat counts once its license exists
// (founding:seats, plus founding:sold for seats sold before that set
// existed), the same sum Checkout uses. Seats held by an open Checkout are
// not counted as sold: they come back if the buyer leaves.
//
// Cached at the edge for a minute, so the page never waits on the store and
// a burst of visitors is one read.

const { FOUNDING_SEATS, kv } = require('./_billing');

module.exports = async function handler(req, res) {
    res.setHeader('X-Robots-Tag', 'noindex');
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'method_not_allowed' });
    }
    try {
        const [seats, legacy] = await kv([['SCARD', 'founding:seats'], ['GET', 'founding:sold']]);
        const sold = Number(seats || 0) + Math.max(0, Number(legacy || 0));
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
        return res.status(200).json({ seats: FOUNDING_SEATS, left: Math.max(0, FOUNDING_SEATS - sold) });
    } catch (e) {
        // No count is better than a wrong one: the page keeps "First 100".
        res.setHeader('Cache-Control', 'no-store');
        return res.status(e.status || 502).json({ error: 'unavailable' });
    }
};
