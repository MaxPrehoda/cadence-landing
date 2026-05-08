# Hotkeys

Cadence supports two activation styles. Pick the one that matches your reflexes.

## Push-to-talk (default)

Hold a single modifier key (or chord). Cadence listens while held; releasing starts transcription.

The default modifier is **Option (⌥)**. To change it:

**Settings → Hotkey → Modifier**

Supported tokens (combinable with `+`):

| Token | Key |
|---|---|
| `cmd` | ⌘ Command |
| `option` | ⌥ Option |
| `ctrl` | ⌃ Control |
| `shift` | ⇧ Shift |

Examples: `option`, `cmd+shift`, `ctrl+option`.

## Chord hotkey

If you'd rather press a full chord (e.g. ⌘⇧Space), set **Hotkey** to a Tauri-style accelerator:

```
CmdOrCtrl+Shift+Space
```

The chord toggles a recording session: press once to start, press again (or release the modifier) to stop.

## Double-tap activation

Double-tap the modifier key to lock recording on without holding it. A second double-tap stops the session. Useful for long dictations where holding the key gets tiring.

## Why it's reliable

Cadence runs a **CGEventTap** on the main run loop *and* a low-frequency modifier-state poller. The tap is the fast path; the poller backstops the case where macOS silently disables the tap (Secure Input, screen sharing, sleep/wake). You don't lose the hotkey when those things happen.

## Required permission

Hotkey detection requires **Input Monitoring** permission. If you skipped it during onboarding:

**System Settings → Privacy & Security → Input Monitoring → Enable Cadence**

Restart the app after granting.

## Troubleshooting

- **Hotkey doesn't fire.** Check Input Monitoring is enabled. If a screen-sharing or remote-control app is running, it can hold an exclusive event tap — quit it and try again.
- **Hotkey conflicts with another app.** Pick a different chord. Cadence won't override a system shortcut you've reserved.
- **Recording starts but no audio is captured.** Check Microphone permission and that the right input device is selected in **Settings → Audio**.

See [troubleshooting](#/troubleshooting) for more.
