# Cadence on Windows

Cadence for Windows is the same app as on the Mac: every agent in one Inbox, Talk, and dictation that runs on your own PC. This page covers what is different. Everywhere else in these docs, read `⌥` (Option) as `{{hotkey}}` and `⌘` as `Ctrl`.

## Requirements

- {{minOS}}
- An Intel or AMD ({{arch}}) PC. ARM PCs and older versions of Windows haven't been tested.
- About 1 GB of free disk space for the app and the default speech model.

For agent features you also need the [Claude Code](https://docs.claude.com/en/docs/claude-code) CLI (`claude`) for Windows, installed and signed in. Dictation works without it.

## Install

1. Download `{{installer}}` from the [Windows page](/windows) or from [GitHub Releases](https://github.com/MaxPrehoda/cadence-landing/releases).
2. Run it. Cadence installs for your user only, so Windows doesn't ask for an administrator.
3. Open **Cadence** from the Start menu.

<!--IFNOT:signed-->
Cadence for Windows isn't code-signed yet. The first time you run the installer, Windows shows **Windows protected your PC**. Click **More info**, then **Run anyway**. Only do that for an installer you downloaded from cadencevoice.ai or from our GitHub releases.

<!--/IFNOT:signed-->
<!--CLAIM:winget-->
## Install with winget

```powershell
winget install {{wingetId}}
```

<!--/CLAIM:winget-->
## First launch

Setup is the same walk-through as on the Mac, without the permissions step: Windows has no permission screens for the keyboard or for typing into other apps.

- **Microphone.** If Cadence can't hear you, open **Settings → Privacy & security → Microphone** and turn on **Let desktop apps access your microphone**.
- **Administrator windows.** Cadence can't type into a window that runs as administrator, such as an elevated terminal. Dictate into a normal window instead.

## Keys

| | Mac | Windows |
|---|---|---|
| The Cadence key: hold to dictate, double-tap to talk | `⌥` Option | `{{hotkey}}` |
| New agent, from the Inbox | `⌘N` | `Ctrl+N` |
| Paste | `⌘V` | `Ctrl+V` |

Change the key in **Settings → Hotkey**, the same as on the Mac. See [Hotkeys](#/hotkeys).

## Where things live

| | |
|---|---|
| Settings, speech models, saved recordings | `{{dataDir}}` |
<!--CLAIM:worktrees-->
| Agent worktrees | `%USERPROFILE%\.cadence\worktrees` |
<!--/CLAIM:worktrees-->

## What works on Windows today

<!--FEATURES-MD:yes-->

<!--UNLESS:everything-->
## Not on Windows yet

These work on the Mac and aren't ready on Windows:

<!--FEATURES-MD:no-->

<!--/UNLESS:everything-->
<!--CLAIM:updates-->
## Updating

Cadence checks for a new version when it launches and shows a banner when there is one. Open **Settings → About** and click **Install Update**.

<!--/CLAIM:updates-->
<!--CLAIM:uninstall-->
## Uninstall

Quit Cadence, then open **Settings → Apps → Installed apps**, find **Cadence** and choose **Uninstall**. To remove your settings, models and recordings as well, delete `{{dataDir}}`.

<!--/CLAIM:uninstall-->
Next: [Quickstart](#/quickstart).
