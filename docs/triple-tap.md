# Triple tap

Triple tap shows every agent on one screen, with the microphone on. It is the place to see what all of your agents are doing and to answer the ones waiting on you, without opening each one.

## Open it

Tap your hotkey three times (`⌥` by default). The second tap opens [Talk](#/talk) as usual; a third press within 350 ms of letting go turns it into triple tap. Typing in between cancels it.

| To | Do this |
|---|---|
| Move between agents | Arrow keys |
| Give an agent the whole screen | Click its tile, or `Return` on it |
| Step back | `Esc`: out of a message box, then out of a full-screen agent, then out of triple tap |
| End triple tap | `Esc`, **End session**, or your hotkey |

Leaving triple tap stops the microphone and puts the keyboard back in the app you were in. Work you already sent keeps going.

## What you see

- **A tile for every agent**, sized by how much it is doing. An agent writing code right now gets more of the screen than one idle since yesterday, and one waiting on you is lifted. Tiles re-balance every few seconds, never while your pointer is over them.
- **What each agent is doing** in plain words, like "Editing sign-in.svelte" or "Running pnpm test", with its latest output on larger tiles.
- **A live summary** across the top: what just finished, the decisions agents made, and who is **held up** waiting on you.
- **The Director** at the top right. Speak or type a request and it goes where it belongs, the same way [Talk](#/talk) routes it. A request you send flies to the agent that took it.

## Act on an agent

Every tile has its own controls:

- **Message box**: type to that agent and press `Return`. Your spoken draft is left alone.
- **Talk**: what you say goes straight to that agent, skipping the Director, until you choose **Back to Director**.
- **Full screen**: the agent's full output and a bigger message box. **Open in its own window** leaves triple tap for it.
- **End**: stops the agent, after you confirm.

A held-up agent in the summary has **Answer here**, which opens its tile full screen with the message box ready, and **Jump in**, which opens it in its own window.

## Sending what you say

The microphone stays on. When what you said reads as a complete request, a five-second preview counts down before it sends. Keep talking or edit the draft to stop the countdown; **Keep talking** holds auto-send until you send it yourself. Discarded and canceled drafts can be restored from **Draft history**.
