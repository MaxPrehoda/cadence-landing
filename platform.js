// Shows a Windows visitor the right thing on every Download button.
//
// The buttons are written for the Mac ("Download for Mac", href="/download").
// On a Windows PC this script points them somewhere useful instead:
//
//   WINDOWS_LIVE = false   Cadence for Windows isn't out. The buttons lead to
//                          /windows (what's coming, and the waitlist).
//   WINDOWS_PREVIEW = true An untested preview is out. The buttons still lead
//                          to /windows, which now has the preview download and
//                          its warnings; nothing starts an installer directly.
//   WINDOWS_LIVE = true    The buttons download the Windows installer.
//
// Flip a flag only together with the same flag in api/download.js; the
// scripts do both (scripts/windows-preview.mjs, scripts/windows-launch.mjs).
// Without JavaScript
// nothing is lost: vercel.json sends a Windows browser that asks for
// /download to /download/windows, which answers the same way.
(() => {
    const WINDOWS_LIVE = false;
    const WINDOWS_PREVIEW = true;

    const ua = navigator.userAgent || '';
    const hinted = navigator.userAgentData && navigator.userAgentData.platform;
    const isWindows = hinted === 'Windows' || /Windows NT/.test(ua);
    document.documentElement.dataset.os = isWindows ? 'windows' : 'other';
    if (!isWindows) return;
    if (WINDOWS_LIVE) document.documentElement.dataset.winLive = '1';

    const href = WINDOWS_LIVE ? '/download/windows' : '/windows';
    const label = WINDOWS_LIVE ? 'Download for Windows' : WINDOWS_PREVIEW ? 'Get the Windows preview' : 'Get notified for Windows';

    const apply = () => {
        document.querySelectorAll('a[href="/download"]').forEach((a) => {
            a.setAttribute('href', href);
            // Only buttons that name the Mac are relabelled; a plain
            // "Download" in the header keeps its word once there is one.
            const text = a.textContent;
            if (/Download for Mac/.test(text)) a.textContent = text.replace('Download for Mac', label);
            else if (!WINDOWS_LIVE && text.trim() === 'Download') a.textContent = WINDOWS_PREVIEW ? 'Windows preview' : 'Windows';
            else if (!WINDOWS_LIVE && /^Download Cadence$/.test(text.trim())) a.textContent = WINDOWS_PREVIEW ? 'Get the Windows preview' : 'Join the Windows waitlist';
        });
        // Key names and phrases that differ: <kbd data-win="Ctrl">⌘</kbd>.
        document.querySelectorAll('[data-win]').forEach((el) => { el.textContent = el.dataset.win; });
        // Anything marked for one system only: data-os-only="mac" | "windows".
        document.querySelectorAll('[data-os-only]').forEach((el) => {
            el.hidden = el.dataset.osOnly !== 'windows';
        });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
    else apply();

    // Count installer downloads the way the Mac ones are counted.
    document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href="/download/windows"], a[href="/download/windows-preview"]');
        if (a && window.va) window.va('event', { name: 'download', data: { arch: a.getAttribute('href').endsWith('-preview') ? 'windows-x64-preview' : 'windows-x64' } });
    });
})();
