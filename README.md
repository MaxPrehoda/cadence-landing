# cadencevoice.ai

Marketing site, docs and blog for **Cadence**, the macOS app that keeps every coding agent moving from one inbox. The app itself lives in [`voice-flow`](https://github.com/MaxPrehoda/voice-flow).

Plain HTML, CSS and JS with no build step, deployed on Vercel.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Homepage (inline styles and scripts, including the interactive Inbox demo and the iPhone waitlist form) |
| `site.css` | Shared design tokens, header, footer and prose styles for every other page |
| `docs.html` + `docs/*.md` | Docs browser; pages are listed in `docs/index.json` |
| `faq.html`, `privacy.html`, `terms.html` | Secondary pages |
| `blog/` | Writing (Cadence Labs); `blog/blog.css` sits on top of `site.css` |
| `art/` | Pixel art and the social card (see below) |
| `media/` | Recorded clips of the app UI used on the homepage |
| `api/waitlist.js` | Vercel serverless function for the iPhone waitlist |
| `download-v2.js` | Fills the download card from the latest GitHub release of this repo |
| `llms.txt`, `robots.txt`, `sitemap.xml` | Crawler and AI-search metadata |

## Art

The pixel art is generated, not drawn: `python3 art/generate.py` (needs Pillow and NumPy) rewrites `art/hero.png`, `art/harbour.png` and `art/lighthouse.png`. Output is deterministic.

The homepage hero is animated: `generate.py` also writes the layers in `art/hero/` (sky, drifting wisps, cloud bank, scene, tree, four foreground sway frames, edge dissolve) plus `meta.json`, and `hero-anim.js` composites them in a 480x270 canvas at 12 fps (toolbar dots on the monitor, typing, steam, birds, a butterfly). It pauses off screen and shows one still frame with reduced motion; `art/hero.png` is the static fallback.

`art/agents/` holds the agent logos for the "Works with" strip, the setup steps and the harbour band. Claude, Codex (OpenAI), Gemini, Cursor and Copilot are tiles built from [Simple Icons](https://simpleicons.org) (CC0); Amp, OpenCode, Grok, Pi and Omp are each project's own site icon. `art/founder.png` is Max's GitHub avatar at its native 23x23 grid (scale it by whole numbers with `image-rendering: pixelated`).

The social card `art/og.png` (1200x630) is a screenshot of `art/og-card.html`. Serve the repo locally, open that page at 1200x630 and screenshot it after editing.

## iPhone waitlist

The form on the homepage posts to `/api/waitlist`, which stores emails in Upstash Redis.

To turn it on: in the Vercel project, open **Storage**, create an **Upstash for Redis** database (free tier is fine) and connect it to this project. That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` pair) to the environment; redeploy. Until then the endpoint returns 503 and the form offers an email link instead, so no sign-up is lost.

To read the list, run `SMEMBERS waitlist:iphone` in the Upstash console. Sign-up times are in the hash `waitlist:iphone:joined`.

## Releases

`create-release.sh` in `voice-flow` publishes DMGs as GitHub releases on **this** repo, and the in-app updater and `download-v2.js` both read the latest one.

## Local preview

```bash
python3 -m http.server 8000
```

Blog links are extensionless (`/blog/slug`), which works on Vercel (`cleanUrls`) but not on this simple server; open the `.html` files directly when previewing locally.
