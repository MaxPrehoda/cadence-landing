# Installation

## Requirements

- macOS 13 (Ventura) or later
- A Mac with Apple Silicon (M1 or newer). There is no Intel build.
- About 1 GB of free disk space for the app and the default speech model. Optional models (Text Polish, the Whisper names pass) need more, see [Dictation](#/dictation).

For agent features you also need:

- The [Claude Code](https://docs.claude.com/en/docs/claude-code) CLI (`claude`) installed and signed in. Cadence uses your existing login, so there is no separate API key to set up.
- [herdr](https://herdr.dev) for terminal agents and for any CLI other than Claude Code. Cadence shows the install command the first time you need it.

Dictation works without either of these.

## Download

Download the latest `Cadence_<version>_aarch64.dmg` from the [download section](/#download) on the home page or from [GitHub Releases](https://github.com/MaxPrehoda/cadence-landing/releases).

1. Open the `.dmg`.
2. Drag **Cadence** into **Applications**.
3. Eject the disk image.

## First launch

Cadence is signed and notarized by Apple, so it opens like any other app: double-click **Cadence** in **Applications**. The first time, macOS asks whether to open an app downloaded from the internet; click **Open**.

If macOS says Cadence is from an unidentified developer or can't be opened, you have v0.4.0 or older. Download the latest version from [GitHub Releases](https://github.com/MaxPrehoda/cadence-landing/releases/latest) instead.

## Updating from v0.4 or earlier

Cadence is signed differently from v0.5.0 on, and macOS ties permissions to how an app is signed. If Cadence asks for permissions that System Settings already shows as on, those entries belong to the old version. To clear them:

1. Quit Cadence.
2. Run `tccutil reset All com.cadence.app` in Terminal.
3. Reopen Cadence and allow Microphone, Accessibility and Input Monitoring again.

Later updates keep your permissions.

## Onboarding

The first launch walks you through setup:

1. **Hi, it's Cadence.** A short intro.
2. **How does it work?** Which agents Cadence can work with.
3. **Grant Permissions.** Microphone, Accessibility and Input Monitoring. This step is skipped if they are already granted.
4. **Choose Your Hotkey.** Option (`⌥`, recommended) or Command (`⌘`). Hold it to dictate, double-tap it to talk to your agents.
5. **Speech Model.** Download the on-device speech model (Parakeet v2, about 630 MB).
6. **AI Features (Optional).** An Anthropic API key for Cloud Polish and the Intent Engine. You can skip this. Agents, Talk and the Director do not need it.
7. **All set!** Click **Show me** and Cadence opens the panel so you can start your first agent.

You can replay onboarding later from **Settings → About → Replay Setup**.

## Permissions

| Permission | Why Cadence needs it |
|---|---|
| **Microphone** | Record your voice for dictation and Talk. |
| **Accessibility** | Type text into other apps. |
| **Input Monitoring** | Detect the hotkey anywhere on the system. |

If you skip one, the main window shows a **Permissions needed** banner. Click **Fix**, or grant it in **System Settings → Privacy & Security**, then quit and reopen Cadence.

macOS may also ask for these when you first use the matching feature:

- **Screen Recording**, the first time Cadence takes a screenshot for Talk or a region capture.
- **Automation** for Terminal, the first time Cadence opens or puts away terminal windows for you.

## Updating

Cadence checks GitHub Releases for a new version when it launches. When one is available, the main window shows a banner. Open **Settings → About**, click **Install Update** once the download finishes, and drag the new Cadence into Applications. Turn off the check with **Auto-check on launch** in the same section.

## Uninstall

Quit Cadence first, then:

```sh
rm -rf /Applications/Cadence.app
rm -rf ~/Library/Application\ Support/com.cadence.app
```

The second line removes your settings, downloaded models, saved recordings and agent metadata. If you used git worktrees for agents, they live in `~/.cadence/worktrees/`. Check for branches you still want before deleting that folder.

Next: [Quickstart](#/quickstart).
