# Continue in the cloud

When your Mac falls asleep, loses its connection or shuts down, the agents on it stop where they are. Continue in the cloud lets you pick a Claude Code agent up in a private cloud sandbox, keep working with it from your phone, and hand the work back to your Mac when it wakes.

It is part of the [iPhone app](#/iphone), and for now it's a preview for TestFlight testers: the option appears only on Macs paired with a TestFlight build of the app.

## How it works

1. **Your Mac keeps a copy ready.** While the iPhone relay is on, Cadence keeps an end-to-end encrypted copy of each Claude Code agent at the relay and updates it as the agent works. The copy holds the repository's current commit, your uncommitted changes, the conversation so far, and your Claude Code instructions: `~/.claude/CLAUDE.md`, the project's memory folder, and a few settings such as your model and permission rules.
2. **The phone notices the Mac is gone.** When your Mac stops answering, its agents show **Mac asleep** in the app. Open one and tap **Continue in the cloud**.
3. **A sandbox takes over.** Cadence starts a private sandbox for that one agent: a small isolated Linux machine on Vercel Sandbox. It rebuilds the repo at the same path, restores the conversation and resumes it with Claude Code. The agent gets a **Cloud** chip, and you message it, answer its questions and approve its tools from your phone as usual.
4. **Your Mac takes it back.** When your Mac is back, Cadence brings the agent home. It writes the files the agent changed, adds the agent's commits to your branch with the same commit hashes, and swaps in the longer conversation, so the agent resumes on your Mac where the cloud stopped. Anything you send while it is on its way back waits and runs on your Mac.

## What can come along

- **Claude Code agents**, both the ones Cadence hosts and Claude Code running in herdr. Other CLIs stay on your Mac.
- **Agents in a git repository.** An agent working outside one stays on your Mac, and the app says why.
- **Up to 300 MB of repository and 100 MB of uncommitted changes.** A bigger repo stays on your Mac.
- **Agents active in the last three days.** Older ones are not kept at the relay.

## What the cloud copy can and can't do

- It works on a shallow copy of your repo with no git remote. It can read, edit, run commands and commit, but it can't push, pull or open pull requests. Its commits reach your Mac when the agent comes home.
- It has only what is in the copy and what the sandbox provides. Your other folders, local services, databases, MCP servers and secrets that live on your Mac are not there.
- Tool approvals follow the agent's permission mode, and requests come to your phone as **Allow** and **Deny**.
- The sandbox stops after 15 minutes without activity.

## If your Mac changed in the meantime

Before writing the cloud's changes, Cadence saves anything your Mac changed after the copy was taken as a patch in `~/Library/Application Support/Cadence/cloud-backups/`.

If the branch moved on your Mac while the agent was in the cloud (for example, you committed there), Cadence doesn't overwrite it. You get a notification, and the cloud's work keeps waiting.

## Privacy

- The copy at the relay is sealed on your Mac with AES-256-GCM. Each agent has its own key, derived from your pairing, so the relay stores data it can't read.
- When you tap **Continue in the cloud**, your phone sends that one agent's key through the relay to its new sandbox. The sandbox decrypts that agent's copy and works on it in the clear, like Claude Code on your Mac. It never gets the keys to your other agents.
- The sandbox runs in Vercel's San Francisco region. Its conversation goes to Anthropic through Claude Code. During the beta, cloud turns run on Cadence's own Claude Code login, not yours.
- When the agent comes home, Cadence deletes the sandbox and everything the cloud saved. If your Mac never takes it back, the stopped sandbox's disk is deleted after 14 days.
- Your Mac's encrypted copy of an agent is deleted when the agent ends or has been quiet for three days.

## Turning it off

**Settings → Injection → Integrations → iPhone relay → Continue agents in the cloud** appears once a TestFlight build of the iPhone app is paired. It's off for new installs. Turn it off and Cadence deletes every agent copy it keeps at the relay. The phone still reaches your Mac while it is awake.
