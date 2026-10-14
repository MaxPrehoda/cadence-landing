// Pre-render every doc into a real HTML page so search engines (and people
// without JavaScript) get the content, a unique title and description, and a
// self-referencing canonical URL.
//
//   npm i --no-save marked@12.0.0      # same version docs.html loads
//   node scripts/build-docs.mjs
//
// docs.html is the template: the regions between <!--DOC:...--> markers are
// replaced. Output: docs/<id>.html (served at /docs/<id> via cleanUrls) and
// docs.html itself (served at /docs, showing the first doc). Re-run after
// editing docs/*.md or docs/index.json. The browser keeps working as before:
// it reuses the pre-rendered article on first load and fetches .md after.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.cadencevoice.ai';
const template = readFileSync(join(ROOT, 'docs.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(ROOT, 'docs/index.json'), 'utf8'));
const flat = manifest.sections.flatMap((s) => s.items.map((i) => ({ ...i, section: s.title })));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Same link handling as the in-page renderer in docs.html.
const renderer = new marked.Renderer();
const baseLink = renderer.link.bind(renderer);
renderer.link = (href, title, text) => {
    if (typeof href === 'string' && href.startsWith('#/')) return `<a href="/docs/${href.slice(2)}">${text}</a>`;
    const html = baseLink(href, title, text);
    return typeof href === 'string' && /^https?:/i.test(href) ? html.replace('<a ', '<a target="_blank" rel="noopener" ') : html;
};
marked.use({ renderer });

// First real paragraph, as plain text, trimmed at a word boundary.
function describe(md) {
    const para = md.split(/\n\s*\n/).map((b) => b.trim()).find((b) => b && !/^(#|>|\||```|- |\* |\d+\. |!\[)/.test(b));
    let t = (para || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
    if (t.length > 158) t = t.slice(0, 155).replace(/\s+\S*$/, '') + '…';
    return t;
}

const swap = (html, name, inner) => {
    const re = new RegExp(`(<!--DOC:${name}-->)[\\s\\S]*?(<!--/DOC:${name}-->)`);
    if (!re.test(html)) throw new Error(`marker DOC:${name} missing in docs.html`);
    return html.replace(re, (_, a, b) => `${a}${inner}${b}`);
};

const tocHtml = (active) => manifest.sections.map((s) => `
            <div class="toc-section"><div class="toc-heading">${esc(s.title)}</div><ul class="toc-list">${s.items
    .map((i) => `<li><a class="toc-link${i.id === active ? ' active' : ''}" href="/docs/${i.id}" data-id="${i.id}">${esc(i.title)}</a></li>`)
    .join('')}</ul></div>`).join('');

const footHtml = (idx) => {
    const prev = flat[idx - 1], next = flat[idx + 1];
    return (prev ? `<a class="prev" href="/docs/${prev.id}"><span class="lbl">← Previous</span><span>${esc(prev.title)}</span></a>` : '<a class="prev empty" href="#"></a>')
        + (next ? `<a class="next" href="/docs/${next.id}"><span class="lbl">Next →</span><span>${esc(next.title)}</span></a>` : '<a class="next empty" href="#"></a>');
};

function page(item, idx, { canonicalPath }) {
    const md = readFileSync(join(ROOT, `docs/${item.id}.md`), 'utf8');
    const title = item.seoTitle || `${item.title} · Cadence Docs`;
    const desc = item.description || describe(md);
    const url = `${SITE}${canonicalPath}`;
    const body = marked.parse(md).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
    const ld = [
        {
            '@context': 'https://schema.org', '@type': 'TechArticle', headline: item.title, description: desc,
            url, inLanguage: 'en', image: `${SITE}/art/og.png`, dateModified: manifest.updated || undefined,
            about: { '@type': 'SoftwareApplication', name: 'Cadence', operatingSystem: 'macOS 13+', applicationCategory: 'DeveloperApplication' },
            publisher: { '@type': 'Organization', name: 'Cadence Labs', url: `${SITE}/` },
        },
        {
            '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Cadence', item: `${SITE}/` },
                { '@type': 'ListItem', position: 2, name: 'Docs', item: `${SITE}/docs` },
                { '@type': 'ListItem', position: 3, name: item.title, item: `${SITE}/docs/${item.id}` },
            ],
        },
    ];
    const head = `    <title>${esc(title)}</title>

    <meta name="description" content="${esc(desc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    <meta name="theme-color" content="#f5f5f2">

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Cadence">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${SITE}/art/og.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <script type="application/ld+json">${JSON.stringify(ld)}</script>
`;
    let html = swap(template, 'HEAD', `\n${head}    `);
    html = swap(html, 'TOC', tocHtml(item.id));
    html = swap(html, 'ARTICLE', `\n${body}            `);
    html = swap(html, 'FOOT', footHtml(idx));
    html = html.replace(/(<article id="article" class="prose" data-doc=")[^"]*(")/, `$1${item.id}$2`);
    html = html.replace(/(id="mobile-current">)[^<]*(<)/, `$1${esc(item.title)}$2`);
    if (manifest.version) html = html.replace(/(<span id="ver">)[^<]*(<\/span>)/, `$1${esc(manifest.version)}$2`);
    return { html, title, desc };
}

const report = [];
flat.forEach((item, idx) => {
    const { html, title, desc } = page(item, idx, { canonicalPath: `/docs/${item.id}` });
    writeFileSync(join(ROOT, `docs/${item.id}.html`), html);
    report.push(`${String(title.length).padStart(3)} ${String(desc.length).padStart(3)}  /docs/${item.id}  ${title}`);
});
// /docs shows the first doc; its canonical points at that doc's own URL.
writeFileSync(join(ROOT, 'docs.html'), page(flat[0], 0, { canonicalPath: `/docs/${flat[0].id}` }).html);
console.log('title desc  url\n' + report.join('\n'));
