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

Cadence is not notarized by Apple yet, so macOS blocks it the first time you open it. To open it anyway:

1. In Finder, open **Applications**.
2. Right-click **Cadence** and choose **Open**.
3. Click **Open** in the dialog.

On newer macOS versions the dialog may only offer **Done**. In that case open **System Settings → Privacy & Security**, scroll down, and click **Open Anyway** next to the Cadence message.

You can also clear the quarantine flag from a terminal:

```sh
xattr -cr /Applications/Cadence.app
```

You only need to do this once.

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
