# Wake word

The wake word is an opt-in, hands-free alternative to push-to-talk. It's off by default, turn it on in **Settings → Voice → Wake word**.

## How it works

Cadence reuses the existing Whisper pipeline rather than running a separate keyword model. When wake word is enabled, the audio thread stays always-listening and VAD-segmented utterances flow into Whisper continuously. If the transcribed text starts with a recognized prefix, the remainder is dispatched as a command.

This means there's only one model loaded, no extra binary, and no Picovoice access key required for the default path.

## Recognized prefixes

Out of the box, Cadence responds to all of these:

- `Hey Cadence, ...`
- `Cadence, ...`
- `Cadence: ...`
- `Cadence. ...`
- `Hey Candence, ...` *(common Whisper mishearing)*
- `Okay Cadence, ...`

## Custom wake word for command mode

The simpler **command parser** (the one that handles non-LLM patterns like "open Safari") uses a separate, fully customizable wake word. Default: **"computer"**.

**Settings → Voice → Command wake word**

Pick anything pronounceable, `jarvis`, `friday`, `computer`, your dog's name. Cadence handles common Whisper variants automatically (e.g. `"computers"` for `"computer"`).

> "Computer, switch to Slack"

The wake word is **only** required when push-to-talk is *not* held. With PTT held, no prefix is needed.

## Trade-offs

| | Push-to-talk | Wake word |
|---|---|---|
| Latency | Instant | ~300 ms (waits for VAD silence) |
| Battery / CPU | Idle when not held | Always-on Whisper |
| Reliability in noise | High | Variable |
| Privacy | Audio captured only when held | Audio captured continuously |

If privacy or battery life matters to you, leave wake word off and use push-to-talk.

## Future: Porcupine

The codebase is structured so a low-latency Porcupine keyword model can be plugged in without changing downstream parsing. If you want that today, you can supply your own `.ppn` model file and a Picovoice access key in settings, but it isn't required.
