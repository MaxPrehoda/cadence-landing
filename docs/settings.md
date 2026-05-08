# Settings reference

Settings live at:

```
~/Library/Application Support/com.cadence.app/settings.json
```

Most fields are exposed in the in-app settings UI. The reference below is the full schema for power users who want to edit the JSON directly.

> Cadence migrates stale values on launch (e.g. an old `vad_threshold` of 0.5 will be reset to 0.025). If you edit by hand, make a backup first.

## Audio & transcription

| Field | Default | Notes |
|---|---|---|
| `model_name` | `ggml-small.en.bin` | Whisper model file. Larger = more accurate, slower. |
| `language` | `en` | ISO code or empty for auto-detect (multilingual models only). |
| `vad_threshold` | `0.025` | RMS amplitude required to count as speech. Range 0.005–0.1. |
| `silence_duration_ms` | `2000` | Trailing silence required to end an utterance. |

## Hotkey

| Field | Default | Notes |
|---|---|---|
| `push_to_talk` | `true` | Hold-to-record. If false, the chord toggles. |
| `hotkey` | `CmdOrCtrl+Shift+Space` | Tauri-style accelerator for chord mode. |
| `hotkey_modifier` | `option` | `+`-separated tokens for push-to-talk. See [hotkeys](#/hotkeys). |

## Wake word

| Field | Default | Notes |
|---|---|---|
| `wake_word` | `computer` | Custom wake word for command parser. |
| `wake_word_enabled` | `false` | Always-on listening for "Hey Cadence". |
| `wake_word_sensitivity` | `0.5` | For Porcupine path; ignored on default Whisper path. |
| `wake_word_model_path` | null | Optional `.ppn` file for Porcupine. |
| `picovoice_access_key` | null | Required only if using Porcupine. |

## Polish

| Field | Default | Notes |
|---|---|---|
| `text_polish_enabled` | `true` | Run dictation through the local LLM. |
| `polish_use_cloud` | `false` | Send polished prompt to Anthropic Claude. Audio still local. |
| `polish_api_key` | null | Anthropic key for cloud polish + intent engine. |
| `app_tone_profiles` | `[]` | Per-bundle-id tone overrides. |

## Intent engine

| Field | Default | Notes |
|---|---|---|
| `intent_engine_enabled` | `true` | Falls back to Claude Haiku for unknown commands. |

## TTS

| Field | Default | Notes |
|---|---|---|
| `tts_enabled` | `true` | Spoken feedback for completions, approvals, errors. |
| `tts_voice` | system default | macOS AVSpeech voice identifier. |
| `tts_rate` | system default | Words per minute. |
| `tts_output_device` | null | Specific output device, or null for system default. |

## Indicator

| Field | Default | Notes |
|---|---|---|
| `show_indicator` | `true` | Floating pill at bottom-center. |
| `notification_enabled` | `true` | Banner notifications for spawn / errors / approvals. |

## Agents

| Field | Default | Notes |
|---|---|---|
| `claude_cli_path` | null | Path to the `claude` binary. Auto-detected if null. |
| `claude_auth` | `{ mode: "subscription" }` | `subscription` (OAuth) or `api_key`. |
| `agent_presets` | `[]` | Saved spawn configs (name + cwd + initial prompt). |
| `persisted_agents` | `[]` | Agents that survive a Cadence restart. |
| `agent_teams` | `[]` | Team groupings for the dashboard. |
| `active_team_id` | null | Currently selected team. |
| `agent_auto_allow_reads` | `true` | Skip voice approval for `Read`/`Glob`/`Grep`/`WebFetch`/`WebSearch`. |
| `agents_use_worktree` | `true` | Spawn each agent in its own git worktree. |
| `agents_dictation_fallback` | `true` | Route a sticky-named utterance to the last addressed agent. |
| `dashboard_auto_open` | `true` | Open dashboard window on first agent spawn. |
| `dashboard_monitor_preference` | "primary" | Which display to open on. |

## Integrations

| Field | Default | Notes |
|---|---|---|
| `cdp_port` | `9222` | Chrome DevTools Protocol port. |
| `slack_token` | null | Slack bot user token. |
| `obsidian_vault_path` | null | Path to your Obsidian vault. |

## Custom commands & corrections

| Field | Default | Notes |
|---|---|---|
| `custom_commands` | `[]` | User-defined trigger → action mappings. |
| `custom_aliases` | `[]` | Spoken-form → actual app/name overrides. |
| `app_groups` | `[]` | Named lists of apps to open together. |
| `correction_rules` | `[]` | Replace common Whisper mishearings (e.g. "react. ts" → "react.ts"). |

## Misc

| Field | Default | Notes |
|---|---|---|
| `auto_check_updates` | `true` | Background check for new releases. |
| `onboarding_done` | `false` | First-run flag. |
| `notes` | `[]` | Voice-captured notes & todos. |
| `dictation_history` | `[]` | Recent transcriptions for re-paste. |
