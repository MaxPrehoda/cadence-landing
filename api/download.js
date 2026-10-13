// GET /download (rewritten here by vercel.json)  ->  302 to the latest DMG
//
// Every Download button on the site links to /download, so a click starts
// the newest Apple Silicon build straight away, with no page script. The
// redirect is cached at the edge for five minutes, which keeps us far inside
// GitHub's unauthenticated API limit. If GitHub can't be reached, it falls
// back to the latest release's page.

const REPO = 'MaxPrehoda/cadence-landing';
const FALLBACK = `https://github.com/${REPO}/releases/latest`;

module.exports = async function handler(req, res) {
    let to = FALLBACK;
    try {
        const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
            headers: { accept: 'application/vnd.github+json', 'user-agent': 'cadencevoice.ai' },
            signal: AbortSignal.timeout(5000),
        });
        if (r.ok) {
            const release = await r.json();
            const dmg = (release.assets || []).find(
                (a) => /aarch64|arm64/.test(a.name) && a.name.endsWith('.dmg'),
            );
            if (dmg) to = dmg.browser_download_url;
        }
    } catch {
        // fall through to the releases page
    }
    res.setHeader('Cache-Control', to === FALLBACK ? 'no-store' : 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    res.statusCode = 302;
    res.setHeader('Location', to);
    res.end();
};
