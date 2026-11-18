# cadencevoice.ai

Marketing site, docs and blog for **Cadence**, the macOS app that keeps every coding agent moving from one inbox. The app itself lives in [`voice-flow`](https://github.com/MaxPrehoda/voice-flow).

Plain HTML, CSS and JS with no build step, deployed on Vercel.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Homepage (inline styles and scripts, including the interactive Inbox demo and the iPhone waitlist form) |
| `site.css` | Shared design tokens, header, footer and prose styles for every other page |
| `docs.html` + `docs/*.md` | Docs browser; pages are listed in `docs/index.json`. Each page has its own URL, `/docs/<id>` (a rewrite in `vercel.json`); a local preview uses `docs.html#/<id>` |
| `changelog.html` | What changed in each release |
| `faq.html`, `privacy.html`, `terms.html` | Secondary pages |
| `blog/` | Writing (Cadence Labs); `blog/blog.css` sits on top of `site.css` |
| `art/` | Pixel art and the social card (see below) |
| `media/` | Recorded clips of the app UI used on the homepage |
| `api/waitlist.js` | Vercel serverless function for the iPhone and Windows waitlists |
| `api/download.js` | `/download`, `/download/mac`, `/download/windows`: redirects to the newest installer |
| `download-v2.js` | Fills the download card from the latest GitHub release of this repo |
| `platform.js` | Points a Windows visitor's Download buttons at the right place |
| `windows.html` | Cadence for Windows: what's coming and the waitlist |
| `launch/windows/` | Unpublished Windows launch copy and its script (see below) |
| `launch/windows-preview/` | Unpublished "untested Windows preview" state and its script (see below) |
| `llms.txt`, `robots.txt`, `sitemap.xml` | Crawler and AI-search metadata |

## Art

The pixel art is generated, not drawn: `python3 art/generate.py` (needs Pillow and NumPy) rewrites `art/hero.png`, `art/harbour.png` and `art/lighthouse.png`. Output is deterministic.

The homepage hero is animated: `generate.py` also writes the layers in `art/hero/` (sky, drifting wisps, cloud bank, scene, eight wind frames of the trees and bushes with sun flecks moving through their shade (`tree0`–`tree7`), two sets of sun rays to crossfade, four foreground sway frames, a cloud shadow, edge dissolve) plus `meta.json`, and `hero-anim.js` composites them in a 480x270 canvas at 12 fps (toolbar dots on the monitor, typing, steam, swaying trees that speed up in gusts, falling leaves, breathing sun rays, cloud shadows drifting across the field, birds, a butterfly). Leaf clumps move by whole pixels and take their ragged edges from position-based noise (`hash_seed`), so they keep their shapes from frame to frame. It pauses off screen and shows one still frame with reduced motion; `art/hero.png` is the static fallback. The status chips over the hero play the same story as the monitor's toolbar dots (`PHASES` in `hero-anim.js`: questions get answered, work finishes, new work starts) and sit right on top of the monitor, placed from `monitor` in `meta.json`; hovering a chip rings its dot on the monitor.

`art/agents/` holds the agent logos for the "Works with" strip, the setup steps and the harbour band. Claude, Codex (OpenAI), Gemini, Cursor and Copilot are tiles built from [Simple Icons](https://simpleicons.org) (CC0); Amp, OpenCode, Grok, Pi and Omp are each project's own site icon. `art/founder.png` is Max's GitHub avatar at its native 23x23 grid (scale it by whole numbers with `image-rendering: pixelated`).

The social card `art/og.png` (1200x630) is a screenshot of `art/og-card.html`. Serve the repo locally, open that page at 1200x630 and screenshot it after editing.

## Waitlists

The iPhone form on the homepage and the Windows form on `/windows` post to `/api/waitlist` (with `list` set to `iphone` or `windows`), which stores emails in Upstash Redis.

To turn it on: in the Vercel project, open **Storage**, create an **Upstash for Redis** database (free tier is fine) and connect it to this project. That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` pair) to the environment; redeploy. Until then the endpoint returns 503 and the form offers an email link instead, so no sign-up is lost.

To read a list, run `SMEMBERS waitlist:iphone` or `SMEMBERS waitlist:windows` in the Upstash console. Sign-up times are in the hashes `waitlist:iphone:joined` and `waitlist:windows:joined`.

## Windows

Cadence for Windows isn't released. Until it is, `/windows` says so and takes waitlist sign-ups, and a Windows browser that asks for `/download` is sent there (a User-Agent redirect in `vercel.json`, then `api/download.js`); `platform.js` relabels the Download buttons for Windows visitors.

A middle state, an untested preview download, is in `launch/windows-preview/`: `node scripts/windows-preview.mjs apply --tag <tag>` turns it on and `undo` turns it off. Its README has the order of steps.

The launch copy is written but unpublished, in `launch/windows/`. `node scripts/windows-launch.mjs status` shows what is ready; it only publishes what the Windows team's parity matrix marks as run on Windows. Read `launch/windows/README.md` before touching it, and run `status` after changing any page's copy so the kit stays in step.

## Cadence Pro billing

`api/checkout.js`, `api/stripe-webhook.js`, `api/license.js`, `api/portal.js` and `api/resend-key.js`, with the shared logic in `api/_billing.js` and email in `api/_email.js`. `npm run test:billing` runs the whole purchase flow against in-memory Stripe, Upstash and email (no network).

Optional settings, all off until set in the Vercel project's environment:

| Variable | What it turns on |
|---|---|
| `RESEND_API_KEY`, or `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` (`MAILGUN_REGION=eu` for the EU host) | The purchase email with the license key, and "I lost my license key" on `/pricing` |
| `CADENCE_EMAIL_FROM` | The From address (default `Cadence <support@cadencevoice.ai>`); its domain must be verified with the provider |
| `CADENCE_TESTFLIGHT_URL` | The iPhone app step on the welcome page, in the email and in the app |
| `CADENCE_MAX_DEVICES` | How many Macs one key works on at once (unset: no limit) |
| `CADENCE_STRIPE_TAX=1` | Stripe Tax on Checkout (set Stripe Tax up in the Dashboard first) |
| `CADENCE_STRIPE_API_VERSION` | Stripe API version for creating Checkouts; `2026-10-28.endive` or later prints the key on a subscription's first invoice |

The Stripe webhook endpoint must be sent: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.

## Releases

`create-release.sh` in `voice-flow` publishes DMGs as GitHub releases on **this** repo, and the in-app updater and `download-v2.js` both read the latest one.

Release notes on the site are automatic. Publishing (or editing) a release runs `.github/workflows/release-notes.yml`, which runs `scripts/release-notes.mjs` and pushes the result to `main`: a post at `/blog/releases/cadence-X-Y-Z` in `blog/releases/`, an entry at the top of `changelog.html`, the three latest releases on the Writing index, and sitemap entries. The workflow then waits until the post is live and fails (GitHub emails you) if it isn't. Never edit the generated files or the regions between `<!--RELEASES-->` markers; edit the release on GitHub and the workflow redoes them. Write each release body in this shape:

```markdown
## Cadence v0.5.5
Optional one-line lede, used as the post's subtitle.

### New
- **Bold lead.** What it does for the user.

### Changed
- …

### Fixed
- …
```

Only New, Changed and Fixed reach the site (What's New, Improved and Bug Fixes count too); Installation, Upgrading and Requirements stay on GitHub. Without a lede, the first item's bold lead is the subtitle. Releases up to v0.5.1 are hand-written in `changelog.html` below the marker and have no post.

Add a new doc page to `sitemap.xml` as well as `docs/index.json`.

## Local preview

```bash
python3 -m http.server 8000
```

Blog links are extensionless (`/blog/slug`), which works on Vercel (`cleanUrls`) but not on this simple server; open the `.html` files directly when previewing locally.
