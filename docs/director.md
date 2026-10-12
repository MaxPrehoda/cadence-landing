# Director

The Director is a Claude session that works for you across all your agents. Ask it what is going on, or ask it to hand out work.

It runs on your Claude Code login like any other Cadence agent. It starts the first time you need it and stays around, so it remembers the conversation.

## Open the Director

- **Ask a question with [Talk](#/talk).** "What is everyone working on?" or "is anything stuck?" goes to the Director, and the panel opens on its thread.
- **From the Inbox panel.** The Director is listed with your agents. Click it to open its thread.

In its thread, type in the **Message the Director…** box, or click the mic to speak.

## What it can do

The Director has tools no other agent has:

| Tool | What it does |
|---|---|
| `list_agents` | See every agent with its title, recap and status |
| `agent_status` | Read what one agent is doing |
| `message_agent` | Send an agent a message |
| `spawn_agent` | Start a new agent |
| `kill_agent` | Stop an agent |

It sees agents in three places:

- **Cadence chat agents.** It can read, message and stop them.
- **Terminal agents in herdr.** It can read and message them by name, and close them.
- **Claude Code open in another terminal app.** It can read them, but cannot message them. Use [Talk](#/talk) to move one into herdr.

Looking is always allowed. Messaging, starting or stopping an agent shows up in your [Inbox](#/inbox) as a permission request unless the panel is set to **Auto**.

## Things to ask

- "What is everyone working on?"
- "Which agent touched the billing page today?"
- "Is anything blocked?"
- "Start an agent for this repo and have it fix the failing tests."
- "Tell the backend agent to add pagination, then check on it."

The Director answers briefly and names the agents it means. When work needs doing, it decides whether to give it to an existing agent or start a new one, and tells you which in one line.

## When the router is unsure

If you use Talk and two agents fit your request equally well, the router does not guess. It hands the request to the Director, which asks you in the Inbox with one numbered option per candidate. Pick one and the Director sends your request there. It does not do the work itself.
