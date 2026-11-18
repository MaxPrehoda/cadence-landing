// Turns the site from "Windows is coming" into "Cadence runs on Windows".
//
// The launch copy lives in launch/windows/ and is not deployed (.vercelignore).
// This script is the only thing that puts it on the site, and it will not say
// a feature works on Windows unless the parity matrix says it has been run
// there.
//
//   node scripts/windows-launch.mjs status
//       What is proven, which facts are still blank, and whether every edit
//       still finds its text on the site. Changes nothing.
//
//   node scripts/windows-launch.mjs preview <dir> [--only-proven]
//       Copies the site into <dir> and applies the launch copy there, with an
//       "unpublished preview" bar on every page. By default it shows the whole
//       launch as if everything were proven, so the copy can be reviewed;
//       --only-proven shows exactly what `apply` would publish today.
//
//   node scripts/windows-launch.mjs apply [--with-legal]
//       Edits the site in place. Refuses while a core claim is unproven or a
//       fact it needs is blank. Claims that are not core and not proven are
//       left out and reported. --with-legal also edits terms.html and
//       privacy.html (read those by hand first).
//
// Options: --parity <file>  the matrix (default: the team's windows-parity.md)
//
// Files: launch/windows/claims.json   claim -> parity rows
//        launch/windows/facts.json    key names, versions, file names
//        launch/windows/edits.mjs     every change to an existing page
//        launch/windows/pages/        pages that are replaced or added whole
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, 'launch/windows');
const args = process.argv.slice(2);
const mode = args[0];
const flag = (name) => args.includes(name);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const PARITY = opt('--parity') || join(homedir(), '.claude/handoffs/cadence-team/reports/windows-parity.md');
const PROVEN = 'run on windows';

// ---- what is proven ------------------------------------------------------

// Rows look like: | A1 | Installer | ... | win-release | not started |
function readParity(file) {
    const rows = new Map();
    if (!existsSync(file)) return rows;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
        const cells = line.split('|').map((c) => c.trim());
        if (cells.length < 5 || !/^[A-Z]\d+$/.test(cells[1])) continue;
        rows.set(cells[1], cells[cells.length - 2].toLowerCase());
    }
    return rows;
}

const parity = readParity(PARITY);
const claims = JSON.parse(readFileSync(join(KIT, 'claims.json'), 'utf8'));
delete claims._about;
const facts = JSON.parse(readFileSync(join(KIT, 'facts.json'), 'utf8'));
delete facts._about;

const claimState = (key) => {
    const c = claims[key];
    if (!c) throw new Error(`unknown claim "${key}" (see launch/windows/claims.json)`);
    const missing = c.rows.filter((id) => parity.get(id) !== PROVEN);
    return { proven: missing.length === 0, missing };
};

// ---- applying ------------------------------------------------------------

