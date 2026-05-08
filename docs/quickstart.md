# Quickstart

Five things to try in your first five minutes.

## 1. Dictate into anything

Click into a text field in any app — Slack, Mail, your editor, a browser textarea.

Hold **Option** (or your configured hotkey). Speak. Release.

Your words appear at the cursor, polished by the local LLM. No cloud round-trip.

## 2. Run a system command

Hold the hotkey and say:

> "Open Safari"

Cadence recognizes the leading verb as a command — no wake word needed when push-to-talk is engaged. See [voice commands](#/voice-commands) for the full grammar.

Other quick tries:

- "Switch to Slack"
- "New tab"
- "Take a note: pick up groceries after work"
- "Make a todo to email Dana about the budget"

## 3. Talk to an AI agent

> "New agent named Frontend in ~/code/my-app"

Cadence spawns a Claude Code session in that directory and announces it. Then say:

> "Frontend, add a dark mode toggle to the settings page"

The agent picks up the work. When it asks for permission to run a tool, Cadence speaks the request — answer **"approve"** or **"deny"**.

See [agents](#/agents) for the full vocabulary (status, kill, show diff, teams, …).

## 4. Drive the desktop with intent

Anything that isn't a built-in command falls through to the **intent engine** — Claude interprets your spoken sentence and composes a plan from 35 primitive actions:

> "Make this email more formal" *(with text selected)*

> "Run the tests and tell me if they pass"

> "Search the page for 'checkout' and click it" *(with Chrome on a remote-debug port)*

> "Text Mom saying I'll be late"

See [intent engine](#/intent-engine) for the full action catalog.

## 5. Hands-free with the wake word

Open **Settings → Voice** and enable **Wake word**. Now you don't need to hold the hotkey:

> "Hey Cadence, open VS Code"
> "Computer, what time is it?"

The wake word stays armed in the background using the same Whisper pipeline — no separate model required.

---

Where to go next:

- [Hotkeys](#/hotkeys) — customize your push-to-talk chord.
- [Settings](#/settings) — tune VAD, polish, TTS, and more.
- [Privacy](#/privacy) — exactly what stays local and what calls the cloud.
