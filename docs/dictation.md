# Dictation

Cadence dictates into whatever app has focus — text fields, editors, browser textareas, terminal prompts. The pipeline:

```
microphone → VAD → Whisper → polish → keystroke injection
```

## Whisper transcription

Transcription runs locally via [whisper.cpp](https://github.com/ggerganov/whisper.cpp). Default model: `ggml-small.en.bin` (~500 MB, English-only, fast on Apple Silicon).

Swap models in **Settings → Whisper**. Larger models (`medium`, `large-v3`) are more accurate but slower. Multilingual models (without the `.en` suffix) handle 90+ languages — set **Language** in settings to your target locale or leave it blank for auto-detect.

## Voice activity detection (VAD)

Two thresholds gate when audio is sent to Whisper:

- **VAD threshold** (default `0.025`): RMS amplitude required to count as speech. Raise it if quiet rooms produce false starts; lower it if your voice gets clipped.
- **Silence duration** (default `2000 ms`): how long the trailing silence must last before Cadence considers the utterance done.

These live under **Settings → Audio**.

## Polish

After Whisper transcribes, the result runs through a local polish LLM that fixes punctuation, capitalization, and minor word choice without changing meaning. The polish model is bundled as a sidecar binary — no setup required.

To disable: **Settings → Polish → Off**.

To upgrade to cloud polish (Anthropic Claude) for higher quality on long-form text:

1. **Settings → Polish → Use cloud**
2. Paste an Anthropic API key

Cloud polish only fires after local Whisper has already produced text — the audio itself never leaves your machine.

## Per-app tone profiles

Different apps want different prose. Cadence reads the bundle ID of the active app and applies a per-app polish profile.

**Settings → Polish → App profiles**

Profile choices:

- **default** — neutral cleanup
- **casual** — friendly, contractions, emoji-friendly
- **formal** — business tone, no slang
- **technical** — preserves jargon, code-friendly
- **raw** — disables polish entirely (good for terminals and code editors)
- **custom** — your own one-line instruction

## Hallucination filtering

Whisper has a known tendency to invent text on near-silent audio (`"Thanks for watching!"`, `"Subtitles by..."`, `"Subscribe!"`). Cadence drops these on the floor before they reach your cursor.

If a real phrase you actually use gets filtered, file an issue — the suppression list is small and intentional.

## Keystroke injection

Polished text reaches the active app via simulated keypress events (not pasteboard). This means:

- Your clipboard isn't clobbered.
- It works in apps that block paste (some 1Password fields, sandboxed inputs).
- The cost is slightly slower insertion for very long blocks.

If you need clipboard injection (e.g. for terminals where keystroke replay is awkward), enable **Settings → Injection → Use clipboard**.

## Dictation history

The last N transcriptions are kept locally in `~/Library/Application Support/com.cadence.app/settings.json` so you can re-paste a previous result. Clear them anytime from **Settings → History → Clear**.