// A run of the launch against one directory. `assumeAll` treats every claim as
// proven and prints blank facts as a visible "[not decided]" (preview only).
function run(dir, { assumeAll, withLegal, write }) {
    const problems = [];   // things that make the result wrong
    const skipped = [];    // copy left out because its claim is unproven
    const blanks = new Set();
    const touched = new Map();

    // "everything" is true only when every claim is.
    const proven = (key) => (key === 'everything' ? Object.keys(claims).every((k) => proven(k)) : assumeAll || claimState(key).proven);
    const allowed = (e) => (e.needs || []).every(proven) && !(e.unless || []).some(proven) && (!e.legal || withLegal);
    const why = (e) => (e.legal && !withLegal ? 'legal page, needs --with-legal'
        : (e.needs || []).filter((k) => !proven(k)).map((k) => `"${k}" not proven`).join(', ') || 'its "unless" claim is proven');

    // Facts go into HTML pages escaped ("<version>" must not become a tag).
    const fill = (text, file = '') => text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
        if (!(k in facts)) throw new Error(`unknown fact {{${k}}}`);
        const v = facts[k].value;
        if (v === null || v === undefined) { blanks.add(k); return `[not decided: ${k}]`; }
        return file.endsWith('.html') ? String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : String(v);
    });

    // <!--CLAIM:x-->…<!--/CLAIM:x-->   kept when x is proven
    // <!--UNLESS:x-->…<!--/UNLESS:x--> kept when x is not proven
    // <!--IF:fact-->…<!--/IF:fact-->   kept when a true/false fact is true (IFNOT: false)
    // <!--FEATURES:yes--> / <!--FEATURES:no-->  lists built from claims.json
    const blocks = (text) => {
        const keep = (kind, key) => (kind === 'CLAIM' ? proven(key) : kind === 'UNLESS' ? !proven(key)
            : kind === 'IF' ? facts[key].value === true : facts[key].value !== true);
        let out = text;
        for (let i = 0; i < 4; i++) {
            out = out.replace(/<!--(CLAIM|UNLESS|IF|IFNOT):([\w-]+)-->([\s\S]*?)<!--\/\1:\2-->\n?/g,
                (_, kind, key, inner) => (keep(kind, key) ? inner : ''));
        }
        const list = (want) => Object.entries(claims).filter(([k]) => proven(k) === want)
            .map(([, c]) => `<li>${c.label}</li>`).join('\n                ');
        const mdList = (want) => Object.entries(claims).filter(([k]) => proven(k) === want)
            .map(([, c]) => `- ${c.label}`).join('\n');
        return out.replace('<!--FEATURES:yes-->', list(true)).replace('<!--FEATURES:no-->', list(false))
            .replace('<!--FEATURES-MD:yes-->', mdList(true)).replace('<!--FEATURES-MD:no-->', mdList(false));
    };

    const read = (f) => (touched.has(f) ? touched.get(f) : readFileSync(join(dir, f), 'utf8'));
    const put = (f, text) => touched.set(f, text);
    const count = (hay, needle) => hay.split(needle).length - 1;

    return import(pathToFileURL(join(KIT, 'edits.mjs')).href).then(({ pages, edits, rules }) => {
        // 1. whole pages
        for (const p of pages) {
            if (!allowed(p)) { skipped.push(`${p.to}: page not published (${why(p)})`); continue; }
            put(p.to, fill(blocks(readFileSync(join(KIT, 'pages', p.from), 'utf8')), p.to));
        }
        // 2. exact edits
        for (const e of edits) {
            const label = `${e.file}: "${e.find.replace(/\s+/g, ' ').slice(0, 60)}…"`;
            if (!existsSync(join(dir, e.file))) { problems.push(`${label} file is missing`); continue; }
            const text = read(e.file);
            const n = count(text, e.find);
            if (n === 0 || (!e.all && n !== 1)) { problems.push(`${label} found ${n} times, expected ${e.all ? 'at least 1' : 'exactly 1'}`); continue; }
            if (!allowed(e)) { skipped.push(`${label} (${why(e)})`); continue; }
            put(e.file, text.split(e.find).join(fill(blocks(e.replace), e.file)));
        }
        // 3. patterns across many pages
        for (const r of rules) {
            let hits = 0;
            for (const f of r.files) {
                if (!existsSync(join(dir, f))) { problems.push(`${r.name}: ${f} is missing`); continue; }
                const text = read(f);
                const n = (text.match(r.pattern) || []).length;
                hits += n;
                if (n && allowed(r)) put(f, text.replace(r.pattern, (...m) => fill(typeof r.replace === 'function' ? r.replace(...m) : r.replace, f)));
            }
            if (hits < (r.atLeast || 1)) problems.push(`${r.name}: matched ${hits} times, expected at least ${r.atLeast || 1}`);
            else if (!allowed(r)) skipped.push(`${r.name} (${hits} places; ${why(r)})`);
        }
        if (write) for (const [f, text] of touched) { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), text); }
        return { problems, skipped, blanks: [...blanks], files: [...touched.keys()] };
    });
}

// ---- modes ---------------------------------------------------------------

function report() {
    const out = [];
    out.push(`Parity matrix: ${existsSync(PARITY) ? PARITY : 'NOT FOUND at ' + PARITY} (${parity.size} rows, ${[...parity.values()].filter((s) => s === PROVEN).length} run on Windows)`);
    out.push('', 'Claims (a claim is proven when all of its rows are "run on Windows"):');
    for (const [key, c] of Object.entries(claims)) {
        const s = claimState(key);
        out.push(`  ${s.proven ? 'PROVEN ' : 'no     '} ${c.core ? 'core ' : '     '} ${key.padEnd(16)} ${s.proven ? '' : 'waiting on ' + s.missing.join(', ')}`);
    }
    out.push('', 'Facts:');
    for (const [key, f] of Object.entries(facts)) out.push(`  ${String(f.value === null ? 'BLANK' : f.value).padEnd(34)} ${key}${f.value === null ? '  <- ' + f.source : ''}`);
    return out.join('\n');
}

const blockers = () => Object.entries(claims).filter(([k, c]) => c.core && !claimState(k).proven).map(([k]) => k);

function siteFiles() {
    const listed = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
    return listed.split('\n').filter((f) => f && existsSync(join(ROOT, f)) && !f.startsWith('.preview/'));
}

