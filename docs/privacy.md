# Privacy

Cadence is built around a single principle: **your audio never leaves your machine** unless you opt into a feature that explicitly requires it.

## What stays on-device, always

- **Microphone audio.** Captured locally, processed by Whisper running on-device. Never uploaded.
- **Voice activity detection.** Pure DSP, no network.
- **Built-in voice commands.** Pattern-matched against the local registry. No round-trip.
- **Notes, todos, dictation history.** Stored only in `~/Library/Application Support/com.cadence.app/settings.json`.
- **Worktrees and agent diffs.** Live entirely in your local git repos.

## What is sent to Anthropic (and only when you opt in)

| Feature | What's sent | When |
|---|---|---|
| **Cloud polish** | Transcribed text only (no audio) | If `polish_use_cloud = true` and an API key is set |
| **Intent engine** | Transcribed text + active app context (window title, selection, clipboard) | If `intent_engine_enabled = true` and an API key is set |
| **Agents (Claude Code)** | Whatever you say to the agent + repo context the agent reads | Per spawned agent session |
| **TTS summarization** | Long agent responses are summarized before being spoken | If TTS is on and a response exceeds the inline-read threshold |

All four use the Anthropic API directly — no Cadence server in the middle.

## What is sent to third-party integrations

Each integration is **off by default** and only activates after you provide credentials:

- **Slack** — your bot token authorizes Cadence to read/write messages. Slack's API logs the requests; Cadence does not.
- **Mail.app / Messages.app** — driven via local AppleScript. No third-party network calls beyond what Mail/Messages already do.
- **Browser CDP** — a localhost connection to your running Chrome instance. Nothing leaves the machine.
- **Obsidian** — files are read and written locally; no network.

## What we don't do

- No telemetry. Cadence makes zero analytics calls.
- No crash reporting service. Crashes are logged locally only.
- No license check or activation server. The app works fully offline.
- No account. There's no "Cadence account" to sign up for.
- No cloud sync of settings, notes, history, or agents.

## Microphone behavior

- With **push-to-talk only** (default), the mic stream is opened on key-down and closed on key-up. Cadence is not listening between presses.
- With **wake word enabled**, the mic stays open and audio buffers continuously flow into the local Whisper pipeline. Audio is held in a small ring buffer (a few seconds) for VAD purposes; it is not recorded to disk.

If you want the strongest privacy posture, leave wake word off.

## Permissions

The macOS permissions Cadence requests:

- **Microphone** — required for transcription
- **Accessibility** — required to read window titles and synthesize keystrokes
- **Input Monitoring** — required for the global push-to-talk hotkey
- **Automation** — required only if you use the email / iMessage / Mail.app integrations

Each can be revoked independently in System Settings → Privacy & Security.

## Source code

Cadence is open source under the MIT license. The transcription and command-routing code paths are fully auditable: <https://github.com/MaxPrehoda/cadence>

If you want stronger guarantees than "trust the binary," build from source — the README has instructions.

## Reporting a privacy concern

Email <privacy@cadencevoice.ai> or open an issue on GitHub. We treat privacy bugs as security bugs.
