// The site's "Windows preview" state: every change to an existing file.
// Applied only by scripts/windows-preview.mjs; nothing here is deployed.
// It starts from the "Windows is coming" state and `undo` puts that back.
//
//   find     exact text, must occur exactly once
//   replace  what takes its place; {{tag}} etc. come from release.json
//
// Nothing here says a feature works on Windows. The copy says: early preview,
// not tested on Windows, unsigned.

// Whole pages. `from` is under launch/windows-preview/pages/.
export const pages = [
    { from: 'windows.html', to: 'windows.html' },
];

export const edits = [
    // ---- the switch (keep the three in step) ----
    { file: 'api/download.js', find: 'const WINDOWS_PREVIEW = false;', replace: 'const WINDOWS_PREVIEW = true;' },
    { file: 'api/download.js', find: 'const WINDOWS_PREVIEW_TAG = null;', replace: "const WINDOWS_PREVIEW_TAG = '{{tag}}';" },
    { file: 'platform.js', find: 'const WINDOWS_PREVIEW = false;', replace: 'const WINDOWS_PREVIEW = true;' },

    // ---- home page: one line in the hero, one button and one line by the Mac download ----
    // (the button is hidden on a PC, where the main button already says the same)
    { file: 'index.html',
      find: '<div class="fine">Free · <a href="/pricing">Pro from $20/mo</a> · No account · macOS 13+ on Apple Silicon</div>',
      replace: '<div class="fine">Free · <a href="/pricing">Pro from $20/mo</a> · No account · macOS 13+ on Apple Silicon · <a href="/windows">Windows preview</a></div>' },
    { file: 'index.html',
      find: '<div><b>Windows:</b> in the works, not ready yet. <a href="/windows">Join the waitlist</a>.</div>',
      replace: '<div><b>Windows 11:</b> an early preview. Not tested on Windows yet, and unsigned. <a href="/windows">Read this first</a>.</div>' },
    { file: 'index.html',
      find: 'class="cta" style="margin-left:6px">Release notes</a>',
      replace: 'class="cta" style="margin-left:6px">Release notes</a>\n            <span data-os-only="mac"><a href="/windows" class="cta" style="margin-left:6px">Windows preview</a></span>' },
    { file: 'index.html',
      find: '<p>On Windows? We\'re building it, and it isn\'t ready yet. <a href="/windows">Join the Windows waitlist</a>.</p>',
      replace: '<p>On Windows? There is an early preview for Windows 11. It has not been tested on Windows yet. <a href="/windows">Cadence for Windows</a> says what to expect.</p>' },

    // ---- FAQ ----
    { file: 'faq.html',
      find: `<strong>Windows: yes, we're building it.</strong> It isn't ready and there is nothing to download yet,
                so today Cadence runs on the Mac only. <a href="/windows">Join the Windows waitlist</a> and you'll get
                one email, the day you can download it.`,
      replace: `<strong>Windows: there is an early preview for Windows 11.</strong> It has not been tested on Windows yet and
                its installer is unsigned, so treat it as a first look. <a href="/windows">Cadence for Windows</a> has the
                download and what to expect. The Mac version is the finished one. Join the waitlist there for
                one email, the day the tested version is ready.` },

    // ---- llms.txt ----
    { file: 'llms.txt',
      find: '- Windows: a Windows version is being built and is not available yet; there is no Windows download and no release date. Waitlist: https://www.cadencevoice.ai/windows\n',
      replace: '- Windows: an early preview for Windows 11 x64 can be downloaded. It has not been tested on Windows, the installer is unsigned, and no feature is confirmed to work there yet. Do not describe Cadence as supporting Windows. Details: https://www.cadencevoice.ai/windows\n' },
    { file: 'llms.txt',
      find: '- [Cadence for Windows](https://www.cadencevoice.ai/windows): not released yet; what is being built and the waitlist',
      replace: '- [Cadence for Windows](https://www.cadencevoice.ai/windows): untested early preview; download, install steps, what is and is not in it, where to report problems' },
];