function buildDocs(dir) {
    try {
        execFileSync('node', ['scripts/build-docs.mjs'], { cwd: dir, stdio: 'pipe' });
        return 'docs rebuilt';
    } catch (e) {
        return 'docs NOT rebuilt: run `npm i --no-save marked@12.0.0 && node scripts/build-docs.mjs` (' + String(e.stderr || e.message).split('\n').find((l) => /Error|Cannot/.test(l)) + ')';
    }
}

const BAR = (text) => `<div style="position:sticky;top:0;z-index:9999;background:#b4382f;color:#fff;font:600 13px/1.4 system-ui,sans-serif;padding:8px 16px;text-align:center">${text}</div>`;

if (mode === 'status') {
    console.log(report());
    const r = await run(ROOT, { assumeAll: true, withLegal: true, write: false });
    console.log(`\nEdits: ${r.files.length} files would change at a full launch.`);
    if (r.blanks.length) console.log(`Blank facts the copy needs: ${r.blanks.join(', ')}`);
    const b = blockers();
    console.log(b.length ? `\nNOT READY TO PUBLISH. Core claims not proven: ${b.join(', ')}` : '\nCore claims are proven.');
    if (r.problems.length) {
        console.log('\nThe site has drifted from the launch kit; fix these in launch/windows/edits.mjs:');
        for (const p of r.problems) console.log('  - ' + p);
        process.exit(1);
    }
    console.log('Every edit still finds its text on the site.');
} else if (mode === 'preview') {
    const dir = args[1];
    if (!dir || dir.startsWith('--')) throw new Error('usage: preview <dir>');
    if (existsSync(dir) && relative(ROOT, dir) === '') throw new Error('preview into a separate directory, not the site itself');
    rmSync(dir, { recursive: true, force: true });
    for (const f of siteFiles()) { mkdirSync(dirname(join(dir, f)), { recursive: true }); cpSync(join(ROOT, f), join(dir, f)); }
    if (existsSync(join(ROOT, 'node_modules/marked'))) cpSync(join(ROOT, 'node_modules/marked'), join(dir, 'node_modules/marked'), { recursive: true });
    const onlyProven = flag('--only-proven');
    const r = await run(dir, { assumeAll: !onlyProven, withLegal: !onlyProven, write: true });
    console.log(buildDocs(dir));
    const note = onlyProven
        ? 'UNPUBLISHED PREVIEW · exactly what would be published today'
        : `UNPUBLISHED PREVIEW · full Windows launch copy, shown as if every feature were proven on Windows. ${blockers().length ? 'Not publishable yet.' : ''}`;
    const walk = (d) => readdirSync(d).flatMap((n) => (n === 'node_modules' || n === 'embed' ? [] : statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
    for (const f of walk(dir).filter((f) => f.endsWith('.html'))) {
        const html = readFileSync(f, 'utf8');
        if (/<body[^>]*>/.test(html)) writeFileSync(f, html.replace(/<body[^>]*>/, (m) => m + '\n' + BAR(note)));
    }
    console.log(`Preview written to ${dir} (${r.files.length} files changed).`);
    if (r.blanks.length) console.log(`Shown as "[not decided: …]": ${r.blanks.join(', ')}`);
    for (const s of r.skipped) console.log('  left out: ' + s);
    for (const p of r.problems) console.log('  PROBLEM: ' + p);
    if (r.problems.length) process.exit(1);
} else if (mode === 'apply') {
    const b = blockers();
    const dry = await run(ROOT, { assumeAll: false, withLegal: flag('--with-legal'), write: false });
    const stop = [];
    if (b.length) stop.push(`core claims not proven on Windows: ${b.join(', ')}`);
    if (dry.blanks.length) stop.push(`blank facts: ${dry.blanks.join(', ')} (launch/windows/facts.json)`);
    if (dry.problems.length) stop.push(...dry.problems);
    if (stop.length) {
        console.error('Not publishing. Nothing was changed.\n  - ' + stop.join('\n  - '));
        console.error('\nRun `node scripts/windows-launch.mjs status` for the full picture.');
        process.exit(1);
    }
    const r = await run(ROOT, { assumeAll: false, withLegal: flag('--with-legal'), write: true });
    console.log(`Applied to ${r.files.length} files.`);
    console.log(buildDocs(ROOT));
    for (const s of r.skipped) console.log('  left out: ' + s);
    console.log('\nNow: read the diff, follow launch/windows/README.md for what the script cannot do, then commit.');
} else {
    console.log('usage: node scripts/windows-launch.mjs status | preview <dir> [--only-proven] | apply [--with-legal]   [--parity <file>]');
    process.exit(mode ? 1 : 0);
}
