// Turns the site from "Windows is coming" into "there is an untested Windows
// preview you can download", and back.
//
// The preview copy lives in launch/windows-preview/ and is not deployed
// (.vercelignore). This script is the only thing that puts it on the site.
//
//   node scripts/windows-preview.mjs status
//       Whether the preview is on, which release values are blank, and
//       whether every edit still finds its text. Changes nothing.
//
//   node scripts/windows-preview.mjs preview <dir> [--tag <tag>]
//       Copies the site into <dir> and applies the preview there, with an
//       "unpublished" bar on every page.
//
//   node scripts/windows-preview.mjs apply [--tag <tag>]
//       Edits the site in place. Refuses while the release tag is blank.
//       --tag also writes the tag into launch/windows-preview/release.json.
//
//   node scripts/windows-preview.mjs undo
//       Puts the "Windows is coming" state back (run before the full launch
//       script, which expects that state).
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'launch/windows-preview');
const args = process.argv.slice(2);
const mode = args[0];
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const releaseFile = join(KIT, 'release.json');
const release = JSON.parse(readFileSync(releaseFile, 'utf8'));
const tagArg = opt('--tag');
if (tagArg !== undefined) {
    // A tag goes into a URL and into JavaScript source: keep it plain.
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(tagArg)) throw new Error(`"${tagArg}" is not a usable release tag`);
    release.tag.value = tagArg;
}
const facts = Object.fromEntries(Object.entries(release).filter(([k]) => k !== '_about'));
const { pages, edits } = await import(pathToFileURL(join(KIT, 'edits.mjs')).href);

// The waitlist page as it is in git, for `undo`.
const COMING = join(KIT, 'pages/windows.coming.html');

function run(dir, { write, reverse = false, allowBlank = false }) {
    const problems = [];
    const blanks = new Set();
    const touched = new Map();
    const fill = (text, file = '') => text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
        if (!(k in facts)) throw new Error(`unknown value {{${k}}} (launch/windows-preview/release.json)`);
        const v = facts[k].value;
        if (v === null || v === undefined) { blanks.add(k); return allowBlank ? `PLACEHOLDER-${k}` : ''; }
        return file.endsWith('.html') ? String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : String(v);
    });
    const read = (f) => (touched.has(f) ? touched.get(f) : readFileSync(join(dir, f), 'utf8'));

    for (const p of pages) {
        const src = reverse ? COMING : join(KIT, 'pages', p.from);
        touched.set(p.to, reverse ? readFileSync(src, 'utf8') : fill(readFileSync(src, 'utf8'), p.to));
    }
    for (const e of edits) {
        const from = reverse ? fill(e.replace, e.file) : e.find;
        const to = reverse ? e.find : fill(e.replace, e.file);
        const label = `${e.file}: "${from.replace(/\s+/g, ' ').slice(0, 60)}…"`;
        if (!existsSync(join(dir, e.file))) { problems.push(`${label} file is missing`); continue; }
        const text = read(e.file);
        const n = text.split(from).length - 1;
        if (n !== 1) { problems.push(`${label} found ${n} times, expected exactly 1`); continue; }
        touched.set(e.file, text.replace(from, () => to));
    }
    if (write) for (const [f, text] of touched) writeFileSync(join(dir, f), text);
    return { problems, blanks: [...blanks], files: [...touched.keys()] };
}

const isOn = () => /const WINDOWS_PREVIEW = true;/.test(readFileSync(join(ROOT, 'platform.js'), 'utf8'));
const BAR = '<div style="position:sticky;top:0;z-index:9999;background:#b4382f;color:#fff;font:600 13px/1.4 system-ui,sans-serif;padding:8px 16px;text-align:center">UNPUBLISHED · Windows preview state</div>';

