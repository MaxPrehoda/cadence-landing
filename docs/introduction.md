# Introduction

Cadence is a voice-first OS layer for macOS. Hold a key, speak, and your words land where the cursor is — or trigger actions across your desktop, browser, and AI agents.

## What it does

- **Local dictation.** Whisper runs on-device; nothing leaves your machine for transcription.
- **System-wide voice commands.** Open apps, drive VS Code, take notes, run shell commands — without touching the keyboard.
- **Multi-agent orchestration.** Spawn and steer multiple Claude Code agents in parallel by name.
- **Browser, Slack, email, iMessage, Obsidian.** First-class integrations exposed as voice actions.

## How it works

Three activation paths funnel into the same pipeline:

1. **Push-to-talk** — hold the configured modifier (default Option) or chord to record.
2. **Wake word** — say "Hey Cadence" or "computer" with always-listening mode enabled.
3. **No-prefix dictation** — when push-to-talk is held without a command keyword, your speech is typed at the cursor.

Audio → Whisper → optional text polish → command parser → action.

## Where to start

- New here? → [Installation](#/installation) → [Quickstart](#/quickstart)
- Already running? → [Hotkeys](#/hotkeys) · [Voice commands](#/voice-commands) · [Agents](#/agents)
- Hitting issues? → [Troubleshooting](#/troubleshooting)
