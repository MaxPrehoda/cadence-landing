// The stage's fake backend. Every Cadence window on this little desktop
// (toolbar, panel, Talk) is an <iframe> of the real app page from ./app/;
// app/tauri-shim.js gives each one a __TAURI_INTERNALS__ that forwards
// invokes and event subscriptions here, so the windows share one backend the
// way the real windows share the Rust side. Agents, their replies and the
// routing are scripted; every pixel of Cadence UI is the app's own.
//
// Grown out of the footage harness bridge; the clip recorders in
// embed/src/footage/ drive this same stage with ?record.
(() => {
  const MB = 24, EDGE = 8, GAP = 10, RIGHT = 6;
  const params = new URLSearchParams(location.search);
  const RECORD = params.has("record");
  const B = (window.__bridge = {});
  const frames = {};
  B.frames = frames;
  B.calls = [];
  B.engaged = false;
  B.record = RECORD;

  const clone = (win, v) => (v === undefined || v === null ? null : win.JSON.parse(JSON.stringify(v)));
  const timers = new Set();
  const later = (ms, fn) => {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
    return t;
  };
  const sleep = (ms) => new Promise((r) => later(ms, r));
  B.later = later;

  // ── frames and events ──────────────────────────────────────────────
  B.attach = (label, win) => {
    frames[label] = { win, listeners: new Map() };
    // The toolbar folds into a notch when idle (0.5.3). Mid-fold its window
    // spans the bar plus the app's 16px gap to the edge (INDICATOR_SIDE_CLEARANCE)
    // and sits flush on it; the stage keeps its toolbar RIGHT px off the edge,
    // so the bar is padded in by the difference and does not jump as it folds.
    if (label === "indicator") {
      const st = win.document.createElement("style");
      const pad = 16 - RIGHT;
      st.textContent = `.wrap:is([data-fold="folding"],[data-fold="unfolding"])[data-anchor="right"]{padding-left:${pad}px}`
        + `.wrap:is([data-fold="folding"],[data-fold="unfolding"])[data-anchor="left"]{padding-right:${pad}px}`;
      win.document.head.appendChild(st);
    }
  };
  B.listen = (label, event, id, fn) => {
    const f = frames[label];
    if (!f || !fn) return;
    if (!f.listeners.has(event)) f.listeners.set(event, new Map());
    f.listeners.get(event).set(id, fn);
  };
  B.unlisten = (label, event, id) => frames[label]?.listeners.get(event)?.delete(id);
  B.emit = (event, payload, only) => {
    for (const [label, f] of Object.entries(frames)) {
      if (only && only !== label) continue;
      const ls = f.listeners.get(event);
      if (!ls) continue;
      for (const [id, fn] of [...ls]) {
        try { fn(clone(f.win, { event, payload, id })); } catch (e) { console.error("[bridge] listener", event, e); }
      }
    }
  };

  // ── the scenario's agents ──────────────────────────────────────────
  const HOME = "/Users/max/Developer";
  function freshState() {
    const now = Date.now();
    return {
      native: [
        {
          id: "auth", kind: "standalone", display_name: "Auth refactor",
          config: { name: "auth-refactor", display_name: "Auth refactor", working_dir: `${HOME}/shop/api`, kind: "standalone" },
          status: "Running", session_id: "c-auth", total_cost_usd: 0.42, last_activity: now - 15_000, message_count: 18,
          output_lines: [], current_activity: "Editing session.ts",
          last_user_turn: "Move auth off localStorage tokens and onto signed cookies",
          last_assistant_message: "Swapping the token helpers for cookie-based sessions now.",
          spawned_at: now - 2_400_000,
        },
        {
          id: "billing", kind: "standalone", display_name: "Billing webhooks",
          config: { name: "billing-webhooks", display_name: "Billing webhooks", working_dir: `${HOME}/shop/billing`, kind: "standalone" },
          status: "Running", session_id: "c-billing", total_cost_usd: 0.31, last_activity: now - 40_000, message_count: 11,
          output_lines: [], current_activity: "Writing the webhook handler",
          last_user_turn: "Handle the Stripe subscription webhooks.",
          last_assistant_message: "The handler is in. One decision before I write the retry path.",
          spawned_at: now - 1_900_000,
        },
        {
          id: "director", kind: "director", display_name: "Director",
          config: { name: "director", display_name: "Director", working_dir: "/Users/max", kind: "director" },
          status: "Idle", session_id: "c-dir", total_cost_usd: 0.04, last_activity: now - 3_600_000, message_count: 0,
          output_lines: [], spawned_at: now - 7_200_000,
        },
      ],
      herdr: [
        { pane_id: "w2:p1", workspace: "shop/web", label: "Flaky CI tests", kind: "codex", status: "working", cwd: `${HOME}/shop/web`, machine: "local",
          last_lines: ["› Find out why the checkout tests flake on CI", "• Running vitest --repeat 20"], question: null, updated_at: now - 9_000 },
        { pane_id: "w3:p1", workspace: "docs-site", label: "Docs site upgrade", kind: "amp", status: "working", cwd: `${HOME}/docs-site`, machine: "local",
          last_lines: ["› Upgrade the docs site to Next 15", "✻ Working…"], question: null, updated_at: now - 25_000 },
        { pane_id: "w4:p1", workspace: "shop/web", label: "Onboarding copy", kind: "gemini", status: "working", cwd: `${HOME}/shop/web`, machine: "local",
          last_lines: ["› Rewrite the onboarding emails in a warmer voice", "✻ Working…"], question: null, updated_at: now - 4_000 },
      ],
      buffers: {
        auth: [
          "> Move auth off localStorage tokens and onto signed cookies",
          "I'll start with where tokens are read and written.",
          '[tool_use:Grep] {"pattern":"localStorage","path":"src/auth"}',
          "[tool_result] src/auth/session.ts:14\nsrc/auth/client.ts:31",
          "Two places. Swapping the token helpers for cookie-based sessions now.",
          '[tool_use:Edit] {"file_path":"/Users/max/Developer/shop/api/src/auth/session.ts"}',
        ],
        billing: [
          "> Handle the Stripe subscription webhooks.",
          '[tool_use:Write] {"file_path":"/Users/max/Developer/shop/billing/src/webhooks.ts"}',
          "[tool_result] File created.",
          "The handler is in. One decision before I write the retry path.",
        ],
        director: [],
      },
      meta: {},
      sets: { sets: [], last_used: { kind: "claude", cwd: `${HOME}/shop`, at: Math.floor(now / 1000) } },
      panelView: "inbox",
      anchor: "right",
    };
  }
  let S = (B.state = freshState());
  const nat = (id) => S.native.find((a) => a.id === id);
  const her = (pane) => S.herdr.find((a) => a.pane_id === pane);
  const changed = () => { B.emit("agent-updated", {}); renderTerms(); };
  const herdrChanged = () => { B.emit("herdr-agents-changed", S.herdr); renderTerms(); };

  // ── scripted moments (also driven by the footage recorders) ───────
  B.billingAsks = () => {
    const b = nat("billing");
    b.status = "WaitingApproval";
    b.current_activity = undefined;
    b.last_activity = Date.now();
    b.pending_approval = {
      request_id: "q-billing-1", session_id: "billing", tool_name: "AskUserQuestion", summary: "",
      requested_at: Date.now() - 60_000,
      tool_input: { questions: [{
        header: "Duplicates", multiSelect: false,
        question: "Stripe retries can arrive out of order. How should I handle duplicates?",
        options: [
          { label: "Idempotency key per event (Recommended)", description: "Store each event.id, skip any already handled" },
          { label: "Lock the row while processing", description: "Serialize updates per subscription" },
          { label: "Ignore and log them", description: "Process every delivery, log the repeats" },
        ],
      }] },
    };
    B.emit("agent-approval-requested", { session_id: "billing" });
    changed();
  };
  B.docsDone = (ago = 0) => {
    const d = her("w3:p1");
    d.status = "done";
    d.updated_at = Date.now() - ago;
    d.last_lines = [
      "› Upgrade the docs site to Next 15",
      "⏺ Upgraded to Next 15.2 and the build is green. One deprecation is left in the nav (next/link legacyBehavior). Want me to fix it now?",
    ];
    S.meta["herdr:w3:p1"] = { recap: "Next 15.2, build green. One deprecation left in the nav.", updated_at: Date.now() };
    herdrChanged();
    B.emit("agent-meta-changed", {});
  };
  B.authAsks = () => {
    const a = nat("auth");
    a.status = "WaitingApproval";
    a.current_activity = undefined;
    a.last_activity = Date.now();
    a.last_assistant_message = "Sessions are on signed cookies now. I'd like to run the auth tests before I touch the login form.";
    a.pending_approval = {
      request_id: "q-auth-1", session_id: "auth", tool_name: "Bash", summary: "pnpm test src/auth",
      requested_at: Date.now(), tool_input: { command: "pnpm test src/auth", description: "Run the auth tests" },
    };
    S.buffers.auth.push("[tool_result] The file has been updated.", a.last_assistant_message);
    B.emit("agent-approval-requested", { session_id: "auth" });
    changed();
  };
  B.flakyDone = () => {
    const h = her("w2:p1");
    h.status = "done";
    h.updated_at = Date.now();
    h.last_lines = [
      "› Find out why the checkout tests flake on CI",
      "⏺ Found it: the checkout tests shared one Stripe mock across workers. It is per worker now and 20 of 20 runs pass. Want me to open a PR?",
    ];
    S.meta["herdr:w2:p1"] = { recap: "A shared Stripe mock between workers. Fixed, 20/20 green.", updated_at: Date.now() };
    herdrChanged();
    B.emit("agent-meta-changed", {});
  };
  B.addHerdr = (h) => {
    S.herdr.push({ machine: "local", question: null, updated_at: Date.now(), ...h });
    herdrChanged();
  };
  function nativeFinish(id, message, ms) {
    later(ms, () => {
      const a = nat(id);
      if (!a || a.pending_approval) return;
      a.status = "Completed";
      a.current_activity = undefined;
      a.last_assistant_message = message;
      a.message_count += 1;
      a.last_activity = Date.now();
      S.buffers[id]?.push(message);
      B.emit("session-status-change", { session_id: id, status: "Completed" });
      changed();
    });
  }
  function herdrWork(pane, text, doneLine, recap, ms = 7000) {
    const h = her(pane);
    if (!h) return;
    h.status = "working";
    h.updated_at = Date.now();
    h.last_lines = [`› ${text}`, "✻ Working…"];
    herdrChanged();
    if (!doneLine) return;
    later(ms, () => {
      h.status = "done";
      h.updated_at = Date.now();
      h.last_lines = [`› ${text}`, `⏺ ${doneLine}`];
      if (recap) S.meta[`herdr:${pane}`] = { recap, updated_at: Date.now() };
      herdrChanged();
      B.emit("agent-meta-changed", {});
    });
  }

  // A reply streaming into a native thread, as the Rust side sends it.
  async function streamTurn(id, prompt, reply, { tool = null, activity = "Thinking" } = {}) {
    const a = nat(id);
    if (!a) return;
    const buf = (S.buffers[id] ??= []);
    buf.push(`> ${prompt}`);
    a.status = "Running";
    a.current_activity = activity;
    a.last_user_turn = prompt;
    a.message_count += 1;
    a.last_activity = Date.now();
    B.emit("session-output", { session_id: id, text: `> ${prompt}`, content_type: "user_prompt", is_partial: false });
    B.emit("session-status-change", { session_id: id, status: "Running" });
    changed();
    await sleep(500);
    if (tool) {
      B.emit("session-output", { session_id: id, text: tool.name, content_type: "tool_start", tool_name: tool.name, is_partial: true });
      await sleep(450);
      buf.push(`[tool_use:${tool.name}] ${JSON.stringify(tool.input)}`);
      B.emit("session-output", { session_id: id, text: tool.name, content_type: "tool_use", tool_name: tool.name, tool_input: tool.input, is_partial: true });
      await sleep(650);
      buf.push(`[tool_result] ${tool.result}`);
      B.emit("session-output", { session_id: id, text: tool.result, content_type: "tool_result", is_partial: true });
      await sleep(300);
    }
    B.emit("session-status-change", { session_id: id, status: "Streaming" });
    for (const chunk of reply.match(/[\s\S]{1,5}/g) ?? []) {
      B.emit("session-output", { session_id: id, text: chunk, content_type: "text_delta", is_partial: true });
      await sleep(16);
    }
    buf.push(reply);
    B.emit("session-output", { session_id: id, text: reply, content_type: "text", is_partial: false });
    a.status = "Completed";
    a.current_activity = undefined;
    a.last_assistant_message = reply;
    a.message_count += 1;
    a.last_activity = Date.now();
    B.emit("session-status-change", { session_id: id, status: "Completed" });
    changed();
  }

  const label = (x) => x.display_name ?? x.label;
  function directorReply() {
    const lines = [];
    const doneList = [];
    for (const a of S.native) {
      if (a.kind === "director") continue;
      if (a.pending_approval) lines.push(`**${label(a)}** is waiting on you: ${a.id === "billing" ? "how to handle duplicate Stripe events" : `it wants to run \`${a.pending_approval.tool_input?.command ?? "a command"}\``}.`);
      else if (a.status === "Running") lines.push(`**${label(a)}** is still on it: ${(a.current_activity ?? "working").replace(/^./, (c) => c.toLowerCase())}.`);
      else doneList.push(label(a));
    }
    for (const h of S.herdr) {
      if (h.status === "working") lines.push(`**${h.label}** is still running${h.pane_id === "w2:p1" ? " the checkout tests 20 times over" : ""}.`);
      else if (h.status === "blocked") lines.push(`**${h.label}** is waiting on you.`);
      else doneList.push(h.label + (h.pane_id === "w3:p1" && S.meta["herdr:w3:p1"]?.recap?.includes("deprecation") ? " (one nav deprecation left)" : ""));
    }
    const head = lines.length ? `${lines.length === 1 ? "One thing" : `${["", "", "Two", "Three", "Four", "Five"][lines.length] ?? lines.length} things`} before you can ship:` : "Nothing. Everything is done and green.";
    return [head, "", ...lines.map((l, i) => `${i + 1}. ${l}`), ...(doneList.length ? ["", `Done: ${doneList.map((d) => `**${d}**`).join(", ")}.`] : [])].join("\n");
  }
  B.directorAsk = (prompt) => {
    const tool = { name: "mcp__cadence-agents__list_agents", input: {}, result: "Cadence agents: 5 (2 native, 3 herdr)" };
    return streamTurn("director", prompt, B.directorText?.(prompt) ?? directorReply(), { tool, activity: "Checking on every agent" });
  };

  // ── Talk routing (keyword match; else a new agent) ─────────────────
  const ROUTES = [
    [/\b(bill|billing|webhooks?|stripe|payments?|refunds?)\b/, "billing"],
    [/\b(auth|login|cookies?|sessions?|tokens?|sign[- ]?in)\b/, "auth"],
    [/\b(flak\w*|ci|checkout tests?|vitest)\b/, "herdr:w2:p1"],
    [/\b(docs?|next(\.js)?|nav|deprecations?)\b/, "herdr:w3:p1"],
    [/\b(onboarding|emails?|copy|welcome)\b/, "herdr:w4:p1"],
  ];
  const STOP = new Set("a an the to in on for of and or with my our this that it please can you could would start new agent spin up kick off make add fix get have let lets me".split(" "));
  function folderFor(t) {
    if (/\bdocs?(-site)?\b/.test(t)) return ["~/Developer/docs-site", `${HOME}/docs-site`];
    if (/\b(api|server|backend|database|db)\b/.test(t)) return ["~/Developer/shop/api", `${HOME}/shop/api`];
    if (/\b(web|page|ui|css|button|landing|frontend|site)\b/.test(t)) return ["~/Developer/shop/web", `${HOME}/shop/web`];
    return ["~/Developer/shop", `${HOME}/shop`];
  }
  let spawnSeq = 5;
  function routeText(text) {
    const t = text.toLowerCase();
    B.emit("talk-state", { phase: "routing", text });
    const startNew = /^\s*(start|spin up|kick off|new agent|create an agent|launch)\b/.test(t);
    const question = /\?\s*$/.test(t) || /^\s*(what|what's|whats|how|why|when|who|which|is|are|did|does|status)\b/.test(t);
    const hit = startNew ? null : ROUTES.find(([re]) => re.test(t));
    if (!startNew && !hit && question) {
      later(900, () => {
        B.emit("talk-receipt", { phase: "director", target: "Director", text });
        B.show("agents-popover", true);
        B.emit("panel-navigate", { view: "chat", agent_id: "director" });
        later(250, () => B.directorAsk(text));
      });
      return;
    }
    if (hit) {
      const id = hit[1];
      later(1100, () => {
        if (id.startsWith("herdr:")) {
          const h = her(id.slice(6));
          herdrWork(h.pane_id, text);
          B.emit("talk-receipt", { phase: "sent", target: h.label, thread: null, text });
        } else {
          const a = nat(id);
          a.status = "Running";
          a.pending_approval = undefined;
          a.current_activity = "Reading your note";
          a.message_count += 1;
          a.last_activity = Date.now();
          S.buffers[id].push(`> ${text}`);
          changed();
          B.emit("talk-receipt", { phase: "sent", target: a.display_name, thread: null, text });
        }
      });
      return;
    }
    const words = t.replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w) && !/^(docs-site|shop|web|api)$/.test(w));
    const name = words.slice(0, 3).join("-") || `claude-${spawnSeq}`;
    const [folder, cwd] = folderFor(t);
    later(800, () => B.emit("talk-state", { phase: "starting", text, target: name, folder }));
    later(1750, () => {
      const pane = `w${spawnSeq++}:p1`;
      B.addHerdr({ pane_id: pane, workspace: folder.split("/").pop(), label: name, kind: "claude", status: "working", cwd, last_lines: [`› ${text}`, "✻ Working…"] });
      B.emit("talk-receipt", { phase: "started", target: name, folder, text });
    });
  }
  B.routeText = routeText;

  // ── dictation (the toolbar mic, V in the panel) ────────────────────
  let dictating = null;
  B.hooks = {};
  function startDictation() {
    if (dictating) return;
    dictating = { at: Date.now() };
    // 0.5.3 folds an idle toolbar even while the mic is live; the stage
    // counts dictating as using it, so the mic stays on screen.
    B.emit("probe-toolbar-notch", false, "indicator");
    B.emit("mode-change", "dictation");
    B.emit("recording-toggled", true);
    B.emit("transcription-status", "listening");
    if (!RECORD) dictating.timer = later(2600, stopDictation);
  }
  function stopDictation() {
    if (!dictating) return;
    clearTimeout(dictating.timer);
    dictating = null;
    B.emit("transcription-status", "processing");
    later(RECORD ? 900 : 700, () => {
      B.emit("recording-toggled", false);
      B.emit("transcription-status", "ready");
      B.emit("mode-change", "idle");
      if (B.hooks.dictated) return B.hooks.dictated();
      // The words land wherever the caret is, as the real paste does.
      const pop = frames["agents-popover"]?.win;
      const el = pop?.document.activeElement;
      if (el && el.matches?.("input, textarea")) {
        const card = pop.document.querySelector(".card .name")?.textContent ?? "";
        const text = /billing/i.test(card) ? "Idempotency key, and log the repeats we skip" : /auth/i.test(card) ? "Yes, run them" : "Yes, go ahead";
        el.focus();
        pop.document.execCommand("insertText", false, text);
      }
    });
  }
  B.startDictation = startDictation;
  B.stopDictation = stopDictation;

  // ── terminals: where the agents actually run ───────────────────────
  // The live demo opens on the problem: agents in their own terminals, one
  // of them stopped on a question nobody is looking at. Cadence never draws
  // these windows (they stand in for Ghostty, Terminal, herdr); what they
  // show follows the same agent state the real Cadence windows read, so an
  // answer given in the Inbox lands back in the right terminal.
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const SPIN = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];
  const RESULT = {
    "File created.": "Wrote 84 lines to src/webhooks.ts",
  };
  const T = (B.term = {});
  function termReset() {
    const now = Date.now();
    T.billing = { title: "claude", path: "~/shop/billing", reveal: 3, since: now - 74_000, count: 0, answered: null };
    T.flaky = { title: "codex", path: "~/shop/web", since: now - 38_000, count: 0, log: [], seen: new Set(), status: "working" };
  }
  termReset();
  const termEl = (k) => document.getElementById(`term-${k}`);

  function claudeLines() {
    const a = nat("billing");
    if (!a) return [];
    const out = [];
    for (const raw of S.buffers.billing.slice(0, T.billing.reveal)) {
      if (raw.startsWith("> ")) {
        const text = raw.slice(2);
        const ans = T.billing.answered;
        if (ans && text === ans.answer) {
          out.push(`<div class="l b"><span class="ok">⏺</span> User answered Claude's questions:</div>`);
          out.push(`<div class="l sub"><span class="dim">⎿</span>  · ${esc(ans.question)} <span class="dim">→</span> <b>${esc(text)}</b></div>`);
        } else out.push(`<div class="l u">&gt; ${esc(text)}</div>`);
      } else if (raw.startsWith("[tool_use:")) {
        const m = raw.match(/^\[tool_use:(\w+)\]\s*(.*)$/);
        let arg = "";
        try { const j = JSON.parse(m[2]); arg = String(j.file_path ?? j.command ?? j.pattern ?? "").replace(/^.*\/shop\/[\w-]+\//, ""); } catch {}
        out.push(`<div class="l b"><span class="ok">⏺</span> <b>${esc(m[1] === "Edit" ? "Update" : m[1])}</b>(${esc(arg)})</div>`);
      } else if (raw.startsWith("[tool_result]")) {
        const r = raw.slice(14).split("\n")[0];
        out.push(`<div class="l sub"><span class="dim">⎿  ${esc(RESULT[r] ?? r)}</span></div>`);
      } else {
        out.push(`<div class="l b"><span class="txt">⏺</span> ${esc(raw)}</div>`);
      }
    }
    const q = a.pending_approval?.tool_input?.questions?.[0];
    if (q && T.billing.reveal >= S.buffers.billing.length) {
      out.push(`<div class="qbox"><div class="qh"><span class="chip">☐ ${esc(q.header ?? "Question")}</span></div>`
        + `<div class="qq">${esc(q.question)}</div>`
        + q.options.map((o, i) => `<div class="qo${i ? "" : " sel"}">${i ? "&nbsp;" : "❯"} ${i + 1}. ${esc(o.label)}</div>`
          + (o.description ? `<div class="qd">${esc(o.description)}</div>` : "")).join("")
        + `<div class="qf">Enter to select · ↑/↓ to navigate · Esc to cancel</div></div>`);
    } else if (a.pending_approval) {
      // A permission prompt (Bash and friends) as Claude Code draws it.
      const cmd = a.pending_approval.tool_input?.command ?? a.pending_approval.summary;
      out.push(`<div class="qbox"><div class="qq"><b>Bash command</b></div><div class="qq">  ${esc(cmd)}</div>`
        + `<div class="qq">Do you want to proceed?</div><div class="qo sel">❯ 1. Yes</div><div class="qo">&nbsp; 2. Yes, and don't ask again for this command</div><div class="qo">&nbsp; 3. No, and tell Claude what to do differently</div></div>`);
    } else {
      if (a.status === "Running" || a.status === "Streaming") {
        out.push(`<div class="l spin"><span class="acc g">✻</span> <span class="acc">${esc(a.current_activity ?? "Thinking")}…</span> <span class="dim">(<span class="s" data-since="${T.billing.since}">0s</span> · esc to interrupt)</span></div>`);
      }
      out.push(`<div class="prompt">&gt; <span class="cur"></span></div><div class="l dim foot">? for shortcuts</div>`);
    }
    return out;
  }

  function codexLines() {
    const h = her("w2:p1");
    if (!h) return [];
    const st = T.flaky;
    for (const raw of h.last_lines ?? []) {
      if (/^✻/.test(raw) || st.seen.has(raw)) continue;
      st.seen.add(raw);
      if (raw === "› Find out why the checkout tests flake on CI" || raw === "• Running vitest --repeat 20") continue;
      if (raw.startsWith("› ")) st.log.push(`<div class="l u">› ${esc(raw.slice(2))}</div>`);
      else st.log.push(`<div class="l b"><span class="txt">•</span> ${esc(raw.replace(/^[⏺•]\s*/, ""))}</div>`);
    }
    if (h.status !== st.status) {
      if (h.status === "working") st.since = Date.now();
      else st.log.push(`<div class="l dim rule">─ Worked for ${Math.max(1, Math.round((Date.now() - st.since) / 1000) + 120)}s ─</div>`);
      st.status = h.status;
    }
    const out = [
      `<div class="l u">› Find out why the checkout tests flake on CI</div>`,
      `<div class="l b"><span class="txt">•</span> Explored</div>`,
      `<div class="l sub"><span class="dim">└ Read checkout.test.ts, stripe-mock.ts, vitest.config.ts</span></div>`,
      `<div class="l b"><span class="txt">•</span> Ran <b>pnpm vitest run checkout --repeat 20</b></div>`,
      `<div class="l sub"><span class="dim">└ 17 passed · 3 failed (timeout in stripe-mock.ts)</span></div>`,
      ...st.log,
    ];
    if (h.status === "working") out.push(`<div class="l spin"><span class="dim g2">◦</span> <span class="shim">Working</span> <span class="dim">(<span class="s" data-since="${st.since}">0s</span> • esc to interrupt)</span></div>`);
    out.push(`<div class="prompt">› <span class="cur"></span></div>`);
    return out;
  }

  function renderTerms() {
    for (const [k, lines] of [["billing", claudeLines], ["flaky", codexLines]]) {
      const box = termEl(k);
      if (!box) continue;
      const html = lines();
      const body = box.querySelector(".body");
      const prev = T[k].count;
      body.innerHTML = html.join("");
      // Only the lines that weren't there before fade in.
      const kids = body.children;
      for (let i = Math.min(prev, kids.length); i < kids.length; i++) kids[i].classList.add("new");
      T[k].count = html.length;
      box.classList.toggle("asking", k === "billing" && !!nat("billing")?.pending_approval && T.billing.reveal >= S.buffers.billing.length);
    }
    tick();
  }
  let spinFrame = 0;
  function tick() {
    const now = Date.now();
    document.querySelectorAll(".term .spin .g").forEach((g) => { g.textContent = SPIN[spinFrame % SPIN.length]; });
    document.querySelectorAll(".term .spin .s").forEach((s) => {
      const secs = Math.max(0, Math.round((now - Number(s.dataset.since)) / 1000));
      s.textContent = secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
    });
  }
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ticker = null;
  function runTicker(on) {
    clearInterval(ticker);
    ticker = on ? setInterval(() => { spinFrame++; tick(); }, REDUCE ? 1000 : 120) : null;
  }

  function placeTerms() {
    const compact = B.desk.w < 700;
    const at = compact
      ? { billing: { x: 12, y: 34, w: 428, h: 300 }, flaky: { x: 12, y: 346, w: 428, h: 290 } }
      : { billing: { x: 26, y: 40, w: 500, h: 318 }, flaky: { x: 96, y: 370, w: 452, h: 226 } };
    for (const k of ["billing", "flaky"]) {
      const e = termEl(k);
      if (!e) continue;
      const r = at[k];
      Object.assign(e.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    }
  }
  function buildTerms() {
    if (RECORD || termEl("billing")) return;
    const stage = document.getElementById("stage");
    const before = document.querySelector('iframe[name="agents-popover"]');
    for (const k of ["flaky", "billing"]) {
      const d = document.createElement("div");
      d.className = "term";
      d.id = `term-${k}`;
      d.setAttribute("aria-hidden", "true");
      d.innerHTML = `<div class="tb"><i></i><i></i><i></i><b><span class="who">${T[k].title}</span> · ${T[k].path}</b></div><div class="body"></div>`;
      stage.insertBefore(d, before);
    }
    placeTerms();
  }

  // ── the story: agents ask → you answer in a keystroke → it lands back ──
  // Plays once when the stage comes on screen. Touching the demo skips to
  // the Inbox and hands over the keys; nobody touching it sees the whole
  // thing, with the stage pressing 1 itself. The page around the embed
  // shows the chapters (postMessage "chapter") and can jump or pause.
  const AUTO_MS = 6500;
  const story = { ch: 0, timers: [], visible: false, paused: false, pendingAuto: false };
  B.story = story;
  const sLater = (ms, fn) => { const t = later(ms, fn); story.timers.push(t); return t; };
  function storyClear() { for (const t of story.timers) clearTimeout(t); story.timers = []; }
  function chapter(n, ms = 0) {
    story.ch = n;
    document.body.dataset.ch = String(n);
    if (window.parent !== window) {
      try { window.parent.postMessage({ type: "cadence-embed", event: "chapter", chapter: n, ms: story.paused ? 0 : ms, paused: story.paused }, "*"); } catch {}
    }
  }
  function storyStart() {
    if (RECORD || story.ch !== 0 || story.paused) return;
    chapter(1, 4800);
    sLater(1300, () => {
      const a = nat("billing");
      T.billing.reveal = 99;
      if (a && !a.pending_approval) { a.current_activity = "Thinking"; T.billing.since = Date.now() - 2000; }
      changed();
    });
    sLater(2600, () => B.billingAsks());
    sLater(4800, toInbox);
  }
  function toInbox() {
    if (story.ch >= 2) return;
    storyClear();
    T.billing.reveal = 99;
    if (!nat("billing")?.pending_approval && !T.billing.answered) B.billingAsks();
    // Docs finishes behind the question, so the Inbox reads "1 of 2" with the
    // question first (a finished card that is current while the panel mounts
    // counts as seen and is cleared).
    if (her("w3:p1")?.status !== "done") B.docsDone(40_000);
    B.show("agents-popover", true);
    B.emit("panel-navigate", { view: "inbox", agent_id: null });
    renderTerms();
    const auto = !B.engaged && !story.paused;
    chapter(2, auto ? AUTO_MS : 0);
    if (auto) sLater(AUTO_MS, autoAnswer);
  }
  function pressKey(key) {
    const w = frames["agents-popover"]?.win;
    if (!w) return;
    B.keys([key], 900);
    (w.document.activeElement ?? w.document.body).dispatchEvent(new w.KeyboardEvent("keydown", { key, code: `Digit${key}`, bubbles: true, cancelable: true }));
  }
  function autoAnswer(force = false) {
    if (story.ch !== 2 || (!force && (B.engaged || story.paused))) return;
    if (!force && !story.visible) { story.pendingAuto = true; return; }
    story.pendingAuto = false;
    pressKey("1");
  }
  // resolve_approval for billing: the answer is on its way to the terminal.
  function landed() {
    if (RECORD || story.ch >= 3) return;
    storyClear();
    chapter(3, 0);
    if (B.desk.w < 700) {
      // The compact desktop has no room beside the panel: step it aside so
      // the terminal shows the answer arriving, then bring it back.
      B.show("agents-popover", false);
      sLater(4200, () => { B.show("agents-popover", true); B.emit("panel-navigate", { view: "inbox", agent_id: null }); });
    }
    startScenario();
  }
  B.goChapter = (n) => {
    story.paused = false;
    runTicker(true);
    if (n <= 1) { reset(); return; }
    if (story.ch < 2) toInbox();
    if (n >= 3 && story.ch === 2) pressKey("1");
    else chapter(story.ch, 0);
  };
  B.pauseStory = (on) => {
    story.paused = on;
    if (on) storyClear();
    runTicker(!on);
    if (!on) {
      if (story.ch === 0) storyStart();
      else if (story.ch === 1) { sLater(1200, toInbox); }
      else if (story.ch === 2 && !B.engaged) { sLater(AUTO_MS, autoAnswer); return chapter(2, AUTO_MS); }
    }
    chapter(story.ch, 0);
  };
  function watchVisible() {
    const st = document.getElementById("stage");
    if (!st || !("IntersectionObserver" in window)) { story.visible = true; return; }
    new IntersectionObserver((es) => {
      for (const e of es) {
        story.visible = e.isIntersecting;
        if (!story.visible) continue;
        if (story.ch === 0) sLater(500, storyStart);
        if (story.pendingAuto) sLater(1500, () => autoAnswer());
      }
    }, { threshold: 0.55 }).observe(st);
  }

  // ── windows on the desktop ─────────────────────────────────────────
  const W = (B.win = {
    indicator: { w: 64, h: 380, shown: true },
    "agents-popover": { w: 420, h: 600, shown: true },
    talk: { w: 640, h: 96, shown: false },
  });
  B.desk = { w: 1040, h: 650 };
  const el = (l) => document.querySelector(`iframe[name="${l}"]`);
  B.el = el;
  B.isShown = (l) => !!W[l]?.shown;
  B.layout = () => {
    const vw = B.desk.w, vh = B.desk.h;
    const ind = W.indicator;
    const anchor = S.anchor;
    const side = anchor === "left" || anchor === "right";
    const off = side && ind.flush ? 0 : RIGHT;
    const ix = anchor === "right" ? vw - off - ind.w : anchor === "left" ? off : (vw - ind.w) / 2;
    const iy = side ? MB + (vh - MB) / 2 - ind.h / 2 : anchor === "top" ? MB + RIGHT : vh - RIGHT - ind.h;
    place("indicator", ix, iy, ind.w, ind.h);
    const pop = W["agents-popover"];
    const rest = side ? Math.min(ind.restW ?? ind.w, 64) : Math.min(ind.h, 64);
    let px = anchor === "left" ? RIGHT + rest + GAP : vw - RIGHT - (side ? rest : 0) - GAP - pop.w;
    let py = side ? iy + ind.h / 2 - pop.h / 2 : anchor === "top" ? MB + RIGHT + rest + GAP : vh - RIGHT - rest - GAP - pop.h;
    // Under or over a top/bottom bar the panel gets what height is left.
    const top = anchor === "top" ? MB + RIGHT + rest + GAP : MB + EDGE;
    const bottom = anchor === "bottom" ? vh - RIGHT - rest - GAP : vh - EDGE;
    const ph = Math.min(pop.h, bottom - top);
    if (!side) py = anchor === "top" ? top : bottom - ph;
    px = Math.max(EDGE, Math.min(vw - pop.w - EDGE, px));
    py = Math.max(top, Math.min(bottom - ph, py));
    place("agents-popover", px, py, pop.w, ph);
    const t = W.talk;
    const tx = t.x ?? (vw - t.w) / 2;
    place("talk", tx, t.y ?? MB + (vh - MB) * 0.42 - t.h / 2, t.w, t.h);
    placeTerms();
  };
  function place(l, x, y, w, h) {
    const f = el(l);
    if (!f) return;
    Object.assign(f.style, { left: `${Math.round(x)}px`, top: `${Math.round(y)}px`, width: `${w}px`, height: `${h}px` });
    f.classList.toggle("hidden", !W[l].shown);
  }
  B.show = (l, on = true) => {
    const was = W[l].shown;
    W[l].shown = on;
    B.layout();
    if (was !== on) {
      try { frames[l]?.win.document.dispatchEvent(new Event("visibilitychange")); } catch {}
    }
  };

  // ── commands ───────────────────────────────────────────────────────
  B.invoke = async (lbl, cmd, args) => {
    B.calls.push({ label: lbl, cmd, args });
    switch (cmd) {
      case "list_agents":
        return S.native.filter((a) => a.kind !== "director").map((a) => ({ ...a, output_lines: (S.buffers[a.id] ?? []).slice(-1) }));
      case "director_info": {
        const d = nat("director");
        return { ...d, output_lines: S.buffers.director };
      }
      case "list_pending_approvals":
        return S.native.filter((s) => s.pending_approval).map((s) => s.pending_approval);
      case "get_agent_detail": {
        const a = nat(args.id);
        if (!a) throw new Error("Agent not found");
        return { info: a, output_buffer: S.buffers[args.id] ?? [] };
      }
      case "agent_meta":
        return S.meta;
      case "herdr_list_agents":
        return S.herdr;
      case "herdr_agent_read":
        return her(args.paneId)?.last_lines ?? [];
      case "herdr_status":
        return { installed: true, version: "0.9.3", server_running: true, socket: "~/.config/herdr/herdr.sock", error: null };
      case "sets_list":
      case "sets_prune":
        return S.sets;
      case "sets_put_away": {
        for (const x of S.sets.sets) x.open = false;
        const ids = (args.loose ?? []).map((m) => m.id);
        if (ids.length) S.sets.sets.push({ id: `set-${S.sets.sets.length + 1}`, name: "shop", folder: `${HOME}/shop`, members: ids, open: false, opened_at: 0, tabs: [] });
        B.emit("sets-changed", S.sets);
        return S.sets;
      }
      case "set_open":
      case "set_close": {
        const x = S.sets.sets.find((y) => y.id === args.id);
        if (x) { x.open = cmd === "set_open"; if (x.open) x.opened_at = Math.floor(Date.now() / 1000); }
        B.emit("sets-changed", S.sets);
        return S.sets;
      }
      case "set_rename": {
        const x = S.sets.sets.find((y) => y.id === args.id);
        if (x) x.name = args.name;
        B.emit("sets-changed", S.sets);
        return S.sets;
      }
      case "sets_adopt":
      case "sets_forget":
        return S.sets;
      case "sets_end_agent":
      case "sets_end_agents": {
        // End one agent, or End all (0.5.3): every agent the toolbar lists.
        const ids = (cmd === "sets_end_agents" ? args.ids ?? [] : [args.id]).map(String);
        const gone = (id) => ids.includes(id);
        S.herdr = S.herdr.filter((h) => !gone(`herdr:${h.pane_id}`));
        S.native = S.native.filter((a) => !gone(a.id));
        for (const x of S.sets.sets) x.members = x.members.filter((m) => !gone(m));
        S.sets.sets = S.sets.sets.filter((x) => x.members.length);
        herdrChanged();
        changed();
        B.emit("sets-changed", S.sets);
        return S.sets;
      }
      case "quick_new_agent": {
        const pane = `w${spawnSeq++}:p1`;
        B.addHerdr({ pane_id: pane, workspace: "shop", label: `claude-${spawnSeq - 1}`, kind: args.kind || "claude", status: "working", cwd: `${HOME}/shop`, last_lines: ["✻ Ready"] });
        return `claude-${spawnSeq - 1}`;
      }
      case "list_teams":
        return [];
      case "get_indicator_anchor":
        return S.anchor;
      case "set_indicator_anchor":
        S.anchor = args.anchor;
        delete W.indicator.restW;
        B.layout();
        return null;
      case "set_indicator_size": {
        W.indicator.w = args.width;
        W.indicator.h = args.height;
        // Folding into its notch: flush against the edge (0.5.3).
        W.indicator.flush = !!args.flush;
        W.indicator.restW = Math.min(W.indicator.restW ?? Infinity, args.width);
        B.layout();
        return null;
      }
      case "report_panel_view":
        S.panelView = args.view;
        return null;
      case "open_panel": {
        const pop = W["agents-popover"];
        const home = S.panelView === "inbox" || S.panelView === "agents";
        if (pop.shown && args.view === "inbox" && home) {
          B.show("agents-popover", false);
          return null;
        }
        B.show("agents-popover", true);
        B.emit("panel-navigate", { view: args.view, agent_id: args.agentId ?? null });
        return null;
      }
      case "open_terminal":
        if (args?.paneId === "w2:p1" && termEl("flaky")) {
          // Its terminal is on the desk: bring it to the front.
          termEl("flaky").style.zIndex = 9;
          termEl("billing").style.zIndex = 8;
          termEl("flaky").animate([{ filter: "brightness(1.35)" }, { filter: "none" }], { duration: 500 });
          if (B.desk.w < 700) B.show("agents-popover", false);
          return null;
        }
        // No terminal window for this agent on the stage: show it in the panel's list.
        B.show("agents-popover", true);
        B.emit("panel-navigate", { view: "agents", agent_id: null });
        return null;
      case "plugin:window|hide":
        if (W[lbl]) B.show(lbl, false);
        // "Hide for a while" on the toolbar: come back soon on a demo.
        if (lbl === "indicator") later(2500, () => B.show("indicator", true));
        return null;
      case "plugin:window|show":
        if (W[lbl]) B.show(lbl, true);
        return null;
      // The toolbar asks whether the panel is open before it folds (0.5.3).
      case "plugin:window|get_all_windows":
        return Object.keys(W);
      case "plugin:window|is_visible":
        return !!W[args.label]?.shown;
      // One window telling the others (the Inbox's "inbox-cleared", 0.5.3).
      case "plugin:event|emit":
        B.emit(args.event, args.payload);
        return null;
      case "plugin:event|emit_to":
        B.emit(args.event, args.payload, typeof args.target === "string" ? args.target : args.target?.label);
        return null;
      // Folded, only the notch takes the mouse; on a stage the frame just stays.
      case "set_indicator_hit":
        W.indicator.hit = args.rect ?? null;
        return null;
      case "resolve_approval": {
        const s = S.native.find((x) => x.pending_approval?.request_id === args.requestId);
        if (!s) return false;
        const answer = args.updatedInput?.answers ? Object.values(args.updatedInput.answers)[0] : null;
        const asked = s.pending_approval.tool_input?.questions?.[0]?.question;
        s.pending_approval = undefined;
        s.message_count += 1;
        s.last_activity = Date.now();
        B.emit("agent-approval-handled", { session_id: s.id, verb: args.allow ? "approved" : "denied" });
        if (s.id === "billing") {
          s.status = "Running";
          const ans = answer ?? "";
          s.current_activity = /lock/i.test(ans) ? "Locking the row while processing" : /ignore|log/i.test(ans) ? "Logging duplicate events" : /idempot|event.?id|key/i.test(ans) ? "Adding an idempotency key per event" : "Working your answer in";
          if (asked && answer) T.billing.answered = { answer, question: asked };
          T.billing.since = Date.now();
          S.buffers.billing.push(`> ${answer}`);
          // The agent picks the answer up in its terminal and keeps going.
          const step = (ms, line) => RECORD || later(ms, () => { if (nat("billing")?.status === "Running") { S.buffers.billing.push(line); changed(); } });
          step(1500, `[tool_use:Edit] {"file_path":"${HOME}/shop/billing/src/webhooks.ts"}`);
          step(2700, "[tool_result] Updated src/webhooks.ts with 14 additions");
          step(4300, '[tool_use:Bash] {"command":"pnpm test webhooks"}');
          step(6400, "[tool_result] 16 passed (4 new)");
          nativeFinish("billing", "Retries are safe now: every Stripe event.id is stored and repeats are skipped, with 4 new tests. Want me to open a PR?", 9000);
          landed();
        } else if (s.id === "auth") {
          if (args.allow) {
            s.status = "Running";
            s.current_activity = "Running pnpm test src/auth";
            nativeFinish("auth", "All 38 auth tests pass. Sessions now live in signed, httpOnly cookies.", 6000);
          } else {
            s.status = "Running";
            s.current_activity = "Checking the types instead";
            nativeFinish("auth", "Okay, no test run. Types check clean; the cookie sessions are in.", 5000);
          }
        } else {
          s.status = "Running";
        }
        changed();
        return true;
      }
      case "session_send": {
        const a = nat(args.id);
        if (!a) return null;
        streamTurn(args.id, args.prompt, a.id === "billing" ? "On it. I'll fold that in and run the webhook tests again." : "Got it. Picking that up next.", { activity: "Reading your note" });
        return null;
      }
      case "director_send":
        B.directorAsk(args.prompt);
        return null;
      case "session_stop": {
        const a = nat(args.id);
        if (a) a.status = "Idle";
        B.emit("session-output", { session_id: args.id, text: "Stopped", content_type: "stopped", is_partial: false });
        B.emit("session-status-change", { session_id: args.id, status: "Idle" });
        changed();
        return true;
      }
      case "session_kill":
        S.native = S.native.filter((a) => a.id !== args.id);
        B.emit("agent-killed", { session_id: args.id });
        changed();
        return "killed";
      case "herdr_agent_prompt": {
        const h = her(args.paneId);
        if (!h) return null;
        const t = String(args.text ?? "");
        const yes = /^(yes|go|ok|sure|do it|please)/i.test(t);
        if (h.pane_id === "w3:p1") herdrWork(h.pane_id, t, yes ? "Fixed: the nav uses the new next/link API and the build has no warnings left." : "Okay, leaving the nav as it is.", yes ? "Nav deprecation fixed. No warnings left." : null, 8000);
        else if (h.pane_id === "w2:p1") herdrWork(h.pane_id, t, yes ? "Opened PR #482: one Stripe mock per worker. CI is green." : "Okay, the fix stays local.", yes ? "PR #482 is open, CI green." : null, 8000);
        else herdrWork(h.pane_id, t);
        return null;
      }
      case "herdr_agent_answer": {
        const h = her(args.paneId);
        if (h) { h.question = null; h.status = "working"; }
        herdrChanged();
        return null;
      }
      case "herdr_mark_seen": {
        // herdr keeps "done" until the pane is seen; then it is idle.
        const h = her(args.paneId);
        if (h && h.status === "done") { h.status = "idle"; herdrChanged(); }
        return null;
      }
      case "herdr_agent_stop":
      case "herdr_agent_kill":
        return null;
      case "talk_start":
        B.show("talk", true);
        B.emit("recording-toggled", true);
        B.emit("talk-state", { phase: "listening" });
        return null;
      case "talk_stop":
        B.emit("recording-toggled", false);
        if (args.cancel) B.emit("talk-state", { phase: "cancelled" });
        else if (B.hooks.talkStop) B.hooks.talkStop();
        else {
          // There is no microphone on a web page: nothing was heard.
          B.emit("talk-state", { phase: "transcribing" });
          later(500, () => B.emit("talk-state", { phase: "empty" }));
        }
        return null;
      case "router_type_mode":
        B.emit("recording-toggled", false);
        return null;
      case "router_send_text":
        if (B.hooks.sendText) B.hooks.sendText(args.text);
        else routeText(args.text);
        return null;
      case "router_dismiss":
      case "hide_talk_window":
        B.show("talk", false);
        return null;
      case "start_recording":
        startDictation();
        return null;
      case "stop_recording":
        stopDictation();
        return null;
      case "capture_region":
        later(500, () => B.emit("capture-ready", { path: "/tmp/capture.png" }));
        return null;
      case "take_pending_capture":
        return null;
      case "get_agent_permission_mode":
        return "edits";
      case "get_speech_enabled":
        return true;
      case "get_settings":
        return { claude_auth: { method: "subscription" }, show_indicator: true };
      case "list_displays":
        return [{ name: "Built-in Retina Display", x: 0, y: 0, w: 1512, h: 982, scale: 2, primary: true, current: true }];
      case "get_pair_payload":
        return { url: "cadence://pair?host=192.168.1.20&port=8756&code=K7Q2ZD", host: "192.168.1.20", port: 8756, code: "K7Q2ZD", expires_at: Date.now() + 600_000, enabled: true };
      case "show_agents_dashboard":
        B.show("agents-popover", true);
        B.emit("panel-navigate", { view: "agents", agent_id: null });
        return null;
      case "plugin:shell|open":
        return null;
      default:
        // Settings, speech, probes, clipboard: nothing to do on a stage.
        return null;
    }
  };

  // ── the live demo: engagement, keys, scale, replay ─────────────────
  let scenarioStarted = false;
  function startScenario() {
    if (scenarioStarted || RECORD) return;
    scenarioStarted = true;
    later(6000, () => B.authAsks());
    later(20000, () => B.flakyDone());
  }
  B.touched = (l) => {
    if (!B.engaged) {
      B.engaged = true;
      document.body.classList.add("engaged");
    }
    // Touching the demo mid-story skips to the Inbox and hands over the keys.
    if (!RECORD && story.ch < 2) toInbox();
    startScenario();
    if (l !== "indicator") B.emit("indicator-click-outside", null, "indicator");
    // The toolbar never keeps the keyboard: hand it back to the window that had it.
    if (l === "indicator") later(60, () => {
      if (document.activeElement === el("indicator")) focusKeyWindow();
    });
  };
  function keyWindow() {
    if (W.talk.shown) return "talk";
    if (W["agents-popover"].shown) return "agents-popover";
    return null;
  }
  function focusKeyWindow() {
    const k = keyWindow();
    if (!k) return null;
    try { el(k).contentWindow.focus(); } catch {}
    return k;
  }
  B.focusKeyWindow = focusKeyWindow;

  function reset() {
    for (const t of timers) clearTimeout(t);
    timers.clear();
    // What the Inbox read and cleared is kept in localStorage (0.5.3 shares
    // it between windows); a replay, or a visitor coming back, starts clean.
    try { localStorage.removeItem("cadence.seen.v1"); localStorage.removeItem("cadence.dismissed.v1"); } catch {}
    S = B.state = freshState();
    termReset();
    for (const k of ["billing", "flaky"]) {
      termEl(k)?.querySelector(".body")?.replaceChildren();
      if (termEl(k)) termEl(k).style.zIndex = "";
    }
    story.timers = [];
    story.ch = 0;
    story.paused = false;
    story.pendingAuto = false;
    // The story opens the panel itself (chapter 2); Replay plays it again
    // for a visitor who had taken over, until they touch the demo.
    B.engaged = false;
    document.body.classList.remove("engaged");
    scenarioStarted = false;
    dictating = null;
    W.talk.shown = false;
    W["agents-popover"].shown = false;
    W.indicator.shown = !RECORD;
    delete W.indicator.restW;
    W.indicator.flush = false;
    for (const k of Object.keys(frames)) delete frames[k];
    for (const l of ["indicator", "agents-popover", "talk"]) {
      const f = el(l);
      if (f) f.src = `app/${l}.html`;
    }
    B.layout();
    if (RECORD) return;
    renderTerms();
    chapter(0);
    runTicker(true);
    if (story.visible) sLater(700, storyStart);
  }
  B.reset = reset;

  function fit() {
    if (RECORD) return;
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    // The compact 4:5 desktop (panel + toolbar only) is used when the frame
    // is narrow AND tall enough for it; a narrow 16:10 frame keeps the full
    // desktop, which reads the same at that size.
    const compact = vw < 600 && vh >= vw * 0.9;
    B.desk = compact ? { w: 520, h: 650 } : { w: 1040, h: 650 };
    W.talk.w = compact ? 500 : 640;
    const stage = document.getElementById("stage");
    stage.style.width = `${B.desk.w}px`;
    stage.style.height = `${B.desk.h}px`;
    stage.classList.toggle("compact", compact);
    const s = Math.min(vw / B.desk.w, vh / B.desk.h);
    const x = (vw - B.desk.w * s) / 2, y = (vh - B.desk.h * s) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    B.layout();
    if (window.parent !== window) {
      try { window.parent.postMessage({ type: "cadence-embed", event: "layout", aspect: B.desk.w / B.desk.h, compact, suggestedAspect: vw < 600 ? 0.8 : 1.6 }, "*"); } catch {}
    }
  }

  function init() {
    if (RECORD) {
      document.body.classList.add("record");
      const stage = document.getElementById("stage");
      const sync = () => {
        B.desk = { w: innerWidth, h: innerHeight };
        stage.style.width = `${innerWidth}px`;
        stage.style.height = `${innerHeight}px`;
        B.layout();
      };
      addEventListener("resize", sync);
      sync();
      reset();
      return;
    }
    addEventListener("resize", fit);
    document.getElementById("keys").classList.add("live");
    buildTerms();
    fit();
    reset();
    watchVisible();
    document.getElementById("replay").addEventListener("click", (e) => {
      e.stopPropagation();
      reset();
    });
    // Clicks on the desktop itself: the visitor is using the embed, and the
    // panel (or Talk) is the window that should get the keys.
    document.addEventListener("pointerdown", (e) => {
      if (e.target.closest?.("#replay")) return;
      B.touched("stage");
      focusKeyWindow();
    });
    // Keys typed while the stage page itself has focus go to the key window.
    document.addEventListener("keydown", (e) => {
      if (e.target !== document.body && e.target !== document.documentElement) return;
      const k = focusKeyWindow();
      if (!k) return;
      B.touched("stage");
      e.preventDefault();
      const w = el(k).contentWindow;
      const ev = new w.KeyboardEvent("keydown", { key: e.key, code: e.code, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey, bubbles: true, cancelable: true });
      (w.document.activeElement ?? w.document.body).dispatchEvent(ev);
    });
    // postMessage API for the page around the embed.
    addEventListener("message", (e) => {
      const d = e.data;
      if (!d || d.type !== "cadence-embed") return;
      if (d.action === "replay") reset();
      if (d.action === "chapter") B.goChapter(Number(d.chapter) || 1);
      if (d.action === "pause" || d.action === "play") B.pauseStory(d.action === "pause");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // ── recorder helpers: a drawn pointer and keystroke captions ──────
  let cur = { x: -100, y: -100 };
  B.pointer = (x, y) => {
    cur = { x, y };
    const c = document.getElementById("cursor");
    if (c) c.style.transform = `translate(${x - 2}px, ${y - 1.5}px)`;
  };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  B.move = (x, y, ms = 700) =>
    new Promise((resolve) => {
      const from = { ...cur };
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        const e = ease(k);
        const bow = Math.sin(Math.PI * k) * 0.06 * Math.hypot(x - from.x, y - from.y);
        B.pointer(from.x + (x - from.x) * e, from.y + (y - from.y) * e - bow);
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  B.rectIn = (l, selector, last = false) => {
    const f = el(l);
    const r = f.getBoundingClientRect();
    const all = f.contentDocument.querySelectorAll(selector);
    const e = last ? all[all.length - 1] : all[0];
    if (!e) return null;
    const q = e.getBoundingClientRect();
    return { x: r.left + q.left, y: r.top + q.top, w: q.width, h: q.height, cx: r.left + q.left + q.width / 2, cy: r.top + q.top + q.height / 2 };
  };
  B.keys = (list, ms = 1100) => {
    const k = document.getElementById("keys");
    k.innerHTML = list.map((s) => `<kbd>${s}</kbd>`).join("");
    k.classList.add("on");
    clearTimeout(B._kt);
    B._kt = setTimeout(() => k.classList.remove("on"), ms);
  };
})();
