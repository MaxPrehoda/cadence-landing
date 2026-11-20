// GET /download            ->  the page download.html: it starts /download/mac
//                              and walks through the install (not this file)
// GET /download/mac        ->  302 to the latest Mac DMG
// GET /download/windows    ->  302 to the latest Windows installer once there
//                              is one; until then, to /windows (the waitlist,
//                              or the preview page while a preview is out)
// GET /download/windows-preview -> 302 to the preview installer, only while
//                              WINDOWS_PREVIEW is on; otherwise as above
// (the last three are rewritten here by vercel.json, as ?os=…)
//
// Every Download button on the site links to /download, and that page asks
// for /download/mac, so a click always gets the newest Apple Silicon build.
// The redirect is cached at the edge for five minutes, which keeps us far inside
// GitHub's unauthenticated API limit. If GitHub can't be reached, it falls
// back to the latest release's page.
//
// The system is chosen by the URL, never by reading the User-Agent here: the
// answer is cached per URL, so a guess from one visitor's browser would be
// served to the next. vercel.json redirects a Windows browser from /download
// to /download/windows before this runs.

const REPO = 'MaxPrehoda/cadence-landing';
const FALLBACK = `https://github.com/${REPO}/releases/latest`;

// Cadence for Windows isn't released. While this is false, /download/windows
// leads to the waitlist page even if a release happens to carry a test
// installer. scripts/windows-launch.mjs sets it (and the one in platform.js).
const WINDOWS_LIVE = false;
const WINDOWS_PAGE = '/windows';

// The untested Windows preview. It is a GitHub pre-release with its own tag,
// so "latest release" (the Mac download and the Mac app's update check) never
// sees it. Only the button on /windows links to /download/windows-preview: a
// Windows browser that asks for plain /download still lands on the page, where
// the warnings are, not on an installer. scripts/windows-preview.mjs sets both
// (and the flag in platform.js).
const WINDOWS_PREVIEW = true;
const WINDOWS_PREVIEW_TAG = 'windows-preview';

const isMacDmg = (a) => /aarch64|arm64/.test(a.name) && a.name.endsWith('.dmg');
// Tauri's NSIS bundle: Cadence_<version>_x64-setup.exe
const isWindowsSetup = (a) => /x64|x86_64/.test(a.name) && /-setup\.exe$/.test(a.name);

function wantedOs(req) {
    // Vercel hands a rewrite's parameters over in req.query; the URL is the fallback.
    if (req.query && typeof req.query.os === 'string') return req.query.os;
    try {
        return new URL(req.url, 'http://x').searchParams.get('os');
    } catch {
        return null;
    }
}

module.exports = async function handler(req, res) {
    const os = wantedOs(req);
    const windows = os === 'windows' || os === 'windows-preview';
    const preview = os === 'windows-preview' && WINDOWS_PREVIEW && !WINDOWS_LIVE && !!WINDOWS_PREVIEW_TAG;
    if (windows && !WINDOWS_LIVE && !preview) {
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
        res.statusCode = 302;
        res.setHeader('Location', WINDOWS_PAGE);
        return res.end();
    }

    // If the lookup fails, a Mac lands on the release page; a PC lands on the
    // Windows page, which has its own download link and the install steps.
    // A preview whose file can't be found lands on its own release page.
    const fallback = preview ? `https://github.com/${REPO}/releases/tag/${WINDOWS_PREVIEW_TAG}` : windows ? WINDOWS_PAGE : FALLBACK;
    const release_path = preview ? `tags/${WINDOWS_PREVIEW_TAG}` : 'latest';
    let to = fallback;
    try {
        const r = await fetch(`https://api.github.com/repos/${REPO}/releases/${release_path}`, {
            headers: { accept: 'application/vnd.github+json', 'user-agent': 'cadencevoice.ai' },
            signal: AbortSignal.timeout(5000),
        });
        if (r.ok) {
            const release = await r.json();
            const asset = (release.assets || []).find(windows ? isWindowsSetup : isMacDmg);
            if (asset) to = asset.browser_download_url;
        }
    } catch {
        // fall through to the fallback
    }
    // A preview installer gets replaced often: keep its redirect for a minute only.
    res.setHeader('Cache-Control', to === fallback ? 'no-store' : preview ? 'public, max-age=0, s-maxage=60' : 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    res.statusCode = 302;
    res.setHeader('Location', to);
    res.end();
};

module.exports.isMacDmg = isMacDmg;
module.exports.isWindowsSetup = isWindowsSetup;