if (mode === 'status') {
    const on = isOn();
    console.log(`Windows preview on this copy of the site: ${on ? 'ON' : 'off'}`);
    for (const [k, f] of Object.entries(facts)) console.log(`  ${String(f.value === null ? 'BLANK' : f.value).padEnd(52)} ${k}${f.value === null ? '  <- ' + f.source : ''}`);
    const r = run(ROOT, { write: false, reverse: on, allowBlank: true });
    if (r.problems.length) {
        console.log(`\nThe site has drifted from the preview kit; fix these in launch/windows-preview/edits.mjs:`);
        for (const p of r.problems) console.log('  - ' + p);
        process.exit(1);
    }
    console.log(`\n${on ? 'Every edit can be undone' : 'Every edit still finds its text'} (${r.files.length} files).`);
    if (!on && r.blanks.length) console.log(`NOT READY: blank ${r.blanks.join(', ')}. Use --tag <tag> or fill release.json.`);
} else if (mode === 'preview') {
    const dir = args[1];
    if (!dir || dir.startsWith('--')) throw new Error('usage: preview <dir>');
    if (existsSync(dir) && relative(ROOT, dir) === '') throw new Error('preview into a separate directory, not the site itself');
    if (isOn()) throw new Error('the preview is already applied to this copy of the site');
    rmSync(dir, { recursive: true, force: true });
    const listed = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
    for (const f of listed.split('\n').filter((f) => f && existsSync(join(ROOT, f)) && !f.startsWith('.preview/'))) {
        mkdirSync(dirname(join(dir, f)), { recursive: true });
        cpSync(join(ROOT, f), join(dir, f));
    }
    const r = run(dir, { write: true, allowBlank: true });
    const walk = (d) => readdirSync(d).flatMap((n) => (n === 'node_modules' || n === 'embed' ? [] : statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
    for (const f of walk(dir).filter((f) => f.endsWith('.html'))) {
        const html = readFileSync(f, 'utf8');
        if (/<body[^>]*>/.test(html)) writeFileSync(f, html.replace(/<body[^>]*>/, (m) => m + '\n' + BAR));
    }
    console.log(`Preview written to ${dir} (${r.files.length} files changed).`);
    if (r.blanks.length) console.log(`Shown as "PLACEHOLDER-…": ${r.blanks.join(', ')}`);
    for (const p of r.problems) console.log('  PROBLEM: ' + p);
    if (r.problems.length) process.exit(1);
} else if (mode === 'apply') {
    const stop = [];
    if (isOn()) stop.push('the preview is already applied');
    const dry = isOn() ? { problems: [], blanks: [] } : run(ROOT, { write: false });
    if (dry.blanks.length) stop.push(`blank values: ${dry.blanks.join(', ')} (pass --tag <tag>, or fill launch/windows-preview/release.json)`);
    stop.push(...dry.problems);
    if (stop.length) {
        console.error('Not applying. Nothing was changed.\n  - ' + stop.join('\n  - '));
        process.exit(1);
    }
    cpSync(join(ROOT, 'windows.html'), COMING);   // kept so `undo` can put it back
    if (tagArg !== undefined) writeFileSync(releaseFile, JSON.stringify(release, null, 2) + '\n');
    const r = run(ROOT, { write: true });
    console.log(`Applied to ${r.files.length} files:\n  ${r.files.join('\n  ')}`);
    console.log('\nNow: read the diff, and follow launch/windows-preview/README.md before publishing.');
} else if (mode === 'undo') {
    if (!isOn()) { console.error('The preview is not applied. Nothing was changed.'); process.exit(1); }
    if (!existsSync(COMING)) { console.error(`Missing ${COMING} (the waitlist page saved by apply). Restore windows.html from git instead.`); process.exit(1); }
    const dry = run(ROOT, { write: false, reverse: true });
    if (dry.problems.length) { console.error('Cannot undo cleanly. Nothing was changed.\n  - ' + dry.problems.join('\n  - ')); process.exit(1); }
    const r = run(ROOT, { write: true, reverse: true });
    rmSync(COMING);
    console.log(`Back to "Windows is coming" (${r.files.length} files).`);
} else {
    console.log('usage: node scripts/windows-preview.mjs status | preview <dir> [--tag <tag>] | apply [--tag <tag>] | undo');
    process.exit(mode ? 1 : 0);
}
