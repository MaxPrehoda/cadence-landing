// Every change the site needs on the day Cadence for Windows ships.
// Applied only by scripts/windows-launch.mjs; nothing here is deployed.
//
//   needs:  claims (launch/windows/claims.json) that must be proven on Windows
//           before this text may be published. Unproven: the edit is left out
//           and the page keeps saying "Mac", which stays true.
//   unless: published only while these claims are NOT proven.
//   legal:  terms or privacy policy; needs --with-legal and a human read.
//   all:    the same text appears several times (meta, og, twitter) and every
//           copy changes.
//   {{x}}   a fact from facts.json.
//
// `find` must match the site exactly. `status` reports any that no longer do.

const CORE = ['download', 'hotkey', 'dictation', 'toolbar', 'inbox', 'talk', 'claude'];
const REQ = 'For Mac (macOS 13 or later, Apple Silicon) and Windows ({{minOS}}, {{arch}}).';

const GUIDES = [
    'guides/best-tools-parallel-coding-agents.html', 'guides/claude-code-and-codex-together.html',
    'guides/claude-code-notifications-mac.html', 'guides/claude-code-on-iphone.html',
    'guides/codex-notifications-mac.html', 'guides/coding-agents-on-a-server.html',
    'guides/herdr-mac-app.html', 'guides/offline-dictation-mac.html',
    'guides/run-multiple-claude-code-agents.html', 'guides/voice-control-claude-code.html',
];
const COMPARE = ['compare/claude-squad.html', 'compare/conductor.html', 'compare/one.html', 'compare/index.html'];

// ---- pages replaced or added whole ---------------------------------------
export const pages = [
    { from: 'windows.html', to: 'windows.html', needs: CORE },
    { from: 'docs/windows.md', to: 'docs/windows.md', needs: CORE },
];

// ---- patterns that repeat across many pages ------------------------------
export const rules = [
    {
        name: 'Guides and comparisons: the "Try Cadence" requirements line',
        files: [...GUIDES, ...COMPARE], needs: CORE, atLeast: 12,
        pattern: /Free, no account\. macOS 13 or later on Apple Silicon\./g,
        replace: `Free, no account. ${REQ}`,
    },
    {
        name: 'Guides and comparisons: the Homebrew line is for Macs only',
        files: [...GUIDES, ...COMPARE], needs: CORE, atLeast: 10,
        pattern: /<code>brew install --cask maxprehoda\/tap\/cadence<\/code>/g,
        replace: '<code data-os-only="mac">brew install --cask maxprehoda/tap/cadence</code>',
    },
    {
        name: 'Guides and comparisons: winget line for Windows visitors',
        files: [...GUIDES, ...COMPARE], needs: [...CORE, 'winget'], atLeast: 10,
        pattern: /<code(?: data-os-only="mac")?>brew install --cask maxprehoda\/tap\/cadence<\/code>/g,
        replace: '<code data-os-only="mac">brew install --cask maxprehoda/tap/cadence</code><code data-os-only="windows" hidden>winget install {{wingetId}}</code>',
    },
    {
        name: 'Guides: "Cadence is a free Mac app" becomes "for Mac and Windows"',
        files: GUIDES, needs: CORE, atLeast: 9,
        // Only sentences about Cadence: each starts with the link to the home
        // page, "Our app." or the comparison-table cell.
        pattern: /(<a href="\/">Cadence<\/a>(?: is|,) a free|Our app\. A free|<td>Free) (?:macOS|Mac) app\b/g,
        replace: (_, lead) => `${lead} app for Mac and Windows`,
    },
    {
        name: 'Comparisons: "a native Mac app" becomes "for Mac and Windows"',
        files: COMPARE, needs: CORE, atLeast: 7,
        pattern: /\b(a|A) (free native|native) Mac app\b/g,
        replace: (_, a, kind) => `${a} ${kind} app for Mac and Windows`,
    },
    {
        name: 'Comparisons: Cadence\'s platform cell',
        files: ['compare/claude-squad.html'], needs: CORE, atLeast: 1,
        pattern: /<td>macOS 13 or later, Apple Silicon only<\/td>/g,
        replace: '<td>macOS 13 or later on Apple Silicon, and {{minOS}} on {{arch}}</td>',
    },
];

