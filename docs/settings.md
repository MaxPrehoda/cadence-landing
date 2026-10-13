# Settings reference

Open Settings from the main window: **⋯ → Open Cadence** on the toolbar, then the **Settings** tab. The sidebar has nine sections.

## Permissions

Shows whether **Accessibility**, **Input Monitoring** and **Microphone** are granted, with a button to fix each one.

**Reset TCC Permissions** clears every permission decision macOS has cached for Cadence. Use it if permissions stay denied after an upgrade even though System Settings shows them on. Quit and reopen Cadence afterward.

## Hotkey

| Setting | Default | Notes |
|---|---|---|
| **Push-to-Talk Key** | `⌥` Option | Presets: ⌥ Option, ⌘ Cmd, ⌃ Control, ⌘⌥, ⌃⌥. Or click **Record** and hold up to three modifiers. |
| Hold threshold | 200 ms | Shorter presses count as a tap. Not adjustable. |
| **Talk to your agents** trigger | Double-tap of the same key | Tap window 350 ms. Not adjustable. |

See [Hotkeys](#/hotkeys).

## AI

These all need your own Anthropic API key. Agents, Talk, titles, recaps and the Director do not use this key; they use your Claude Code login.

| Setting | Default | Notes |
|---|---|---|
| **Anthropic API Key** | empty | From console.anthropic.com. |
| **Intent Engine** | On (when a key is set) | Sends unrecognized voice commands to Claude. See [Voice commands](#/voice-commands). |
| **Cloud Polish** | Off | Polishes dictation with Claude Haiku. See [Text Polish](#/text-polish). |
| **App Tone Profiles** | none | Casual, Formal, Technical or Raw per app. |

## Commands

| Setting | Default | Notes |
|---|---|---|
| **Wake Word** | `computer` | The command word that turns a dictation into a command. |
| **Built-in Commands** | | Read-only list of every built-in command. |
| **Custom Commands** | none | Trigger phrase plus Open App, Keyboard Shortcut or Insert Text. |
| **Custom App Aliases** | none | Spoken name to real app name. |
| **App Groups** | none | One name for several apps. |
| **Vocabulary** | none | Names and jargon the speech model should spell your way. |
| **Auto-Corrections** | none | Phrase heard to phrase wanted. |

## Models

Pick the speech model and download others. The default is **Parakeet v2 (English, recommended)**. Changing models needs a restart. See [Dictation](#/dictation).

## Audio

| Setting | Default | Notes |
|---|---|---|
| **Input device** | Automatic (system default) | Follows device changes. |
| **Prefer the built-in mic over Bluetooth headsets** | On | Applies when the input is Automatic. |
| **Speech Detection** | Silero VAD | Read-only: keeps 500 ms before the key press and up to 600 ms after release. |
| **Save recordings** | Off | Keeps the newest 300 dictations as audio and text. |

## Agents

| Setting | Default | Notes |
|---|---|---|
| **Claude authentication** | Claude subscription | Also: OAuth token, API key, gateway token, credential script, Bedrock, Vertex AI, Foundry. **Test connection** checks it. |
| **Binary path** | empty (uses `PATH`) | Path to `claude` if it is not on your `PATH`. |
| **Auto-allow read-only tools** | On | Read, Glob, Grep, WebFetch and WebSearch run without asking. |
| **Use a git worktree per agent** | On | Cadence chat agents get their own branch in `~/.cadence/worktrees/`. |
| **Fall back to last-addressed agent** | On | Legacy voice routing for Cadence chat agents. Plain dictation is never sent to an agent either way. |
| **Auto-open the dashboard** | Off | Opens the Agents board when the first agent starts. |
| **Preferred monitor** | Secondary display | Where the Agents board opens. |
| **Text-to-speech** | On | Speak agent completions and approval requests. |
| **Voice** / **Rate (wpm)** | Samantha / 190 | Any installed macOS voice. **Test** previews it. |
| **Output device** | System default | Send spoken updates to a different device. |
| **Notifications** | On | macOS notifications on agent events. |
| **Wake word** | Off | "Hey Cadence" always-on listening. See [Voice commands](#/voice-commands). |

## Injection

| Setting | Default | Notes |
|---|---|---|
| Method | Clipboard + ⌘V | Read-only. Your clipboard is restored afterward. |
| **Text Polish** | On | Needs the Qwen 2.5 1.5B model (about 1.1 GB). See [Text Polish](#/text-polish). |
| **Chrome DevTools port** | 9222 | For Intent Engine browser actions. |
| **Slack bot token** | empty | For Intent Engine Slack actions. |
| **iPhone relay** | Off | For the iPhone app, which is [not available yet](#/iphone). |
| **Continue agents in the cloud** | On | Under iPhone relay. Keeps an encrypted copy of each Claude Code agent at the relay so the phone can [continue it in the cloud](#/cloud) while this Mac is asleep. Turning it off deletes those copies. |

## About

| Setting | Default | Notes |
|---|---|---|
| Version, Architecture | | Read-only. |
| **Replay Setup** | | Runs onboarding again. |
| **Show floating indicator** | On | Shows or hides the toolbar. |
| **Auto-check on launch** | On | Checks GitHub Releases for a new version. |

## Outside the Settings window

Some settings live where you use them:

- **Toolbar ⋯ menu**: Edge of the screen (default Right), Display, Hide for a while, Hide the toolbar.
- **Inbox panel header**: **Ask / Edits / Auto** permission mode (default Ask) and the speaker button for spoken updates.

## The settings file

Settings are stored in:

```
~/Library/Application Support/com.cadence.app/settings.json
```

Use the app to change them where you can. If you edit the file by hand, quit Cadence first and keep a backup. Field names for the settings above:

| Field | Default |
|---|---|
| `hotkey_modifier` | `"option"` |
| `model_name` | `"parakeet-tdt-0.6b-v2-int8"` |
| `input_device` | `null` (Automatic) |
| `avoid_bluetooth_mic` | `true` |
| `save_recordings` | `false` |
| `custom_vocabulary` | `[]` |
| `correction_rules` | `[]` |
| `text_polish_enabled` | `true` |
| `polish_use_cloud` | `false` |
| `polish_api_key` | `null` |
| `intent_engine_enabled` | `true` |
| `app_tone_profiles` | `[]` |
| `wake_word` | `"computer"` |
| `wake_word_enabled` | `false` |
| `custom_commands` | `[]` |
| `custom_aliases` | `[]` |
| `app_groups` | `[]` |
| `show_indicator` | `true` |
| `indicator_anchor` | `"right"` |
| `indicator_display` | `""` (picked on first launch) |
| `agent_permission_mode` | `"ask"` |
| `claude_cli_path` | `null` |
| `agent_auto_allow_reads` | `true` |
| `agents_use_worktree` | `true` |
| `agents_dictation_fallback` | `true` |
| `dashboard_auto_open` | `false` |
| `dashboard_monitor_preference` | `"secondary"` |
| `tts_enabled` | `true` |
| `tts_voice` | `"Samantha"` |
| `tts_rate` | `190` |
| `tts_output_device` | `null` |
| `notification_enabled` | `true` |
| `cdp_port` | `9222` |
| `slack_token` | `null` |
| `relay_enabled` | `false` |
| `cloud_continue` | `true` |
| `auto_check_updates` | `true` |

Other files in the same folder hold app state, not settings: `models/` (downloaded models), `recordings/` (if enabled), `sets.json` ([sets](#/sets)), `agent-meta.json` (agent titles and recaps) and `router-memory.json` (your recent Talk requests and where they went).
