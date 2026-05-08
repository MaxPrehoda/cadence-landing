# Agents

Cadence is an orchestrator for Claude Code agents. You spawn them, address them by name, approve or deny their tool calls, and review their diffs — all by voice.

## Setup

Agents require the `claude` CLI on your `PATH`. If it's installed in a non-standard location, set **Settings → Agents → CLI path**.

You'll also need to be authenticated with Claude. Cadence supports two auth modes:

- **Anthropic API key** — paste in **Settings → Agents → Auth → API key**
- **Claude Pro / Max subscription** — log in via the OAuth flow in the same panel

The selected mode is passed through to every spawned `claude -p` process.

## Spawn

> "New agent named Frontend in `~/code/my-app`"

Recognized phrasings:

- `new agent`, `create an agent`, `spawn an agent`, `make a new agent`, `start a new agent`, `add an agent`, `open an agent`
- Name marker: `named` or `called`
- Location marker: `in`, `on`, `at`, `under`, `inside`, `into`

So all of these are valid:

```
"create a new agent called Backend in ~/code/api"
"spawn an agent on ~/code/web that's called Frontend"
"new agent in ~/code/infra named Ops for team Platform"
```

When the agent finishes spawning, Cadence speaks `"<name> ready in <dir>."`.

### Worktrees

By default each agent runs in its own git worktree on a dedicated branch — so two agents in the same repo don't trample each other. Disable in **Settings → Agents → Worktrees**.

### Teams

Teams are named groupings (with color and icon) for organizing agents on the dashboard. Set the active team in the dashboard sidebar, or specify one at spawn time:

> "New agent named API in ~/code/api for team Platform"

The team phrase is fuzzy-matched against your team list.

## Direct turn

Once an agent is running, address it by name:

> "Frontend, add a dark mode toggle to the settings page"

Cadence routes the rest of the utterance as a new turn to the named agent. Names are fuzzy-matched (exact → prefix → Jaro-Winkler) so "front end" resolves to "Frontend".

If you don't say a name, Cadence routes to the **last addressed agent** — useful for follow-ups:

> "Frontend, what files did you change?"
> "Add a test for the dark mode toggle"   *(routed to Frontend)*

The "sticky" routing window is bounded; after a minute of silence you'll need to say the name again.

## Approve / deny tool calls

When an agent wants to run a tool that requires permission (Edit, Write, Bash, etc.), Cadence speaks:

> "Frontend wants to run Bash: `npm install date-fns`. Approve or deny?"

Answer:

- "approve" / "yes" — run the tool
- "deny" / "no" — reject it
- "deny Frontend, use yarn instead" — reject with a message the agent sees as tool feedback

If multiple agents are waiting on approval, name the one you mean: "approve Backend".

### Auto-allow read tools

Read-only tools (`Read`, `Glob`, `Grep`, `WebFetch`, `WebSearch`) are auto-approved by default so you aren't voice-prompted every time an agent looks at a file. Disable in **Settings → Agents → Auto-allow reads**.

## Reply to a finished agent

If an agent has finished its turn and is sitting idle, you can send another prompt with the explicit **reply** form:

> "Reply to Frontend, also add a system theme option"

This is the same as direct-turn syntactically but works even when the agent name happens to overlap with a command keyword.

## Status / inspection

| Phrase | Effect |
|---|---|
| "Status" | Speak status of the active agent |
| "Status Frontend" | Speak status of a specific agent |
| "Show diff for Frontend" | Open dashboard with that agent's Diff tab focused |
| "What did Frontend change" | Same |
| "What did Backend do" | Same |

## Stop

| Phrase | Effect |
|---|---|
| "Kill Frontend" | Terminate the named agent |
| "Stop Frontend" | Same |
| "Close Frontend" | Same |
| "Close all" / "Kill all" / "Close all agents" | Stop every agent |

Killing an agent does **not** clean up its worktree — the branch and changes remain so you can review and merge (or discard) afterward.

## Dashboard

The dashboard window auto-opens on the configured monitor when you spawn the first agent. Disable autoshow in **Settings → Agents → Dashboard auto-open**.

The dashboard has tabs per agent for Diff, History, and live output. You can also pin / unpin lanes, drag to reorder, and switch between teams.

## Hooks

Cadence ships a custom `cadence-hook` binary that the spawned `claude` process invokes on every PreToolUse / PostToolUse / Stop event. This is what powers the voice approval flow and the history/diff capture. The hook is wired up automatically — no configuration needed.
