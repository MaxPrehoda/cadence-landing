// Turn GitHub releases into release notes on the site: one post per release at
// /blog/releases/cadence-X-Y-Z, an entry on /changelog, the latest releases on
// the Writing index, and sitemap entries.
//
//   npm i --no-save marked@12.0.0      # same version as build-docs.mjs
//   GITHUB_TOKEN=… node scripts/release-notes.mjs
//
// .github/workflows/release-notes.yml runs this whenever a release is
// published, edited or deleted, then commits and pushes the result.
//
// Every published release (not drafts or pre-releases) gets generated, except
// tags that already have a hand-written section in changelog.html (below the
// RELEASES marker). Output depends only on the releases, so a re-run with
// nothing new changes nothing.
//
// The release body is the source. Write it in this shape:
//
//   ## Cadence v0.5.5
//   Optional one-line lede: becomes the post's subtitle.
//   ### New        (also: What's New, Added)
//   ### Changed    (also: Improved, Improvements)
//   ### Fixed      (also: Fixes, Bug Fixes)
//
// Other sections (Installation, Upgrading, Requirements, Downloads) stay on
// GitHub. Without a lede, the bold lead of the first item is the subtitle.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.cadencevoice.ai';
const REPO = process.env.RELEASES_REPO || 'MaxPrehoda/cadence-landing';
const POSTS_DIR = join(ROOT, 'blog/releases');
const INDEX_LATEST = 3;
const TZ = 'America/Los_Angeles';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// Links to other sites open in a new tab, as everywhere else on the site.
const renderer = new marked.Renderer();
const baseLink = renderer.link.bind(renderer);
renderer.link = (href, title, text) => {
    const html = baseLink(href, title, text);
    return typeof href === 'string' && /^https?:/i.test(href) && !href.startsWith(SITE) ? html.replace('<a ', '<a target="_blank" rel="noopener" ') : html;
};
marked.use({ renderer });

