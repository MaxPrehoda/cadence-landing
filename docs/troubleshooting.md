# Troubleshooting

Most problems come down to a missing permission, the wrong microphone, or the `claude` CLI not being signed in. Start with the section that matches what you see.

## macOS says Cadence can't be opened

Cadence is not notarized yet. Right-click **Cadence** in Applications and choose **Open**, or click **Open Anyway** in **System Settings → Privacy & Security**. You can also run:

```sh
xattr -cr /Applications/Cadence.app
```

See [Installation](#/installation).

## The hotkey does nothing

- Check **Input Monitoring** in **System Settings → Privacy & Security**. After turning it on, quit and reopen Cadence.
- Remote-control and some screen-sharing apps can grab the keyboard. Quit them and try again.
- Make sure you are holding the key for longer than 200 ms. A quick tap is ignored on purpose.

## Permissions look granted but still fail

This can happen after upgrading from an older build: macOS keeps a cached "denied" decision. Open **Settings → Permissions**, click **Reset TCC Permissions**, then quit and reopen Cadence and grant the permissions again.

## Recording works but no text appears

- Check the main window for a banner saying there is no speech model, and click **Download**.
- Open **Settings → Audio** and check which microphone it says it is **Recording from**. Pick the right one under **Input device**.
- AirPods and other Bluetooth headsets lower mic quality. Leave **Prefer the built-in mic over Bluetooth headsets** on.
- Look at the **Log** tab in the main window for errors, or start Cadence from a terminal to see full logs (see below).

## Text goes to the wrong place, or nowhere

- Check **Accessibility** in **System Settings → Privacy & Security**. Cadence pastes text with `⌘V`, which needs it.
- Click into the text field before you start speaking. Text goes to whatever has focus when the transcript is ready.
- In a terminal, polish can change punctuation you did not want changed. Add a **Raw (no polish)** tone for that app in **Settings → AI → App Tone Profiles**.

## A word is always wrong

Add it to **Settings → Commands → Vocabulary**. If one phrase is always heard as another, add an **Auto-Corrections** rule. See [Dictation](#/dictation).

## Agents don't start, or Talk can't route

- Run `which claude` in a terminal. If it prints nothing, install Claude Code, or set **Settings → Agents → Claude CLI → Binary path**.
- Run `claude` once in a terminal and make sure you are signed in.
- Open **Settings → Agents** and click **Test connection**. If it warns about a stale `ANTHROPIC_API_KEY`, unset that variable in your shell. It overrides your subscription login.
- If Talk can't reach Claude, it sends your request to where the last one went, or to the Director. Fix the login and try again.

## Terminal agents or other CLIs won't start

- herdr must be installed and running. The New agent view shows the install command and a **Start herdr** button when needed.
- The CLI itself (Codex, OpenCode and so on) must be installed and signed in. Try starting it once in a normal terminal.

## An agent is stuck waiting

- Open the [Inbox](#/inbox). There may be a question or permission request you have not answered.
- If the panel is on **Ask**, every tool call needs your OK. **Edits** lets file edits through and still asks before running commands.
- Open the agent's thread and click **Stop** to end the current turn.

## Talk sends to the wrong agent

- Name the agent: "claude-2, run the tests" or "tell backend to add pagination" always goes to that agent.
- Look at the agents' titles in the toolbar peek. If two agents look like the same work, close the one you no longer need.

## Screenshots or region capture don't work

macOS needs **Screen Recording** permission for Cadence to take screenshots. Turn it on in **System Settings → Privacy & Security → Screen Recording**, then quit and reopen Cadence.

## Sets don't put windows away or bring them back

macOS asks whether Cadence may control Terminal. If you clicked **Don't Allow**, turn it on in **System Settings → Privacy & Security → Automation → Cadence → Terminal**.

## The toolbar is gone

- You may have hidden it from the **⋯** menu. Turn on **Settings → About → Show floating indicator**.
- If you picked **Hide for a while**, it comes back on its own.
- If you disconnected the display it was on, it moves to another display.

## Logs

The **Log** tab in the main window shows recent activity. For full logs, quit Cadence and start it from a terminal:

```sh
/Applications/Cadence.app/Contents/MacOS/Cadence
```

## Reset to defaults

Quit Cadence, then:

```sh
rm ~/Library/Application\ Support/com.cadence.app/settings.json
```

This resets settings and onboarding. Downloaded models are kept.

## Still stuck

Email <support@cadence.app> with your macOS version, your Cadence version (**Settings → About**) and the relevant part of the log.
