# Privacy

This page lists what Cadence keeps on your Mac and what it sends elsewhere. Short version: your voice and your dictation stay on your Mac. Agent features use Claude through your own Claude Code login. A few optional features use your own Anthropic API key.

Cadence has no account, and Cadence does not run its own server that collects your data or usage.

## Stays on your Mac

- **Microphone audio.** Speech detection (Silero VAD) and transcription (Parakeet, or Whisper if you pick it) run on your Mac. Audio is never uploaded.
- **Dictation.** The transcribed text is typed into your app. Your last 50 dictations are kept in your local settings file.
- **Text Polish.** The local Qwen 2.5 1.5B model runs on your Mac.
- **Voice commands.** Built-in and custom commands are matched locally.
- **Spoken updates.** Read aloud with built-in macOS voices.
- **Notes, settings, sets and agent titles.** Stored in `~/Library/Application Support/com.cadence.app/`.
- **Saved recordings.** Only if you turn on **Save recordings**, and only in that same folder.
- **Worktrees and diffs.** In your own git repositories and `~/.cadence/worktrees/`.

## The microphone

So that your first word is not cut off, the microphone stays open while Cadence runs and the last half second of audio is held in memory. That audio is thrown away unless you press the hotkey or start Talk. It is never written to disk unless **Save recordings** is on. macOS shows its microphone indicator while the mic is open.

With hands-free listening (off by default), everything you say is transcribed on your Mac so Cadence can look for commands. See [Voice commands](#/voice-commands).

## Sent to Claude through your Claude Code login

These features call Claude using the `claude` CLI and the login you already have (or the method you picked in **Settings → Agents → Claude authentication**). They do not need the API key from Settings → AI.

| Feature | What is sent |
|---|---|
| **Agents** | Whatever you send an agent, plus whatever the agent reads in your project while it works. |
| **Director** | Your messages to it, and what it reads about your agents. |
| **Talk router** | Your request as text; each agent's title, recap, folder, last request and latest output; your last few requests; the name of the app and window in front of you; a screenshot of the display under your pointer; folder names from `~/Developer`. |
| **Titles and recaps** | Recent output from each agent, to write its title and recap. |

Talk sends your words as text after they are transcribed on your Mac. It never sends audio.

Other CLIs (Codex, OpenCode, Gemini and so on) talk to their own providers under their own accounts, just as they do outside Cadence.

## Sent to Anthropic only with your API key

These are off unless you add an Anthropic API key in **Settings → AI**. They use your key and call Anthropic's API directly.

| Feature | What is sent | When |
|---|---|---|
| **Cloud Polish** | The transcribed text of each dictation (no audio) | Only if you turn on Cloud Polish |
| **Intent Engine** | The command you said, the active app and window title, and when relevant your selected text and clipboard | When a command after the command word is not recognized |
| **Spoken summaries** | A long agent message, to summarize before reading it aloud | When spoken updates are on and the message is long |

## Other network connections

- **Model downloads** from Hugging Face, when you download a speech or polish model.
- **Update check** to GitHub Releases when Cadence launches, unless you turn off **Auto-check on launch**.
- **Slack**, only if you add a Slack bot token for the Intent Engine.
- **Browser control** connects to Chrome on your own Mac (localhost), only if you set it up.

## iPhone

The iPhone app is [not available yet](#/iphone). It is designed to connect to your Mac directly on the same Wi-Fi, or through a relay that only passes end-to-end encrypted data it cannot read. We will document it in full when it ships.

## Permissions

| Permission | Used for |
|---|---|
| **Microphone** | Dictation and Talk |
| **Accessibility** | Typing text into other apps |
| **Input Monitoring** | The global hotkey |
| **Screen Recording** | Screenshots for Talk and region capture, if you use them |
| **Automation** | Controlling Terminal for sets, and Mail or Messages for the Intent Engine, if you use them |

You can turn any of these off in **System Settings → Privacy & Security**. The features that need them stop working, and the rest keep going.

## Questions

Email <privacy@cadence.app>.
