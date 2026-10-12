# Inbox

The Inbox is where every agent's questions and finished work land. You answer from one place instead of hunting through terminal tabs.

Open it with the **Inbox** button at the top of the [toolbar](#/toolbar), or the **Inbox** button in the main window's title bar. It opens in a panel beside the toolbar.

## What lands here

| Card | What you see | How you answer |
|---|---|---|
| **Question** | The agent's question with numbered options. One may be marked **(Recommended)**. | Pick an option, or type your own answer. |
| **Plan approval** | The plan an agent wants to carry out. | **Approve the plan** or **Keep planning**. |
| **Permission** | A tool the agent wants to run, for example a shell command. | **Allow** or **Deny**. |
| **Finished** | The agent's last message, with a one-line recap when it is long. | Reply, use a suggested reply, or clear it. |

Questions from terminal agents (Codex, OpenCode and others in herdr) show up the same way when the CLI prints numbered options.

Each card shows a short thread: your last message to the agent and the agent's reply, so you have context before you answer.

## Keyboard

| Key | Action |
|---|---|
| `1` to `9` | Pick that option, or that suggested reply |
| `J` / `K` | Next / previous card |
| `E` | Skip a question, or clear a finished card |
| `Space` | Start typing a reply |
| `Return` | Send what you typed |
| `V` | Speak your reply (press again to stop) |
| `S` | Capture a region of the screen and attach it to your reply |
| `↑` | Open the agent's full thread |
| `Esc` | Take back an answer in its first two seconds, otherwise close the panel |
| `⌘N` | Start a new agent |

## Taking an answer back

After you answer, the card shows **Answer sent** with a two-second progress bar and **esc to undo**. Press `Esc` before the bar fills and nothing is sent.

If you close the panel or move to another card during those two seconds, the answer is sent right away.

## Typed answers

- On a **question**, your text is sent as the answer.
- On a **plan**, text starting with "yes", "approve" or "go" approves it. Anything else keeps the agent planning and passes your text along as feedback.
- On a **permission** request, text starting with "yes", "allow", "approve" or "ok" allows it. Anything else denies it and gives the agent your text as the reason, for example "no, use yarn instead".

## Finished work

A finished card shows the agent's message and, for long messages, a recap of at most 25 words written by Claude Haiku. Suggested replies appear only when they make sense: when the agent asked a yes/no question, offered a choice, or reported a failure. Otherwise you just get the reply box.

A finished card counts as read once you move past it, switch view, or close the panel.

When nothing is waiting, the Inbox says **Nothing needs you.**

## The agents list

Below the cards is every agent, grouped by where it runs. Each row shows the agent's status dot, its CLI, its title and name, its branch, how long ago it was active, and a preview of what it is doing.

- Click a row to open the agent's thread.
- Click the mic on a row to open that agent and start speaking to it.
- Click **×** twice to end the agent.
- A blue **n queued** pill means you sent messages while it was busy. They go through as soon as the current turn ends, even if Cadence restarts in between.

## The panel header

- **Ask / Edits / Auto** sets how much Cadence chat agents may do without asking. Click to cycle.
  - **Ask**: every tool call asks first.
  - **Edits**: file edits go through, commands still ask.
  - **Auto**: never asks. Use with care.
- The **speaker** button mutes or unmutes spoken updates.
- **+** starts a new agent.

Read-only tools (Read, Glob, Grep, WebFetch, WebSearch) are allowed without asking by default. Change this in **Settings → Agents**.
