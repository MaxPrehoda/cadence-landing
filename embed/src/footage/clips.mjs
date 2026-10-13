// The six homepage clips. node clips.mjs [name…]   (then ./encode.sh name…)
// Every Cadence pixel is the real app (embed/app/); the agents, the voice and
// the text editor in the dictation clip are staged.
import { record, showWindow, glide, pointAt, click, sleep } from "./harness.mjs";

const wall = (size, pos) => `#wall{background-size:${size} auto !important;background-position:${pos} !important}`;
const B = (page, fn, arg) => page.evaluate(fn, arg);
const rect = (page, label, sel, last = false) => page.evaluate(([l, s, z]) => __bridge.rectIn(l, s, z), [label, sel, last]);
const engage = (page) => B(page, () => { __bridge.engaged = true; });

const CLIPS = {
  // Toolbar: a dot turns amber, the peek opens on hover, another turns green.
  toolbar: {
    width: 640, height: 400, scale: 2.5, len: 11.2,
    css: wall("200%", "66% 42%"),
    async setup(page) {
      await engage(page);
      await showWindow(page, "indicator", ".pill.agents .dot[data-agent]");
      await pointAt(page, 300, 250);
      await sleep(5000); // past the toolbar's launch priming; merge settles
    },
    async run(page, at) {
      await at(1.3);
      await B(page, () => __bridge.billingAsks());
      await at(2.4);
      const p = await rect(page, "indicator", ".pill.agents .dot[data-agent]", true);
      await glide(page, p.cx - 3, p.cy + 30, 900);
      await at(6.6);
      await B(page, () => __bridge.docsDone());
      await at(9.4);
      await glide(page, 300, 250, 1000);
    },
  },

  // Inbox: answer with 1, the take-back runs out, the next card slides in.
  inbox: {
    width: 960, height: 600, scale: 1600 / 960, len: 9.6,
    css: wall("150%", "58% 40%") + "body.record #keys{left:21%}",
    async setup(page) {
      await engage(page);
      await B(page, () => { __bridge.win["agents-popover"].h = 566; __bridge.billingAsks(); __bridge.docsDone(60_000); });
      await showWindow(page, "indicator", ".pill.agents .dot[data-agent]");
      const pop = await showWindow(page, "agents-popover", "article.card");
      // As the toolbar's Inbox button opens it (the panel mounted before the
      // question arrived, on its agents view).
      await B(page, () => __bridge.emit("panel-navigate", { view: "inbox", agent_id: null }));
      await pop.evaluate(() => window.focus());
      await pointAt(page, 300, 520);
      await sleep(4500);
    },
    async run(page, at) {
      await at(1.6);
      await B(page, () => __bridge.keys(["1"], 900));
      await page.keyboard.press("1");
      await at(6.2);
      const chip = await rect(page, "agents-popover", ".suggest .chip");
      if (chip) await glide(page, chip.cx - 10, chip.cy + 4, 900);
    },
  },

  // Talk: tap Talk and speak; then double-tap ⌥ and type a second request.
  talk: {
    width: 800, height: 500, scale: 2, len: 12,
    css: wall("170%", "62% 42%"),
    async setup(page) {
      await engage(page);
      await showWindow(page, "indicator", ".pill.agents .dot[data-agent]");
      const SAID1 = "Tell the billing one the tests are flaky on CI";
      await B(page, (said1) => {
        const b = __bridge;
        b.hooks.talkStop = () => {
          b.emit("talk-state", { phase: "transcribing" });
          b.later(380, () => b.emit("transcription", said1));
          b.later(900, () => b.routeText(said1));
        };
      }, SAID1);
      await pointAt(page, 380, 400);
      await sleep(5000);
    },
    async run(page, at) {
      const btn = await rect(page, "indicator", '[aria-label="Talk to your agents"]');
      await at(0.3);
      await glide(page, btn.cx, btn.cy, 850);
      await at(1.3);
      await click(page); // tap: start
      await at(3.4);
      await click(page); // tap: stop
      await at(3.8);
      await glide(page, 420, 400, 900);
      await at(7.0);
      await B(page, () => { __bridge.keys(["⌥", "⌥"], 800); __bridge.emit("recording-toggled", true); __bridge.show("talk", true); __bridge.emit("talk-state", { phase: "listening" }); });
      await page.frame({ name: "talk" }).evaluate(() => window.focus());
      await at(7.6);
      await page.keyboard.type("Start an agent to fix the nav deprecation in docs-site", { delay: 26 });
      await sleep(250);
      await page.keyboard.press("Enter");
    },
  },

  // Dictation: hold ⌥, the toolbar's mic listens, let go, the words land.
  dictation: {
    width: 640, height: 400, scale: 2.5, len: 10.4,
    css: wall("200%", "66% 42%") + `
      #mock-editor { display: block; left: 22px; top: 44px; width: 528px; height: 292px; border-radius: 12px; overflow: hidden;
        background: #fbfbfa; box-shadow: 0 0 0 0.5px rgba(0,0,0,.25), 0 22px 50px rgba(0,0,0,.35); font-family: "Inter", sans-serif; }
      #mock-editor .tb { height: 30px; display: flex; align-items: center; gap: 8px; padding: 0 12px; background: #ecebe9; border-bottom: 1px solid #dcdbd8; }
      #mock-editor .tb i { width: 12px; height: 12px; border-radius: 50%; display: block; }
      #mock-editor .tb b { flex: 1; text-align: center; font: 600 12.5px "Inter", sans-serif; color: #4a4946; margin-right: 52px; }
      #mock-editor .doc { padding: 18px 22px; font-size: 15px; line-height: 1.55; color: #1d1d1f; letter-spacing: -0.005em; }
      #mock-editor h3 { margin: 0 0 8px; font-size: 19px; letter-spacing: -0.015em; }
      #mock-editor p { margin: 0; }
      #mock-editor .new { background: rgba(48,128,255,.16); border-radius: 3px; transition: background 1.2s ease; }
      #mock-editor .new.settled { background: transparent; }
      #mock-editor .caret { display: inline-block; width: 1.5px; height: 1.1em; background: #1d1d1f; vertical-align: -0.17em; margin-left: 1px; animation: blink 1.05s steps(1) infinite; }
      @keyframes blink { 50% { opacity: 0; } }`,
    async setup(page) {
      await engage(page);
      await B(page, () => {
        document.getElementById("appname").textContent = "TextEdit";
        document.getElementById("mock-editor").innerHTML = `
          <div class="tb"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><b>Release notes</b></div>
          <div class="doc"><h3>Cadence 0.5</h3><p id="para">The Inbox shows one card at a time, and Talk sends what you say to the agent already on that work.<span class="caret"></span></p></div>`;
        let n = 0;
        const lines = [" Dictation runs on your Mac, so nothing you say leaves it.", " Hold Option anywhere and just talk."];
        __bridge.hooks.dictated = () => {
          const caret = document.querySelector("#mock-editor .caret");
          const s = document.createElement("span");
          s.className = "new";
          s.textContent = lines[n++ % lines.length];
          caret.before(s);
          setTimeout(() => s.classList.add("settled"), 900);
        };
      });
      await showWindow(page, "indicator", ".pill.agents .dot[data-agent]");
      await sleep(5000);
    },
    async run(page, at) {
      await at(1.0);
      await B(page, () => { __bridge.keys(["hold ⌥"], 3300); __bridge.startDictation(); });
      await at(4.3);
      await B(page, () => __bridge.stopDictation());
      await at(6.3);
      await B(page, () => { __bridge.keys(["hold ⌥"], 1900); __bridge.startDictation(); });
      await at(8.2);
      await B(page, () => __bridge.stopDictation());
    },
  },

  // Director: "What's left before I can ship?" answered from every agent's state.
  director: {
    width: 960, height: 600, scale: 1600 / 960, len: 11.5,
    css: wall("150%", "58% 40%") + "body.record #keys{left:21%}",
    async setup(page) {
      await engage(page);
      await B(page, () => {
        __bridge.win["agents-popover"].h = 566;
        __bridge.billingAsks();
        __bridge.docsDone(600_000);
        __bridge.directorText = () => [
          "Three things stand between you and shipping:",
          "",
          "1. **Billing webhooks** needs your call on duplicate Stripe events. It's first in your Inbox.",
          "2. **Auth refactor** is moving sessions to signed cookies. Tests next, about 10 minutes.",
          "3. **Flaky CI tests** found the flake and is running checkout 20 times to be sure.",
          "",
          "**Docs site upgrade** is done (one nav deprecation, not blocking). **Onboarding copy** isn't part of this release.",
        ].join("\n");
      });
      await showWindow(page, "indicator", ".pill.agents .dot[data-agent]");
      const pop = await showWindow(page, "agents-popover", ".panel");
      await B(page, () => __bridge.emit("panel-navigate", { view: "chat", agent_id: "director" }));
      await pop.waitForSelector("textarea, [contenteditable], input");
      await pop.evaluate(() => window.focus());
      await pointAt(page, -100, -100); // typed, not clicked: no pointer
      await sleep(3000);
    },
    async run(page, at) {
      const pop = page.frame({ name: "agents-popover" });
      await at(0.8);
      await pop.focus("textarea");
      await page.keyboard.type("What's left before I can ship?", { delay: 38 });
      await at(2.6);
      await B(page, () => __bridge.keys(["⏎"], 700));
      await page.keyboard.press("Enter");
    },
  },

  // Sets: put every agent away as one chip; it turns amber when one needs you.
  sets: {
    width: 640, height: 400, scale: 2.5, len: 11.6,
    css: wall("200%", "66% 42%"),
    async setup(page) {
      await engage(page);
      await B(page, () => __bridge.docsDone(600_000));
      await showWindow(page, "indicator", ".pill.agents .dot[data-agent]");
      await pointAt(page, 300, 250);
      await sleep(5000);
    },
    async run(page, at) {
      await at(0.5);
      const d = await rect(page, "indicator", ".pill.agents .dot[data-agent]", true);
      await glide(page, d.cx - 2, d.cy + 2, 900);
      await at(3.9); // peek is open (2 s hold)
      const row = await page.evaluate(() => {
        const f = __bridge.el("indicator");
        const r = f.getBoundingClientRect();
        const b = [...f.contentDocument.querySelectorAll(".agent-row.action")].find((x) => /Put away/.test(x.textContent));
        const q = b.querySelector(".line-name").getBoundingClientRect();
        return { x: r.left + q.left + 40, y: r.top + q.top + q.height / 2 };
      });
      await glide(page, row.x, row.y + 4, 700);
      await at(5.0);
      await click(page);
      await at(5.8);
      await glide(page, 330, 300, 900);
      await at(7.0);
      await B(page, () => __bridge.billingAsks());
      await at(7.7);
      const chip = await rect(page, "indicator", ".chip[data-set]");
      await glide(page, chip.cx - 2, chip.cy + 3, 800);
      // Opening the set brings its agents (and their windows) back.
      await at(9.2);
      await click(page);
      await at(9.9);
      await glide(page, 330, 300, 1000);
    },
  },
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS);
for (const n of names) await record(n, CLIPS[n]);
