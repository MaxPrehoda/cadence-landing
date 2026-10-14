// Builds the real Cadence windows (toolbar, panel, Talk) from a voice-flow
// checkout into ../app/ as static files with relative URLs, then wires each
// page to the stage's fake backend by injecting tauri-shim.js ahead of the
// app's module script. Nothing in voice-flow is written to: the vite config
// lives here and the output goes outside the checkout.
//
//   VOICE_FLOW=/path/to/voice-flow node embed/src/build.mjs
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EMBED = path.resolve(HERE, "..");
const OUT = path.join(EMBED, "app");
const VF = path.resolve(process.env.VOICE_FLOW || "/home/user/voice-flow");
const mod = (p) => import(pathToFileURL(path.join(VF, "node_modules", p)).href);

const { build } = await mod("vite/dist/node/index.js");
const { svelte } = await mod("@sveltejs/vite-plugin-svelte/src/index.js");
const tailwind = (await mod("@tailwindcss/vite/dist/index.mjs")).default;
const pkg = JSON.parse(fs.readFileSync(path.join(VF, "package.json"), "utf8"));

const PAGES = ["indicator", "agents-popover", "talk"];
const FONTS = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";

await build({
  root: VF,
  configFile: false,
  base: "./",
  logLevel: "warn",
  cacheDir: path.join((await import("node:os")).tmpdir(), "cadence-embed-vite"),
  plugins: [svelte({ configFile: path.join(VF, "svelte.config.js"), onwarn: () => {} }), tailwind()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: OUT,
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    reportCompressedSize: false,
    rollupOptions: {
      input: Object.fromEntries(PAGES.map((p) => [p, path.join(VF, `${p}.html`)])),
    },
  },
});

// The shim must run before the app's module script, so it goes in as a
// classic script at the top of <head>.
fs.copyFileSync(path.join(HERE, "tauri-shim.js"), path.join(OUT, "tauri-shim.js"));
for (const p of PAGES) {
  const f = path.join(OUT, `${p}.html`);
  let html = fs.readFileSync(f, "utf8");
  // app.css's Google Fonts @import does not survive Tailwind's bundling, so
  // Inter and JetBrains Mono are linked here instead.
  html = html.replace(
    "<head>",
    `<head>\n    <script src="./tauri-shim.js"></script>\n    <link rel="stylesheet" href="${FONTS}">`,
  );
  fs.writeFileSync(f, html);
}

let total = 0;
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const n = fs.statSync(p).size;
      total += n;
      console.log(String(n).padStart(9), path.relative(EMBED, p));
    }
  }
};
walk(OUT);
console.log(String(total).padStart(9), "app/ total bytes");