// ---- exact edits ----------------------------------------------------------
export const edits = [
    // Switches: the Download button starts serving the installer.
    { file: 'platform.js', needs: CORE, find: 'const WINDOWS_LIVE = false;', replace: 'const WINDOWS_LIVE = true;' },
    { file: 'api/download.js', needs: CORE, find: 'const WINDOWS_LIVE = false;', replace: 'const WINDOWS_LIVE = true;' },

    // ---------------- Home page ----------------
    { file: 'index.html', needs: CORE, all: true,
      find: 'Cadence is a free Mac app that puts every coding agent&#x27;s questions and finished work in one Inbox.',
      replace: 'Cadence is a free app for Mac and Windows that puts every coding agent&#x27;s questions and finished work in one Inbox.' },
    { file: 'index.html', needs: CORE,
      find: 'multi-agent macOS, voice dictation Mac,',
      replace: 'multi-agent macOS, multi-agent Windows, voice dictation Mac, dictation Windows,' },
    { file: 'index.html', needs: CORE,
      find: '"operatingSystem": "macOS 13.0+",\n        "processorRequirements": "Apple Silicon",',
      replace: '"operatingSystem": "macOS 13.0+, {{minOS}}",\n        "processorRequirements": "Apple Silicon (Mac), {{arch}} (Windows)",' },
    { file: 'index.html', needs: CORE,
      find: '"description": "A macOS control layer for AI coding agents. Every agent question',
      replace: '"description": "A control layer for AI coding agents, for Mac and Windows. Every agent question' },
    { file: 'index.html', needs: CORE,
      find: '"On-device dictation in any app (hold Option)"',
      replace: '"On-device dictation in any app (hold Option on a Mac, {{hotkey}} on Windows)"' },
    { file: 'index.html', needs: CORE,
      find: '"description": "Cadence Labs builds Cadence, a macOS control layer for AI coding agents."',
      replace: '"description": "Cadence Labs builds Cadence, a control layer for AI coding agents on Mac and Windows."' },
    // Hero and setup: each visitor sees their own system, with a way across.
    { file: 'index.html', needs: CORE,
      find: '<div class="fine">Free · <a href="/pricing">Pro from $20/mo</a> · No account · macOS 13+ on Apple Silicon</div>',
      replace: '<div class="fine">Free · <a href="/pricing">Pro from $20/mo</a> · No account · <span data-os-only="mac">macOS 13+ on Apple Silicon · <a href="/windows">also for Windows</a></span><span data-os-only="windows" hidden>{{minOS}} · <a href="/download/mac">also for Mac</a></span></div>' },
    { file: 'index.html', needs: CORE,
      find: '<span>Free · <a href="/pricing">Pro from $20/mo</a> · No account · macOS 13+ on Apple Silicon</span>',
      replace: '<span>Free · <a href="/pricing">Pro from $20/mo</a> · No account · <span data-os-only="mac">macOS 13+ on Apple Silicon · <a href="/windows">also for Windows</a></span><span data-os-only="windows" hidden>{{minOS}} · <a href="/download/mac">also for Mac</a></span></span>' },
    { file: 'index.html', needs: CORE,
      find: '<p>Drag Cadence to Applications and open it. Allow the microphone, accessibility and input monitoring when macOS asks.</p>',
      replace: '<p data-os-only="mac">Drag Cadence to Applications and open it. Allow the microphone, accessibility and input monitoring when macOS asks.</p>\n                    <p data-os-only="windows" hidden>Run the installer and open Cadence. Windows has no permissions to grant; just make sure desktop apps may use your microphone.</p>' },
    // The Cadence key, named for the visitor's keyboard (platform.js reads data-win).
    { file: 'index.html', needs: CORE,
      find: '<p>Press <kbd class="k">1</kbd> in the Inbox, or double-tap <kbd class="k">⌥</kbd> and say what you need.',
      replace: '<p>Press <kbd class="k">1</kbd> in the Inbox, or double-tap <kbd class="k" data-win="{{hotkey}}">⌥</kbd> and say what you need.' },
    { file: 'index.html', needs: CORE,
      find: '<p class="lead reveal">Hold <kbd class="k">⌥</kbd> and talk: the words are typed into whatever app you\'re in. Double-tap <kbd class="k">⌥</kbd> and say what you want built:',
      replace: '<p class="lead reveal">Hold <kbd class="k" data-win="{{hotkey}}">⌥</kbd> and talk: the words are typed into whatever app you\'re in. Double-tap <kbd class="k" data-win="{{hotkey}}">⌥</kbd> and say what you want built:' },
    { file: 'index.html', needs: CORE,
      find: '<h3 class="two">Double-tap ⌥ and say the task.<br>',
      replace: '<h3 class="two"><span data-win="Double-tap {{hotkey}} and say the task." style="color:inherit">Double-tap ⌥ and say the task.</span><br>' },
    { file: 'index.html', needs: CORE,
      find: '<h3 class="two">Hold ⌥ and talk<br><span>in any app</span></h3>',
      replace: '<h3 class="two"><span data-win="Hold {{hotkey}} and talk" style="color:inherit">Hold ⌥ and talk</span><br><span>in any app</span></h3>' },
    { file: 'index.html', needs: CORE,
      find: 'Speech recognition runs on your Mac, so your audio never leaves it.</p>',
      replace: 'Speech recognition runs on your own computer, so your audio never leaves it.</p>' },
    { file: 'index.html', needs: CORE,
      find: '<div><small>On your Mac</small><h4>Voice and dictation</h4>',
      replace: '<div><small>On your computer</small><h4>Voice and dictation</h4>' },
    { file: 'index.html', needs: [...CORE, 'polish'],
      find: '<p>Speech recognition and Text Polish run on your Mac, and audio is never uploaded.',
      replace: '<p>Speech recognition and Text Polish run on your own computer, and audio is never uploaded.' },
    { file: 'index.html', needs: [...CORE, 'herdr', 'servers'],
      find: 'that Cadence watches the same way, on your Mac or on your Linux servers.</p>',
      replace: 'that Cadence watches the same way, on your computer or on your Linux servers.</p>' },
    { file: 'index.html', needs: [...CORE, 'iphone'],
      find: 'it pairs with your Mac over a QR code, traffic between them is end-to-end encrypted, and you answer your agents from Home, a widget or Siri.',
      replace: 'it pairs with your Mac or PC over a QR code, traffic between them is end-to-end encrypted, and you answer your agents from Home, a widget or Siri.' },
    { file: 'index.html', needs: CORE,
      find: '<p>A Mac with Apple Silicon (M1 or newer) on macOS 13 or later. For agents,',
      replace: '<p>A Mac with Apple Silicon (M1 or newer) on macOS 13 or later, or a PC with {{minOS}} ({{arch}}). For agents,' },
    { file: 'index.html', needs: CORE,
      find: '<p>On Windows? We\'re building it, and it isn\'t ready yet. <a href="/windows">Join the Windows waitlist</a>.</p>',
      replace: '' },
    { file: 'index.html', needs: CORE,
      find: '                <div><b>Permissions:</b> Microphone, Accessibility and Input Monitoring.</div>',
      replace: '                <div><b>{{minOS}}</b> on {{arch}}. <a href="/windows">Cadence for Windows</a> has the install steps.</div>\n                <div><b>Permissions on a Mac:</b> Microphone, Accessibility and Input Monitoring. Windows has none to grant.</div>' },
    { file: 'index.html', needs: CORE,
      find: '<span id="arm64-date">-</span></div>',
      replace: '<span id="arm64-date">-</span></div>\n            <div class="meta" data-os-only="mac">On a PC? <a href="/download/windows">Download for Windows</a></div>\n            <div class="meta" data-os-only="windows" hidden>On a Mac? <a href="/download/mac">Download for Mac</a></div>' },

    // ---------------- Pricing ----------------
    { file: 'pricing.html', needs: CORE,
      find: '<li><strong>Dictation</strong> in any app, running on your Mac</li>',
      replace: '<li><strong>Dictation</strong> in any app, running on your own computer</li>' },
    { file: 'pricing.html', needs: CORE,
      find: '<p class="fine">macOS 13 or later on Apple Silicon. No account.</p>',
      replace: '<p class="fine">Mac (macOS 13 or later, Apple Silicon) or Windows ({{minOS}}, {{arch}}). No account.</p>' },
    { file: 'pricing.html', needs: [...CORE, 'pro'],
      find: 'What it learned stays on your Mac, so Pro picks up where it left off.',
      replace: 'What it learned stays on your computer, so Pro picks up where it left off.' },
    // If the Windows build launches before Pro is proven there, say so where people pay.
    { file: 'pricing.html', needs: CORE, unless: ['pro'],
      find: '<p class="fine">Checkout by Stripe. You get a license key; Cadence turns Pro on by itself if you bought from the app.</p>',
      replace: '<p class="fine">Checkout by Stripe. You get a license key; Cadence turns Pro on by itself if you bought from the app.</p>\n                <p class="fine"><strong>Pro runs on the Mac today.</strong> It isn\'t ready on Windows yet, where everything Cadence does is free.</p>' },

    // ---------------- FAQ ----------------
    { file: 'faq.html', needs: CORE, all: true,
      find: 'Answers about Cadence for Mac: which coding agents',
      replace: 'Answers about Cadence for Mac and Windows: which coding agents' },
    { file: 'faq.html', needs: CORE,
      find: '"text": "Cadence is a native macOS control layer for AI coding agents. It sits',
      replace: '"text": "Cadence is a control layer for AI coding agents, a native app for Mac and Windows. It sits' },
    { file: 'faq.html', needs: CORE,
      find: '"text": "macOS 13 (Ventura) or later on Apple Silicon. There is no Intel build. Agent features',
      replace: '"text": "A Mac with Apple Silicon on macOS 13 (Ventura) or later (there is no Intel Mac build), or a PC with {{minOS}} on {{arch}}. Agent features' },
    { file: 'faq.html', needs: CORE,
      find: 'Cadence is a <strong>native macOS control layer for AI coding agents</strong>. It sits between you',
      replace: 'Cadence is a <strong>control layer for AI coding agents</strong>, a native app for Mac and Windows. It sits between you' },
    { file: 'faq.html', needs: CORE,
      find: '<summary>What Mac do I need?</summary>',
      replace: '<summary>What computer do I need?</summary>' },
    { file: 'faq.html', needs: CORE,
      find: '<strong>macOS 13 (Ventura) or later on Apple Silicon</strong> (M1 or newer). There is no Intel build.\n            </p>',
      replace: '<strong>macOS 13 (Ventura) or later on Apple Silicon</strong> (M1 or newer). There is no Intel Mac build.\n            </p>\n            <p>\n                Or a PC with <strong>{{minOS}}</strong> on an Intel or AMD ({{arch}}) processor. See <a href="/windows">Cadence for Windows</a>.\n            </p>' },
    { file: 'faq.html', needs: CORE,
      find: `            <p>
                <strong>Windows: yes, we're building it.</strong> It isn't ready and there is nothing to download yet,
                so today Cadence runs on the Mac only. <a href="/windows">Join the Windows waitlist</a> and you'll get
                one email, the day you can download it.
            </p>`,
      replace: `            <p>
                <strong>Windows: yes.</strong> Cadence runs on {{minOS}}. <a href="/windows">Cadence for Windows</a>
                has the download, the install steps and what is different from the Mac.
            </p>` },
    { file: 'faq.html', needs: CORE,
      find: `                Download the latest <code>.dmg</code> from the
                <a href="https://github.com/MaxPrehoda/cadence-landing/releases/latest" target="_blank" rel="noopener">releases page</a>,
                drag Cadence to Applications, and open it. Cadence checks for updates on its own.
            </p>`,
      replace: `                <strong>Mac:</strong> download the latest <code>.dmg</code> from the
                <a href="https://github.com/MaxPrehoda/cadence-landing/releases/latest" target="_blank" rel="noopener">releases page</a>,
                drag Cadence to Applications, and open it. Cadence checks for updates on its own.
            </p>
            <p>
                <strong>Windows:</strong> download <code>{{installer}}</code> from <a href="/windows">Cadence for Windows</a>
                and run it. It installs for your user only, with no administrator prompt.
<!--IFNOT:signed-->
                The installer isn't code-signed yet, so Windows shows "Windows protected your PC": click
                <strong>More info</strong>, then <strong>Run anyway</strong>.
<!--/IFNOT:signed-->
            </p>` },
    { file: 'faq.html', needs: CORE,
      find: 'On your Mac, in <code>~/Library/Application Support/com.cadence.app</code>:',
      replace: 'On your computer. On a Mac, in <code>~/Library/Application Support/com.cadence.app</code>; on Windows, in <code>{{dataDir}}</code>:' },
    { file: 'faq.html', needs: CORE,
      find: 'Hold <code>⌥</code> and speak; release and the text is typed into whatever app you\'re in.',
      replace: 'Hold <code>⌥</code> (<code>{{hotkey}}</code> on Windows) and speak; release and the text is typed into whatever app you\'re in.' },
    { file: 'faq.html', needs: CORE,
      find: 'Double-tap <code>⌥</code>, then say or type what you want.',
      replace: 'Double-tap <code>⌥</code> (<code>{{hotkey}}</code> on Windows), then say or type what you want.' },

    // ---------------- Docs (the .md files; the script rebuilds the .html) ----------------
    { file: 'docs/introduction.md', needs: CORE,
      find: 'Cadence is a native macOS app that sits between you and your coding agents,',
      replace: 'Cadence is a native app for Mac and Windows that sits between you and your coding agents,' },
    { file: 'docs/installation.md', needs: CORE,
      find: '# Installation\n\n## Requirements\n',
      replace: '# Installation\n\nThis page is for the Mac. On a PC, see [Cadence on Windows](#/windows).\n\n## Requirements\n' },
    { file: 'docs/hotkeys.md', needs: CORE,
      find: 'Cadence uses one key for two jobs. The default is `⌥` (Option).',
      replace: 'Cadence uses one key for two jobs. The default is `⌥` (Option) on a Mac and `{{hotkey}}` on Windows, where shortcuts written here with `⌘` use `Ctrl`. See [Cadence on Windows](#/windows).' },
    { file: 'docs/troubleshooting.md', needs: CORE,
      find: '# Troubleshooting\n',
      replace: '# Troubleshooting\n\nMost of this page is about macOS permissions, which Windows doesn\'t have. For Windows install questions, see [Cadence on Windows](#/windows).\n' },
    { file: 'docs/privacy.md', needs: CORE,
      find: 'This page lists what Cadence keeps on your Mac and what it sends elsewhere.',
      replace: 'This page lists what Cadence keeps on your computer and what it sends elsewhere. It says "your Mac" throughout; the same holds for a Windows PC, where the files live in `{{dataDir}}`.' },
    { file: 'docs/index.json', needs: CORE,
      find: `          "seoTitle": "Install Cadence on your Mac \\u00b7 Cadence Docs",
          "description": "Install Cadence on a Mac with Apple Silicon: requirements, the DMG or Homebrew cask, first launch, permissions, and signing in to Claude Code."
        },`,
      replace: `          "seoTitle": "Install Cadence on your Mac \\u00b7 Cadence Docs",
          "description": "Install Cadence on a Mac with Apple Silicon: requirements, the DMG or Homebrew cask, first launch, permissions, and signing in to Claude Code."
        },
        {
          "id": "windows",
          "title": "Cadence on Windows",
          "seoTitle": "Install Cadence on Windows \\u00b7 Cadence Docs",
          "description": "Cadence on {{minOS}}: requirements, the installer, first launch, key names, where files live, and what differs from the Mac."
        },` },
    { file: 'scripts/build-docs.mjs', needs: CORE,
      find: "operatingSystem: 'macOS 13+', applicationCategory",
      replace: "operatingSystem: 'macOS 13+, {{minOS}}', applicationCategory" },
    { file: 'scripts/release-notes.mjs', needs: CORE,
      find: 'the Mac app that puts Claude Code, Codex and your other coding agents in one Inbox.',
      replace: 'the app for Mac and Windows that puts Claude Code, Codex and your other coding agents in one Inbox.' },
    { file: 'scripts/release-notes.mjs', needs: CORE,
      find: "operatingSystem: 'macOS 13+', applicationCategory",
      replace: "operatingSystem: 'macOS 13+, {{minOS}}', applicationCategory" },
    { file: 'scripts/release-notes.mjs', needs: CORE,
      find: 'Free for Apple Silicon Macs on macOS 13 or later. The download is always the newest version.',
      replace: 'Free for Apple Silicon Macs on macOS 13 or later and for {{minOS}} PCs. The download is always the newest version.' },

    // ---------------- Guides and comparisons: one-off sentences ----------------
    { file: 'guides/best-tools-parallel-coding-agents.html', needs: CORE,
      find: '<td>macOS 13+ (Apple Silicon only)</td><td>Free, no account</td>',
      replace: '<td>macOS 13+ (Apple Silicon only), {{minOS}}</td><td>Free, no account</td>' },
    { file: 'guides/best-tools-parallel-coding-agents.html', needs: CORE,
      find: 'It runs on Apple Silicon only and does not create worktrees for terminal agents.</p>',
      replace: 'On a Mac it needs Apple Silicon; it also runs on {{minOS}}. It does not create worktrees for terminal agents.</p>' },
    { file: 'guides/best-tools-parallel-coding-agents.html', needs: CORE,
      find: '<strong>Intel Mac, Windows or Linux?</strong> Cadence is Apple Silicon only, and Vibe Island says it is built for Apple Silicon.',
      replace: '<strong>Intel Mac, Windows or Linux?</strong> Cadence runs on Apple Silicon Macs and on {{minOS}}, with no Intel Mac or Linux build, and Vibe Island says it is built for Apple Silicon.' },
    { file: 'guides/herdr-mac-app.html', needs: [...CORE, 'herdr'],
      find: '<td>macOS 13 or later, Apple Silicon</td><td>Free, closed source</td>',
      replace: '<td>macOS 13 or later, Apple Silicon; also {{minOS}}</td><td>Free, closed source</td>' },
    { file: 'guides/voice-control-claude-code.html', needs: CORE,
      find: '<td>Apple Silicon, macOS 13 or later</td>',
      replace: '<td>Apple Silicon and macOS 13 or later, or {{minOS}}</td>' },
    { file: 'guides/claude-code-on-iphone.html', needs: [...CORE, 'iphone'],
      find: 'it needs Cadence on an Apple Silicon Mac with macOS 13 or later, and the Mac has to be awake, because the agents run there.',
      replace: 'it needs Cadence on an Apple Silicon Mac with macOS 13 or later or on a {{minOS}} PC, and that computer has to be awake, because the agents run there.' },
    { file: 'compare/claude-squad.html', needs: CORE,
      find: 'Cadence runs on macOS 13 or later with Apple Silicon only.</p>',
      replace: 'Cadence runs on macOS 13 or later with Apple Silicon, and on {{minOS}}.</p>' },
    { file: 'compare/one.html', needs: CORE, all: true,
      find: 'It runs on Apple Silicon Macs only.',
      replace: 'It runs on Apple Silicon Macs and on {{minOS}} PCs.' },
    { file: 'compare/one.html', needs: CORE, all: true,
      find: 'Cadence needs Apple Silicon and has no Intel build.',
      replace: 'On a Mac, Cadence needs Apple Silicon and has no Intel build.' },
    { file: 'compare/one.html', needs: CORE,
      find: 'It runs on Intel Macs; Cadence is Apple Silicon only.',
      replace: 'It runs on Intel Macs; Cadence\'s Mac build is Apple Silicon only.' },
    { file: 'compare/one.html', needs: CORE,
      find: '<th scope="row">Mac</th><td>macOS 13 or later, Apple Silicon only</td>',
      replace: '<th scope="row">Mac and Windows</th><td>macOS 13 or later on Apple Silicon, and {{minOS}} on {{arch}}</td>' },
    { file: 'compare/conductor.html', needs: CORE,
      find: '<th scope="row">Mac</th><td>macOS 13 or later, Apple Silicon only</td>',
      replace: '<th scope="row">Mac and Windows</th><td>macOS 13 or later on Apple Silicon, and {{minOS}} on {{arch}}</td>' },

    // ---------------- llms.txt, sitemap, README ----------------
    { file: 'llms.txt', needs: CORE,
      find: '> Cadence is a macOS control layer for AI coding agents: every agent, one inbox, plus on-device dictation.',
      replace: '> Cadence is a control layer for AI coding agents, for Mac and Windows: every agent, one inbox, plus on-device dictation.' },
    { file: 'llms.txt', needs: CORE,
      find: '- macOS 13 (Ventura) or later, Apple Silicon only (no Intel build)',
      replace: '- Mac: macOS 13 (Ventura) or later, Apple Silicon only (no Intel build)\n- Windows: {{minOS}} on {{arch}}; installer and what differs from the Mac at https://www.cadencevoice.ai/windows' },
    { file: 'llms.txt', needs: CORE,
      find: '- Windows: a Windows version is being built and is not available yet; there is no Windows download and no release date. Waitlist: https://www.cadencevoice.ai/windows\n',
      replace: '' },
    { file: 'llms.txt', needs: CORE,
      find: '- Signed and notarized by Apple from v0.5.0, so it opens normally on first launch',
      replace: '- The Mac app is signed and notarized by Apple from v0.5.0, so it opens normally on first launch' },
    { file: 'llms.txt', needs: CORE,
      find: '- Dictation anywhere: hold Option to type into any app,',
      replace: '- Dictation anywhere: hold Option (Mac) or {{hotkey}} (Windows) to type into any app,' },
    { file: 'llms.txt', needs: CORE,
      find: '- Talk: double-tap Option, say or type a request,',
      replace: '- Talk: double-tap Option (Mac) or {{hotkey}} (Windows), say or type a request,' },
    { file: 'llms.txt', needs: CORE,
      find: '- [Cadence for Windows](https://www.cadencevoice.ai/windows): not released yet; what is being built and the waitlist',
      replace: '- [Cadence for Windows](https://www.cadencevoice.ai/windows): download, install steps, what works on Windows and what differs from the Mac' },
    { file: 'llms.txt', needs: CORE,
      find: '- A macOS control layer for AI coding agents: every agent, one inbox, plus on-device dictation',
      replace: '- A control layer for AI coding agents, for Mac and Windows: every agent, one inbox, plus on-device dictation' },
    { file: 'llms.txt', needs: CORE,
      find: 'https://www.cadencevoice.ai/pricing; macOS 13+ on Apple Silicon',
      replace: 'https://www.cadencevoice.ai/pricing; macOS 13+ on Apple Silicon, or {{minOS}} on {{arch}}' },
    { file: 'sitemap.xml', needs: CORE,
      find: `        <loc>https://www.cadencevoice.ai/docs/installation</loc>
        <lastmod>2026-10-14</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
`,
      replace: `        <loc>https://www.cadencevoice.ai/docs/installation</loc>
        <lastmod>2026-10-14</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://www.cadencevoice.ai/docs/windows</loc>
        <lastmod>2026-10-14</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
` },
    { file: 'sitemap.xml', needs: CORE,
      find: '        <loc>https://www.cadencevoice.ai/windows</loc>\n        <lastmod>2026-11-17</lastmod>\n        <changefreq>monthly</changefreq>\n        <priority>0.7</priority>',
      replace: '        <loc>https://www.cadencevoice.ai/windows</loc>\n        <lastmod>2026-11-17</lastmod>\n        <changefreq>weekly</changefreq>\n        <priority>0.9</priority>' },
    { file: 'README.md', needs: CORE,
      find: 'Marketing site, docs and blog for **Cadence**, the macOS app that keeps every coding agent moving from one inbox.',
      replace: 'Marketing site, docs and blog for **Cadence**, the app for Mac and Windows that keeps every coding agent moving from one inbox.' },
    { file: 'art/og-card.html', needs: CORE,
      find: '<div class="url">cadencevoice.ai · Free for Mac</div>',
      replace: '<div class="url">cadencevoice.ai · Free for Mac and Windows</div>' },

    // ---------------- Legal pages (only with --with-legal) ----------------
    { file: 'terms.html', needs: CORE, legal: true, all: true,
      find: 'Cadence terms of service: a free Mac app, provided as-is',
      replace: 'Cadence terms of service: a free app for Mac and Windows, provided as-is' },
    { file: 'terms.html', needs: CORE, legal: true, all: true,
      find: 'The terms for using Cadence, a free Mac app for running coding agents from one Inbox,',
      replace: 'The terms for using Cadence, a free app for Mac and Windows for running coding agents from one Inbox,' },
    { file: 'terms.html', needs: CORE, legal: true,
      find: 'govern your use of Cadence, a macOS control layer for AI coding agents',
      replace: 'govern your use of Cadence, a control layer for AI coding agents on macOS and Windows,' },
    { file: 'terms.html', needs: CORE, legal: true,
      find: '<li>Apple Silicon (M1 or newer); there is no Intel build</li>',
      replace: '<li>Apple Silicon (M1 or newer); there is no Intel build</li>\n                <li>Or <strong>{{minOS}}</strong> on an {{arch}} processor</li>' },
];
