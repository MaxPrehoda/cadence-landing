# Installation

## Requirements

- macOS 11.0 or later
- Apple Silicon recommended (Whisper runs noticeably faster on M-series)
- ~500 MB free disk for the app + a Whisper model

## Download

Grab the latest signed `.dmg` from the [downloads section](/#download) on the home page or from [GitHub Releases](https://github.com/MaxPrehoda/cadence/releases).

1. Open the downloaded `.dmg`.
2. Drag **Cadence.app** into **Applications**.
3. Eject the disk image.
4. Launch Cadence from Applications (or Spotlight).

The first launch may take a few seconds while macOS verifies the signature. If Gatekeeper blocks the app, right-click → **Open** → confirm.

## Grant permissions

Cadence asks for the following macOS permissions on first launch. All of them are required for full functionality.

| Permission | Why it's needed |
|---|---|
| **Microphone** | Capture audio for local Whisper transcription. |
| **Accessibility** | Read the active window/app for context, type text into other apps, simulate keyboard shortcuts. |
| **Input Monitoring** | Detect the global push-to-talk hotkey from anywhere on the system. |
| **Automation** | Drive Mail.app, Messages.app, and other apps via AppleScript for the email/iMessage/system integrations. |

If you skip a prompt, you can grant it later in **System Settings → Privacy & Security**. Cadence will detect missing permissions and surface a banner in the indicator.

## First run

On first launch Cadence will:

1. Download the default Whisper model (`ggml-small.en.bin`) into the app's data directory.
2. Show the indicator pill at the bottom-center of your primary display.
3. Open the onboarding sheet — confirm your hotkey and wake word here.

Once onboarding completes, the pill stays in place. Hold the hotkey to record; release to transcribe.

## Updating

Cadence checks for new releases automatically. When an update is ready, the indicator badges and a one-click upgrade prompt appears. You can disable auto-updates in **Settings → General**.

## Uninstall

```sh
# Quit Cadence first
rm -rf /Applications/Cadence.app
rm -rf ~/Library/Application\ Support/com.cadence.app
rm -rf ~/Library/Caches/com.cadence.app
```

This removes the app, your settings, and the cached Whisper model.

Next: [Quickstart](#/quickstart).
