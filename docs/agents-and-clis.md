# Agents and CLIs

Cadence works on top of the coding agents you already use. Claude Code runs natively inside Cadence, and other CLIs run in terminals managed by herdr.

## Start an agent

Open **New agent** from any of these:

- the **+** button in the Inbox panel header, or `⌘N` while the panel is open
- **⋯ → New agent…** on the [toolbar](#/toolbar)
- the empty dot in the agents pill, when you have no agents yet

Pick a CLI, enter a **Folder**, and optionally a **First message**, then start it.

You can also start agents by asking [Talk](#/talk) for new work, or by asking the [Director](#/director). The **+** row in the toolbar peek starts another agent of the kind you use in the folder you used last, with no form.

## Claude Code: two ways to run it

When you pick **Claude Code**, choose how it runs:

| | Terminal (default) | Cadence chat |
|---|---|---|
| Where it runs | Claude Code's own interface in a herdr terminal | A headless Claude Code session inside Cadence |
| Needs herdr | Yes | No |
| Opens in | A Terminal window | The panel next to the toolbar |
| Permission requests | Shown in the Inbox when Claude Code prints its numbered prompt | Real Allow/Deny cards, with your reason passed back on Deny |
| Git worktree per agent | No | Yes, by default |
| Diff and history | In your terminal | **Diff** and **History** tabs on the Agents board |

**Terminal** feels like the Claude Code you already know. **Cadence chat** gives Cadence the most structure to work with: exact questions and approvals, cost, and a separate worktree so two agents in one repo do not step on each other.

### Worktrees

With **Use a git worktree per agent** on (**Settings → Agents**), each Cadence chat agent started inside a git repo works on its own branch, `cadence/<name>-<id>`, in `~/.cadence/worktrees/`. Ending an agent does not delete its branch, so you can review and merge the work afterward.

## Other CLIs

These run in herdr and show up in the toolbar and Inbox like any other agent:

- Codex
- OpenCode
- Pi
- Omp
- Amp
- Grok
- Cursor
- Copilot
- Gemini

The CLI itself must be installed and signed in on your Mac. Cadence starts it in the folder you choose; it does not manage the CLI's own account or settings.

## herdr

[herdr](https://herdr.dev) is a free terminal runtime. Cadence uses it for terminal agents because it keeps each agent alive after you close its window, lets Cadence read the screen to tell whether an agent is working, waiting or done, and lets Cadence type answers into it.

If herdr is missing, the New agent view shows the install command:

```sh
curl -fsSL https://herdr.dev/install.sh | sh
```

Run it, then click **I installed it**. If herdr is installed but not running, click **Start herdr**.

Because herdr owns the processes, closing a terminal window or quitting Cadence does not stop your terminal agents. To stop one, end it from the toolbar or the Inbox.

## Claude Code you started yourself

Cadence also notices Claude Code sessions you opened in another terminal app. They appear in the agents list, the Director can read them, and Talk can [move one into herdr](#/talk) so Cadence can send it messages.

## Titles and recaps

Every agent gets a short title of two to five words, like "landing page download button", written by Claude Haiku from what the agent is doing. Titles lead the toolbar peek, the Inbox, the agents list and the terminal tabs. The agent's name stays beside it as a handle you can use with Talk.

If a CLI names its own session (Claude Code sets its terminal title), Cadence uses that name instead.

When an agent finishes with a long message, Cadence adds a recap of at most 25 words to its Inbox card.

## Signing in to Claude

Cadence uses the same login as the `claude` CLI. If you can run `claude` in a terminal, you are set.

To use a different method, open **Settings → Agents → Claude authentication**:

- **Claude subscription (recommended)**: your existing Claude Code login (Pro, Max, Team or Enterprise).
- **Long-lived OAuth token**: from `claude setup-token`.
- **Anthropic API key**
- **Gateway bearer token**: for LiteLLM or another gateway.
- **Rotating credential script**
- **Amazon Bedrock**, **Google Vertex AI**, **Microsoft Foundry**

Click **Test connection** to check it. If the test warns about a stale `ANTHROPIC_API_KEY`, that variable is overriding your subscription login. Unset it in your shell and try again.

If `claude` is not on your `PATH`, set **Binary path** under **Settings → Agents → Claude CLI**.
