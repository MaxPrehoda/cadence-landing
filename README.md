# Cadence Landing Page

Landing page for [Cadence](https://github.com/yourusername/cadence) - Voice-First OS Layer for macOS.

## Features

- 🔥 Matches Cadence's design language (fire particles, gradient text, dark theme)
- 📱 Fully responsive
- ⚡ Zero build step - pure HTML/CSS/JS
- 🚀 Auto-fetches latest GitHub releases
- 🎨 Tailwind CSS via CDN

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
git commit -m "Initial landing page"
git branch -M main
git remote add origin https://github.com/yourusername/cadence-landing.git
git push -u origin main
# Then enable GitHub Pages in repo settings
```

### Cloudflare Pages
Just connect the repo in Cloudflare dashboard - zero config needed.

## Customize

1. Update GitHub links in `index.html` and `download.js`
2. Replace `yourusername/cadence` with your actual repo
3. (Optional) Add demo video or screenshots

## Local Preview

```bash
python3 -m http.server 8000
# Visit http://localhost:8000
```

Or use any static server (e.g., `npx serve`, `npx http-server`, etc.)
