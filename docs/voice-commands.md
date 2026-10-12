# Voice commands

Before Cadence focused on agents, it was a voice control app for the Mac. Those features are still here. They are optional, and most people never need them.

This page covers:

- **Command word**: start a dictation with "computer" to run a command instead of typing.
- **Built-in and custom commands**: open apps, search, control tabs and VS Code, take notes.
- **Hands-free listening**: use Cadence without holding a key. Off by default.
- **Intent Engine**: send commands Cadence does not recognize to Claude. Needs your API key.
- **Spoken updates**: hear agents finish and ask for approval.

To talk to your agents, use [Talk](#/talk). It is a better fit for that than these commands.

## The command word

Hold your hotkey and start with the command word, then say the command:

> Computer, open Safari

Without the command word, your speech is typed as normal [dictation](#/dictation). The default word is **computer**. Change it in **Settings → Commands → Wake Word**. Cadence also accepts a trailing "s", because speech models sometimes hear "computers".

Built-in and custom commands are matched on your Mac, with no model call.

## Built-in commands

The full list is in **Settings → Commands → Built-in Commands**.

**Apps**

| Say | What happens |
|---|---|
| "open Safari" | Launch or focus an app. "launch" and "start" also work. |
| "switch to Slack" | Focus an app |
| "open Chrome and Notion" | Open several apps |
| "open work apps" | Open a named app group (see below) |

**Search**

| Say | What happens |
|---|---|
| "search for rust async patterns" | Google search in your default browser. "search", "google" and "look up" also work. |

**Tabs and windows**

| Say | What happens |
|---|---|
| "new tab" | `⌘T` |
| "close tab" | `⌘W` |
| "close window" | `⌘⇧W` |
| "split view" | VS Code on the left, browser on the right, with your localhost tab in front |

**VS Code** (when it is the active app)

| Say | What happens |
|---|---|
| "open terminal" | Toggle the integrated terminal |
| "search for file parser" | Quick Open with that name |
| "command palette" | `⌘⇧P` |
| "toggle sidebar" | `⌘B` |
| "go to line 42" | Jump to a line |
| "close all editors" | Close every tab |
| "split editor" | Split the editor |
| "zen mode" | Toggle Zen mode |
| "focus explorer" | `⌘⇧E` |

**Notes and other**

| Say | What happens |
|---|---|
| "take a note, call Dana about the budget" | Save a note. A sticky note pops up to confirm. |
| "make a todo to clean my room" | Save a to-do |
| "hide indicator" / "show indicator" | Hide or show the toolbar |
| "stop speaking" / "be quiet" | Stop spoken updates that are playing |

Notes and to-dos appear in the **Notes** tab of the main window.

Cadence strips filler before matching, so "could you please open up Safari for me" works the same as "open Safari".

## Custom commands

Add your own in **Settings → Commands → Custom Commands**:

- **Trigger phrase**: what you say after the command word, for example "screenshot".
- **Action type**: **Open App**, **Keyboard Shortcut** (like `Cmd+Shift+4`) or **Insert Text**.

Click **Add Command**. Then "computer, screenshot" runs it.

## App aliases

If Cadence mishears an app name, or you call an app something else, map it in **Settings → Commands → Custom App Aliases**. For example, spoken name "browser" opens "Arc".

## App groups

In **Settings → Commands → App Groups**, give a group a name and a comma-separated list of apps. Then "computer, open work apps" opens all of them.

## Hands-free listening

Cadence can also listen without a key press. When it is on, the microphone stays open and Cadence handles each thing you say as if you had held the key. If you start with "Hey Cadence" (also "Cadence," or "Okay Cadence"), that part is removed before the rest is handled.

It is off by default. Turn it on with **Settings → Agents → Wake word → Enable "Hey Cadence" always-on activation**. Holding the key keeps working as usual. Treat it as experimental.

Keep in mind:

- Anything it hears that is not a command is typed into the focused app, like dictation.
- The microphone stays open the whole time. Audio is processed on your Mac and is not saved unless **Save recordings** is on.
- It uses more battery and CPU than holding a key, and it is less reliable in noisy rooms.

Holding a key is the recommended way to use Cadence.

## Intent Engine

When a command after the command word does not match anything built in, the Intent Engine can send it to Claude Haiku, which plans a sequence of actions that Cadence then runs on your Mac. For example:

- "computer, make this more formal" (rewrites the selected text)
- "computer, translate this to French"
- "computer, run the tests"
- "computer, read my last three emails"

The Intent Engine needs your own Anthropic API key in **Settings → AI → Anthropic API Key**. With a key, it is on by default; turn it off with **Settings → AI → Intent Engine**.

For each request, Claude receives the words you said plus context from your Mac: the active app and window title, and, when relevant, your selected text and clipboard. It never receives audio.

It can use these kinds of actions:

| Area | Actions |
|---|---|
| System | Open apps, files and URLs, press shortcuts, type text, read or replace the selection, read or write the clipboard, run shell commands |
| Text | Rewrite text with an instruction |
| Browser | Find and click elements, read the console and styles, navigate, take screenshots. Needs Chrome started with `--remote-debugging-port=9222`. Change the port in **Settings → Injection → Integrations**. |
| Mail and Messages | Read, send, draft and reply to email in Mail; send and read iMessages. macOS asks for Automation permission the first time. |
| Slack | Send and read messages, list channels. Needs a Slack bot token in **Settings → Injection → Integrations**. |
| Obsidian | Create, append to and read notes. Set your vault first: "computer, set obsidian vault to ~/Documents/Vault". |

The Intent Engine can run shell commands and send messages for you. Only turn it on if you are comfortable with that.

## Spoken updates

Cadence can speak when an agent finishes or asks for approval, using a built-in macOS voice. Configure it in **Settings → Agents → Text-to-speech**: on or off, **Voice**, **Rate (wpm)** (default 190) and **Output device**, for example to send agent updates to headphones.

Short messages are read in full. For messages over about 180 words, Cadence says the agent finished. If you have an Anthropic API key set, it reads a short summary written by Claude Haiku instead.

Mute spoken updates any time with the speaker button in the Inbox panel header, or by saying "computer, stop speaking".