async function fetchReleases() {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'cadence-release-notes' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const all = [];
    for (let page = 1; ; page++) {
        const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`, { headers });
        if (!res.ok) throw new Error(`GitHub releases: ${res.status} ${await res.text()}`);
        const batch = await res.json();
        all.push(...batch);
        if (batch.length < 100) return all;
    }
}

const SECTIONS = [
    ['New', /^(what'?s new|new|new features?|added|features?)$/i],
    ['Changed', /^(changed|changes|improved|improvements)$/i],
    ['Fixed', /^(fixed|fixes|bug ?fixes)$/i],
];

// Split a release body into its lede and the New / Changed / Fixed sections.
function parseBody(body) {
    const md = (body || '').replace(/\r\n/g, '\n');
    const parts = md.split(/^#{2,3}[ \t]+(.+)$/m);
    const sections = [];
    let lede = '';
    const intro = parts[0].trim();
    for (let i = 1; i < parts.length; i += 2) {
        const heading = parts[i].trim();
        const content = (parts[i + 1] || '').trim();
        if (/^cadence\s+v?\d/i.test(heading)) {
            if (!lede && content) lede = content.split(/\n\s*\n/)[0].trim();
            continue;
        }
        const kind = SECTIONS.find(([, re]) => re.test(heading))?.[0];
        if (!kind || !content) continue;
        const same = sections.find((s) => s.kind === kind);
        if (same) same.md += `\n${content}`;
        else sections.push({ kind, md: content });
    }
    if (!lede && intro && !/^[-*\d]/.test(intro)) lede = intro.split(/\n\s*\n/)[0].trim();
    sections.sort((a, b) => SECTIONS.findIndex(([k]) => k === a.kind) - SECTIONS.findIndex(([k]) => k === b.kind));
    return { lede, sections };
}

// The subtitle: the lede, or the bold lead of the first item.
function dekOf({ lede, sections }) {
    if (lede) return marked.parseInline(lede);
    const first = sections[0]?.md.match(/^\s*[-*]\s+\*\*(.+?)\*\*/m);
    if (first) return marked.parseInline(first[1]);
    return '';
}

const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const clip = (t, n = 158) => (t.length > n ? t.slice(0, n - 3).replace(/\s+\S*$/, '') + '…' : t);

function dateParts(iso) {
    const d = new Date(iso);
    const part = (opts) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts }).format(d);
    const [m, day, y] = part({ year: 'numeric', month: '2-digit', day: '2-digit' }).split('/');
    return {
        ymd: `${y}-${m}-${day}`,
        long: part({ year: 'numeric', month: 'long', day: 'numeric' }),
        short: part({ year: 'numeric', month: 'short', day: 'numeric' }),
        slash: `${y}/${m}/${day}`,
    };
}

function toRelease(r) {
    const version = r.tag_name.replace(/^v/, '');
    const parsed = parseBody(r.body);
    const dek = dekOf(parsed);
    return {
        tag: r.tag_name,
        version,
        slug: `cadence-${version.replace(/[^0-9a-z]+/gi, '-').toLowerCase()}`,
        githubUrl: r.html_url,
        published: r.published_at,
        date: dateParts(r.published_at),
        lede: parsed.lede ? marked.parseInline(parsed.lede) : '',
        dek,
        sections: parsed.sections.map((s) => ({ kind: s.kind, html: marked.parse(s.md).trim() })),
    };
}

// Indent generated markup to sit in its file, leaving <pre> blocks alone.
const indent = (html, pad) => {
    let inPre = false;
    return html.split('\n').map((l) => {
        const out = l && !inPre ? pad + l : l;
        if (/<pre[\s>]/.test(l)) inPre = true;
        if (/<\/pre>/.test(l)) inPre = false;
        return out;
    }).join('\n');
};

function postPage(rel, newer, older) {
    const url = `${SITE}/blog/releases/${rel.slug}`;
    const title = `Cadence ${rel.version} release notes`;
    const desc = clip(plain(rel.dek) || `What's new in Cadence ${rel.version}, the Mac app that puts Claude Code, Codex and your other coding agents in one Inbox.`);
    const body = rel.sections.length
        ? rel.sections.map((s, i) => `<h2><span class="section-num">§${String(i + 1).padStart(2, '0')}</span> ${s.kind}</h2>\n${s.html}`).join('\n')
        : '<p>Details are on the <a href="' + esc(rel.githubUrl) + '" target="_blank" rel="noopener">GitHub release</a>.</p>';
    const posting = {
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: title, description: desc,
        image: `${SITE}/art/og.png`, datePublished: rel.published, dateModified: rel.published, inLanguage: 'en-US',
        articleSection: 'Releases',
        author: { '@type': 'Organization', name: 'Cadence Labs', url: `${SITE}/blog` },
        publisher: { '@type': 'Organization', name: 'Cadence', logo: { '@type': 'ImageObject', url: `${SITE}/icon.png` } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        isPartOf: { '@type': 'Blog', '@id': `${SITE}/blog`, name: 'Cadence Labs' },
        about: { '@type': 'SoftwareApplication', name: 'Cadence', softwareVersion: rel.version, operatingSystem: 'macOS 13+', applicationCategory: 'DeveloperApplication' },
    };
    const crumbs = {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Cadence', item: `${SITE}/` },
            { '@type': 'ListItem', position: 2, name: 'Writing', item: `${SITE}/blog` },
            { '@type': 'ListItem', position: 3, name: `Cadence ${rel.version}`, item: url },
        ],
    };
    const link = (r) => (r.generated ? `/blog/releases/${r.slug}` : `/changelog#${r.tag}`);
    const next = [
        newer && `<a href="${link(newer)}"><span class="arrow">→</span>Newer: Cadence ${esc(newer.version)}</a>`,
        older && `<a href="${link(older)}"><span class="arrow">→</span>Older: Cadence ${esc(older.version)}</a>`,
        '<a href="/changelog"><span class="arrow">→</span>Every release</a>',
    ].filter(Boolean).join('\n        ');

    return `<!DOCTYPE html>
<!-- Generated by scripts/release-notes.mjs from the GitHub release ${esc(rel.tag)}. Edit the release on GitHub, not this file. -->
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>

    <meta name="description" content="${esc(desc)}">
    <meta name="author" content="Cadence Labs">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${url}">

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Cadence">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${SITE}/art/og.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="article:published_time" content="${rel.published}">
    <meta property="article:author" content="Cadence Labs">
    <meta property="article:section" content="Releases">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${SITE}/art/og.png">

    <meta name="theme-color" content="#f5f5f2">
    <link rel="icon" type="image/png" href="/icon.png">

    <script type="application/ld+json">${JSON.stringify(posting)}</script>
    <script type="application/ld+json">${JSON.stringify(crumbs)}</script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/site.css">
    <link rel="stylesheet" href="/blog/blog.css">
    <script>
        window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
        document.addEventListener('click', (e) => { if (e.target.closest('a[href="/download"]')) window.va('event', { name: 'download', data: { arch: 'arm64' } }); });
    </script>
    <script defer src="/_vercel/insights/script.js"></script>
</head>
<body>

<header class="site-nav">
    <div class="site-nav-in">
        <a class="wordmark" href="/">Cadence</a>
        <nav aria-label="Primary">
            <a href="/docs.html">Docs</a>
            <a href="/faq.html">FAQ</a>
            <a href="/blog/" aria-current="page">Writing</a>
            <a href="/changelog.html">Changelog</a>
            <a class="cta dark" href="/download">Download</a>
        </nav>
    </div>
</header>

<article class="article">
    <p class="eyebrow meta-strip"><span>Release notes</span><span class="sep">/</span><span>v${esc(rel.version)}</span><span class="sep">/</span><time datetime="${rel.date.ymd}">${rel.date.short}</time></p>
    <h1 class="two article-title">What's new in <span>Cadence ${esc(rel.version)}.</span></h1>
${rel.dek ? `    <p class="article-dek">${rel.dek}</p>\n` : ''}    <div class="byline">
        <span class="author">By Cadence Labs</span> · Filed in Releases
    </div>
    <div class="article-body prose">
${indent(body, '        ')}
    </div>
    <div class="release-get panel">
        <div>
            <p class="release-get-title">Get Cadence</p>
            <p class="release-get-sub">Free for Apple Silicon Macs on macOS 13 or later. The download is always the newest version.</p>
        </div>
        <div class="release-get-links">
            <a class="cta dark" href="/download">Download</a>
            <a class="cta" href="${esc(rel.githubUrl)}" target="_blank" rel="noopener">v${esc(rel.version)} on GitHub</a>
        </div>
    </div>
    <p class="endmark"><span class="em-glyph">§</span> END · Cadence ${esc(rel.version)} · Released ${rel.date.slash}</p>
    <div class="cross-links">
        <div class="cross-links-label">Read next</div>
        ${next}
    </div>
</article>

<footer class="site-foot">
    <div class="site-foot-in">
        <div class="links">
            <a href="/">Cadence</a>
            <a href="/docs.html">Docs</a>
            <a href="/faq.html">FAQ</a>
            <a href="/blog/">Writing</a>
            <a href="/changelog.html">Changelog</a>
            <a href="/privacy.html">Privacy</a>
            <a href="/terms.html">Terms</a>
            <a href="mailto:support@cadencevoice.ai">Support</a>
        </div>
        <div class="copy">© 2026 Cadence Labs</div>
    </div>
</footer>

</body>
</html>
`;
}

function changelogEntry(rel) {
    const sections = rel.sections.map((s) => `<h3>${s.kind}</h3>\n${s.html}`).join('\n');
    return `
<section class="rel" id="${esc(rel.tag)}">
    <div class="rel-head">
        <h2>${esc(rel.tag)}</h2>
        <time datetime="${rel.date.ymd}">${rel.date.long}</time>
        <span class="rel-links">
            <a href="/blog/releases/${rel.slug}">Release notes</a>
            <a href="${esc(rel.githubUrl)}" target="_blank" rel="noopener">Download</a>
        </span>
    </div>
${rel.lede ? `    <p class="lede">${rel.lede}</p>\n` : ''}${indent(sections, '    ')}
</section>
`;
}

function indexRow(rel) {
    return `
<li>
    <a href="/blog/releases/${rel.slug}" class="post-row panel">
        <span class="post-num">v${esc(rel.version)}</span>
        <div class="post-main">
            <span class="post-meta"><time datetime="${rel.date.ymd}">${rel.date.short}</time><span class="sep">/</span>Release</span>
            <h3 class="post-title">Cadence ${esc(rel.version)}</h3>
${rel.dek ? `            <p class="post-dek">${esc(plain(rel.dek))}</p>\n` : ''}        </div>
        <span class="post-side">
            <span class="post-arrow" aria-hidden="true">→</span>
        </span>
    </a>
</li>
`;
}

function sitemapUrl(rel) {
    return `
<url>
    <loc>${SITE}/blog/releases/${rel.slug}</loc>
    <lastmod>${rel.date.ymd}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
</url>
`;
}

// Replace what sits between <!--RELEASES--> and <!--/RELEASES--> (or the XML
// comment form in the sitemap), keeping the markers' own indentation.
function swap(file, html) {
    const text = read(file);
    const re = /^([ \t]*)(<!--\s*RELEASES\s*-->)[\s\S]*?(<!--\s*\/RELEASES\s*-->)/m;
    if (!re.test(text)) throw new Error(`RELEASES markers missing in ${file}`);
    const out = text.replace(re, (_, pad, open, close) => `${pad}${open}\n${html.trim() ? indent(html.trim(), pad) + '\n' : ''}${pad}${close}`);
    if (out !== text) writeFileSync(join(ROOT, file), out);
}

const raw = await fetchReleases();
const releases = raw
    .filter((r) => !r.draft && !r.prerelease && r.published_at)
    .map(toRelease)
    .sort((a, b) => b.published.localeCompare(a.published));

// Tags with a hand-written changelog section stay as they are.
const changelog = read('changelog.html');
const handwritten = changelog.replace(/<!--\s*RELEASES\s*-->[\s\S]*?<!--\s*\/RELEASES\s*-->/, '');
for (const r of releases) r.generated = !new RegExp(`id="${r.tag.replace(/\./g, '\\.')}"`).test(handwritten);
const generated = releases.filter((r) => r.generated);

mkdirSync(POSTS_DIR, { recursive: true });
const keep = new Set();
releases.forEach((rel, i) => {
    if (!rel.generated) return;
    const file = `${rel.slug}.html`;
    keep.add(file);
    writeFileSync(join(POSTS_DIR, file), postPage(rel, releases[i - 1], releases[i + 1]));
});
for (const f of readdirSync(POSTS_DIR)) if (f.endsWith('.html') && !keep.has(f)) rmSync(join(POSTS_DIR, f));

swap('changelog.html', generated.map(changelogEntry).join(''));
swap('blog/index.html', generated.length
    ? `<section class="release-index" aria-labelledby="release-notes">
    <h2 class="eyebrow" id="release-notes">Release notes</h2>
    <ol class="post-list" aria-label="Latest releases">
${indent(generated.slice(0, INDEX_LATEST).map(indexRow).join('').trim(), '        ')}
    </ol>
    <p class="release-all"><a href="/changelog">Every release →</a></p>
</section>`
    : '');
swap('sitemap.xml', generated.map(sitemapUrl).join(''));

// The changelog page changes with every release.
if (releases[0]) {
    const sitemap = read('sitemap.xml');
    const bumped = sitemap.replace(/(<loc>https:\/\/www\.cadencevoice\.ai\/changelog<\/loc>\s*<lastmod>)[^<]*(<\/lastmod>)/, `$1${releases[0].date.ymd}$2`);
    if (bumped !== sitemap) writeFileSync(join(ROOT, 'sitemap.xml'), bumped);
}

console.log(`${generated.length} release posts: ${generated.map((r) => r.tag).join(', ') || 'none'}`);
