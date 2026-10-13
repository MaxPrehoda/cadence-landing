// Recording harness v2: the stage is the live embed (cadence-landing/embed/
// index.html?record) with the real app windows built into embed/app/, served
// from a static server on the landing repo. A CDP screencast captures every
// painted frame with its timestamp; writeMaster turns them into a 30 fps
// near-lossless master that encode.sh loops and encodes.
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(`${execSync("npm root -g").toString().trim()}/playwright`);
export const DIR = path.dirname(new URL(import.meta.url).pathname);
export const ORIGIN = process.env.SITE || "http://localhost:8090";

export async function openStage({ width, height, scale, css = "" }) {
  const browser = await chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  page.on("requestfailed", (r) => errors.push(`[reqfail] ${r.url()}`));
  await page.goto(`${ORIGIN}/embed/?record`);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => document.fonts.ready);
  return { browser, ctx, page, errors };
}

/** Show a window and wait until its page has rendered `readySel`. */
export async function showWindow(page, label, readySel) {
  await page.evaluate((l) => window.__bridge.show(l, true), label);
  const frame = page.frame({ name: label });
  await frame.waitForSelector(readySel, { timeout: 15000 });
  await frame.evaluate(() => document.fonts.ready);
  return frame;
}

/** Glide the drawn cursor there, then put the real mouse on it (real hover). */
export async function glide(page, x, y, ms = 700) {
  await page.evaluate(([x, y, ms]) => window.__bridge.move(x, y, ms), [x, y, ms]);
  await page.mouse.move(x, y);
}
export async function pointAt(page, x, y) {
  await page.evaluate(([x, y]) => window.__bridge.pointer(x, y), [x, y]);
  await page.mouse.move(x, y);
}
export async function click(page) {
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startCapture(page, maxW, maxH) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
  });
  await cdp.send("Page.startScreencast", { format: "png", maxWidth: maxW, maxHeight: maxH, everyNthFrame: 1 });
  return {
    frames,
    async stop() {
      await cdp.send("Page.stopScreencast");
      return frames;
    },
  };
}

/** A clock for the storyboard: at(s) resolves s seconds after `from`. */
export function timeline() {
  const from = Date.now() / 1000;
  return { from, at: (s) => sleep(Math.max(0, from * 1000 + s * 1000 - Date.now())) };
}

/** Write captured frames and turn them into a constant-rate lossless master. */
export function writeMaster(frames, out, { fps = 30, from, to, w = 1600, h = 1000 }) {
  const dir = out + ".frames";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const list = frames.filter((f) => f.t >= from - 1 && f.t <= to);
  let startIdx = list.findIndex((f) => f.t >= from);
  if (startIdx < 0) startIdx = list.length - 1;
  const use = list.slice(Math.max(0, startIdx - 1));
  let concat = "";
  use.forEach((f, i) => {
    const name = `f${String(i).padStart(5, "0")}.png`;
    fs.writeFileSync(path.join(dir, name), Buffer.from(f.data, "base64"));
    const start = Math.max(f.t, from);
    const end = i + 1 < use.length ? Math.max(use[i + 1].t, from) : to;
    concat += `file '${name}'\nduration ${Math.max(0, end - start).toFixed(4)}\n`;
  });
  concat += `file 'f${String(use.length - 1).padStart(5, "0")}.png'\n`;
  fs.writeFileSync(path.join(dir, "list.txt"), concat);
  execSync(
    `ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -vf "fps=${fps},scale=${w}:${h}:flags=lanczos,format=yuv444p" -c:v libx264 -preset slow -crf 4 ${out}`,
    { cwd: dir, stdio: "inherit" },
  );
  fs.rmSync(dir, { recursive: true, force: true });
  return use.length;
}

/** Record a storyboard: run(page, at) between capture start and stop. */
export async function record(name, { width, height, scale, css, setup, run, len }) {
  const { browser, page, errors } = await openStage({ width, height, scale, css });
  const ctx = (await setup?.(page)) ?? {};
  const cap = await startCapture(page, Math.round(width * scale), Math.round(height * scale));
  await sleep(400);
  const { from, at } = timeline();
  await run(page, at, ctx);
  await at(len);
  const to = Date.now() / 1000;
  const frames = await cap.stop();
  console.log(name, "frames", frames.length, "fps≈", (frames.length / (to - from)).toFixed(1));
  if (errors.length) console.log(errors.join("\n"));
  writeMaster(frames, `${DIR}/out/${name}.master.mp4`, { from, to });
  await browser.close();
}
