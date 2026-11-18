#!/usr/bin/env node
/* Renders an ink-studio scene as a seamless loop of frames.

     node art/ink/loop.js art/ink/meadow.js --out build/meadow [--cam tall] [--w 1920 --h 1080] [--px 3] [--secs 12 --fps 12] [--jobs 8] [--resume 1]

   ink-studio (https://github.com/siliconjungle/shapeshift-labs-ink-studio, MIT) is not a dependency of the site: point
   INK_STUDIO at a checkout (default ~/Developer/ink-studio). Quality: INK_Q scales how finely surfaces are sampled and INK_D
   the pixel grid (the defaults here, 2.4 and 3, give one art pixel per 3 screen pixels at 1920x1080: a 640x360 picture).

   What makes the loop seamless:
     * ink-studio sways leaves and grass with sin(t * speed + ...) and sin(t * speed * 1.3 + ...). The second factor is
       changed to 4/3 in a private copy of its renderer, and every swaying splat's speed is set to a whole number of turns
       per loop (leaves 3, grass 6), so the picture at the last frame leads back into the first.
     * things the scene marks (world.marks) are moved here, also in whole turns: clouds drift, flower heads nod,
       boats bob, and a scene's own marks.frame(world, turn) can change anything else (the lighthouse turns its beam).
   Writes frame-0000.png ... and meta.json (size, fps, where the monitor's glass is in the picture). encode.sh turns the
   frames into the video the page plays. */
const fs = require('fs'), path = require('path'), os = require('os'), Module = require('module'), { spawn } = require('child_process');

