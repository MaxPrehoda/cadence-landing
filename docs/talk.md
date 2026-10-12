# Talk

Talk is how you tell your agents what to do without picking one first. Say or type a request, and Cadence decides where it goes.

## Open Talk

- **Double-tap your hotkey** (`⌥` by default) anywhere. Both taps must land within 350 ms.
- Or use the **Talk** button on the [toolbar](#/toolbar): hold it while you speak and let go to send, or tap it to start and tap again to send.

A black pill appears near the middle of the screen with a live transcript.

| To | Do this |
|---|---|
| Send | Tap `⌥` or press `Return` |
| Send on release | Double-tap and keep holding `⌥` on the second tap, speak, let go |
| Type instead of speaking | Just start typing. The mic stops and its audio is dropped. |
| Cancel | `Esc`. Nothing is sent and nothing is typed anywhere. |

After sending, the keyboard goes back to the app you were in.

## Where your request goes

A Claude Haiku "router" reads your request and picks one of four outcomes:

| Outcome | When | Receipt |
|---|---|---|
| **Send** | An agent is already on that work: same feature, page, file, bug, branch or repo. Short follow-ups like "also make it blue" go where your last request went. | `Sent to claude-2, the landing page thread` |
| **Start** | New work that no agent owns. Cadence starts an agent in the right folder. | `Started pause-menu in ~/Developer/mushies` |
| **Ask** | A question about your agents or the work, like "what is backend doing?" or "is anything stuck?". | `Answering in Director` |
| **Clarify** | Two agents fit equally well, or the folder for new work is unclear. | The [Director](#/director) asks you in the Inbox with numbered options. |

When the router sends or starts, it rewrites your words into a clear instruction in your voice, keeping every detail you said. If you said "this" or "that", it uses the screenshot to name what you meant.

New agents use Claude Code unless you name another CLI, for example "start a Codex agent in the api folder".

If Cadence did not hear anything, the pill says **Didn't catch that**.

## What the router sees

To decide, the router gets:

- every agent's title, recap, status, folder, the last request it got and its latest output, including Claude Code sessions you opened yourself in another terminal
- your last few requests and where they went
- the app and window in front of you
- a screenshot of the display under your pointer (the Talk pill itself is hidden from it)
- the folders in `~/Developer` and the folders your agents work in

The agent only receives the screenshot when the router decides it needs to see the screen, for example for a visual bug. A region you captured with the camera button or `S` always goes along.

The router runs on your own Claude Code login (`claude -p --model haiku`). It does not need an API key. See [Privacy](#/privacy).

## Shortcuts that skip the router

Some requests are clear enough that Cadence acts on them directly:

- **Name the agent.** "claude-2, run the tests" or "tell backend to add pagination" goes straight to that agent.
- **Answer a waiting agent.** "approve" or "deny" (optionally with a name, like "deny backend, use yarn instead").
- **Check or stop.** "status", "status backend", "stop backend".

If the router cannot reach Claude, your request goes where the last one went, or to the Director.

## Claude Code open in another terminal

If the right agent is a Claude Code session you started yourself in Terminal, iTerm or another app, Cadence can see it but cannot type into it. The pill says it is open in that app and offers **Move to herdr and send**.

Press `Return` and Cadence ends that process, reopens the same conversation in herdr (`claude --resume`, keeping its model and permission flags), and sends your request there. Press `Esc` to leave it alone.

## Talk vs dictation

Talk and dictation use the same key but never mix:

- **Hold** `⌥`: [dictation](#/dictation). Your words are typed into the focused app.
- **Double-tap** `⌥`: Talk. Your words go to your agents.

Plain dictation never gets sent to an agent.
