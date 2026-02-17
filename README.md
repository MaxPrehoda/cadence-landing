# Cadence Landing Page

Brutalist-minimal landing page for [Cadence](https://github.com/yourusername/cadence) - Voice-First OS Layer for macOS.

## Design Philosophy

- **2027 aesthetic**: Data-dense, tight spacing, programmer-focused
- **Matches app**: Uses exact design tokens from Cadence (teal accent, obsidian dark, Space Grotesk)
- **No cruft**: Zero animations bloat, no trendy gradients, no emoji spam
- **Spec sheet layout**: Grid-based feature presentation, technical copy
- **Subtle motion**: Gentle dot grid background (matching DotGrid.svelte)

## Tech Stack

- Pure HTML/CSS/JS (zero build step)
- Space Grotesk + JetBrains Mono fonts
- Canvas dot grid background
- Auto-fetches latest GitHub releases

## Deploy

### Vercel
```bash
vercel --prod
```

### Netlify
```bash
netlify deploy --prod --dir .
```

### GitHub Pages
```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/cadence-landing.git
git push -u origin main
# Enable Pages in repo settings → Source: main branch
```

### Cloudflare Pages
Connect repo in dashboard. Zero config required.

## Customize

1. **GitHub links**: Search/replace `yourusername/cadence` in `index.html` and `download.js`
2. **Version**: Update v0.2.0 in header
3. **Author**: Update footer links

## Local Preview

```bash
python3 -m http.server 8000
# Visit http://localhost:8000
```

Or: `npx serve`, `php -S localhost:8000`, etc.