const args = process.argv.slice(2);
const scenePath = path.resolve(args[0]);
const opt = {};
for (let i = 1; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
const ROOT = process.env.INK_STUDIO || path.join(os.homedir(), 'Developer/ink-studio');
const OUT = path.resolve(opt.out || 'build/loop');
const SECS = +(opt.secs || 12), FPS = +(opt.fps || 12), N = Math.round(SECS * FPS);
const VW = +(opt.w || 1920), VH = +(opt.h || 1080);
if (opt.cam) process.env.INK_CAM = opt.cam;
process.env.INK_Q = process.env.INK_Q || '2.4';
process.env.INK_D = process.env.INK_D || '3';
fs.mkdirSync(OUT, { recursive: true });

// a parent process hands the frames out to workers
if (opt.from === undefined) {
  const jobs = Math.max(1, Math.min(+(opt.jobs || Math.max(1, os.cpus().length - 2)), N));
  let left = jobs, failed = false;
  const t0 = Date.now();
  for (let j = 0; j < jobs; j++) {
    const a = Math.floor((j * N) / jobs), b = Math.floor(((j + 1) * N) / jobs);
    const c = spawn(process.execPath, [__filename, ...args, '--from', a, '--to', b], { stdio: ['ignore', 'inherit', 'inherit'], env: process.env });
    c.on('exit', code => {
      if (code) failed = true;
      if (--left === 0) {
        if (failed) process.exit(1);
        console.log(`${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${OUT}`);
      }
    });
  }
  return;
}

// the renderer, with the second sway factor made a ratio of whole numbers
const renderFile = path.join(ROOT, 'cli/render.js');
let src = fs.readFileSync(renderFile, 'utf8');
const before = 'Math.sin(t * sp * 1.3 + x0 * 1.1 + ph)';
if (!src.includes(before)) throw new Error('ink-studio renderer changed: the sway line this script adjusts is gone');
src = src.replace(before, 'Math.sin(t * sp * (4 / 3) + x0 * 1.1 + ph)');
const m = new Module(renderFile, module);
m.filename = renderFile;
m.paths = Module._nodeModulePaths(path.dirname(renderFile));
m._compile(src, renderFile);
const R = m.exports;
const PNG = require(path.join(ROOT, 'cli/png.js'));

const kit = require(ROOT).load();
const scene = require(scenePath)(kit);
const world = scene.build(scene.seed);
const D = world.data, count = world.count, marks = world.marks || {};
const TAU = Math.PI * 2;
const rgbOf = i => { const h = world.pal[i]; return ((h >> 16) & 255) + ((h >> 8) & 255) * 256 + (h & 255) * 65536; };
const swayCols = new Set((marks.sway || []).map(rgbOf));
const hash = (x, z) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
const clouds = [], cloudOf = [], bobs = [];
// which cloud a far splat belongs to: the nearest of the centres the scene lists (marks.clouds: [x, y, z, size] each), if it
// is within that cloud's reach. Anything else that far back (distant woods, hills) is left where it is.
const nearestCloud = (x, y) => {
  let best = -1, bd = Infinity;
  (marks.clouds || []).forEach(([cx, cy, , s], c) => {
    const d = ((x - cx) / (s * 3.2)) ** 2 + ((y - cy) / (s * 1.6)) ** 2;
    if (d < 1 && d < bd) { bd = d; best = c; }
  });
  return best;
};
for (let i = 0; i < count; i++) {
  const o = i * 16, kind = D[o + 11] % 16;
  if (kind === 11) D[o + 13] = (TAU * (D[o + 14] >= 0.03 ? 3 : 6)) / SECS;           // leaves 3 turns a loop, grass 6
  else if (kind === 0 && swayCols.has(D[o + 7]) && D[o + 1] < (marks.swayBelow ?? -1e9)) {
    // a flower head: nod with the grass, each flower in its own time (one phase for the whole head, from where it stands)
    D[o + 11] += 11;
    D[o + 12] = hash(Math.round(D[o] * 4), Math.round(D[o + 2] * 4)) * TAU;
    D[o + 13] = (TAU * 6) / SECS;
    D[o + 14] = 0.022;
  } else if (marks.cloudZ !== undefined && D[o + 2] < marks.cloudZ && !(marks.still && marks.still(D[o], D[o + 1], D[o + 2]))) {
    const c = nearestCloud(D[o], D[o + 1]);
    if (c >= 0) { clouds.push(i); cloudOf.push(c); }
  }
  if (marks.bob) { const b = marks.bob(D[o], D[o + 1], D[o + 2]); if (b) bobs.push([i, b]); }
}
const rest = new Float32Array(count * 3);
for (let i = 0; i < count; i++) { rest[i * 3] = D[i * 16]; rest[i * 3 + 1] = D[i * 16 + 1]; rest[i * 3 + 2] = D[i * 16 + 2]; }
if (marks.turn) for (let i = 0; i < count; i++) { const o = i * 16; if (D[o + 11] % 16 === 5) D[o + 13] = (TAU * marks.turn) / SECS; }
if (marks.cycle) for (let i = 0; i < count; i++) { const o = i * 16, k = D[o + 11] % 16; if (marks.cycle[k]) D[o + 13] = (TAU * Math.max(1, Math.round((D[o + 13] * SECS) / TAU / marks.cycle[k]) * marks.cycle[k])) / SECS; }

for (let f = +opt.from; f < +opt.to; f++) {
  // --resume 1: keep frames already on disk (only safe if the scene has not changed since they were drawn)
  if (opt.resume && f !== 0 && fs.existsSync(path.join(OUT, `frame-${String(f).padStart(4, '0')}.png`))) continue;
  const t = f / FPS, u = (f / N) * TAU;
  // each cloud moves as one piece (every splat of it by the same amount), so it never pulls apart and shows sky through
  for (let n = 0; n < clouds.length; n++) {
    const i = clouds[n], c = cloudOf[n], z = marks.clouds[c][2];
    D[i * 16] = rest[i * 3] + (0.6 + (-z - 20) * 0.12) * Math.sin(u + c * 1.9);
  }
  for (const [i, b] of bobs) {
    D[i * 16 + 1] = rest[i * 3 + 1] + b.amp * Math.sin(u * (b.turns || 3) + b.ph);
    if (b.roll) D[i * 16] = rest[i * 3] + b.roll * (rest[i * 3 + 1] - b.y0) * Math.sin(u * (b.turns || 3) + b.ph + 1.2);
  }
  if (marks.frame) marks.frame(world, u, t);
  const im = R.render(world, { w: VW, h: VH, colored: true, t, ...(opt.px ? { px: +opt.px } : {}) });
  PNG.write(path.join(OUT, `frame-${String(f).padStart(4, '0')}.png`), im.w, im.h, im.rgb);
  if (f === 0) {
    // where the monitor's glass landed: the box of pixels in its colour
    const meta = { size: [im.w, im.h], px: im.px, fps: FPS, frames: N, secs: SECS };
    if (marks.screen !== undefined) {
      const h = world.pal[marks.screen], r = h >> 16, g = (h >> 8) & 255, b = h & 255;
      // The glass is the one solid block of its colour: the rows at least half as full as the fullest, taken as one
      // run of rows round it (stray pixels of the same colour elsewhere don't count). meta.glass then lists, for each
      // row of that box, the stretches that really are glass, so the page can leave alone whatever stands in front.
      const is = (x, y) => { const q = (y * im.w + x) * 3; return im.rgb[q] === r && im.rgb[q + 1] === g && im.rgb[q + 2] === b; };
      const rowN = Array.from({ length: im.h }, (_, y) => { let n = 0; for (let x = 0; x < im.w; x++) if (is(x, y)) n++; return n; });
      const best = rowN.indexOf(Math.max(...rowN)), full = rowN[best];
      let x0 = 1e9, y0 = best, x1 = -1, y1 = best;
      if (full > 0) {
        while (y0 > 0 && rowN[y0 - 1] >= full * 0.5) y0--;
        while (y1 < im.h - 1 && rowN[y1 + 1] >= full * 0.5) y1++;
        for (let x = 0; x < im.w; x++) if (is(x, best)) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
      }
      if (x1 >= 0) {
        meta.screen = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
        meta.glass = [];
        for (let y = y0; y <= y1; y++) {
          const runs = [];
          for (let x = x0; x <= x1; x++) if (is(x, y)) { const a = x; while (x < x1 && is(x + 1, y)) x++; runs.push([a - x0, x - x0]); }
          meta.glass.push(runs);
        }
        if (marks.steam && marks.screenWorld) {
          const [sw, sh, sy] = marks.screenWorld, k = (x1 - x0 + 1) / sw;
          meta.steam = [Math.round((x0 + x1) / 2 + marks.steam[0] * k), Math.round((y0 + y1) / 2 - (marks.steam[1] - sy) * k)];
        }
      }
    }
    Object.assign(meta, marks.meta || {});
    fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta));
  }
}
