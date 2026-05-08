# Troubleshooting

Most issues come down to one of: missing permission, wrong audio device, an out-of-date Whisper model, or a sandboxed app blocking keystroke injection. Work through the checklist below.

## Hotkey doesn't fire

- Confirm **Input Monitoring** is granted: System Settings → Privacy & Security → Input Monitoring.
- After granting, **fully quit and relaunch Cadence** (not just close the window).
- Check that no other app holds an exclusive event tap (some screen-recording or remote-desktop tools do).
- If using a chord, verify it isn't already bound by macOS or another running app.

## "Recording…" but no transcription

- Open **Settings → Audio → Input device**, make sure the right mic is selected.
- Speak louder, or lower **VAD threshold** in **Settings → Audio**.
- The default `silence_duration_ms` is 2000, if you trail off, Cadence may still be waiting. Lower it to 1200 if you talk in short bursts.

## Whisper hallucinates phrases like "Thanks for watching!"

This is a known Whisper artifact on near-silent audio. Cadence already filters the most common ones. If a real phrase you use is being suppressed, file an issue. The suppression list is intentionally short.

## Text inserts at the wrong cursor / nothing inserts

- Confirm **Accessibility** permission is granted.
- Some apps (sandboxed inputs, certain 1Password fields) block synthesized keystrokes. Try **Settings → Injection → Use clipboard** to switch to paste mode.
- If you're in a terminal, the polish pipeline may be inserting smart quotes that the shell rejects. Set the per-app tone for that terminal to **raw**.

## Wake word never triggers

- Confirm **Wake word enabled** is on in **Settings → Voice**.
- Speak the wake word with a clear pause after it: `"Hey Cadence,"` then your command.
- The wake word reuses the Whisper pipeline, so it inherits all of Whisper's noise sensitivity. Try a quieter environment or a larger model.

## Agent commands don't work

- Confirm the `claude` CLI is installed and on your `PATH`. Run `which claude` in a terminal, if it returns nothing, install via `npm i -g @anthropic-ai/claude-code` or set the path manually in **Settings → Agents → CLI path**.
- Confirm your auth mode in **Settings → Agents → Auth**. Try a quick smoke test: `claude -p "say hi"` from a terminal.
- If a spawn announces "ready" but turns time out, check for firewall blocks on outbound HTTPS to `api.anthropic.com`.

## Indicator pill is in the wrong place

- It anchors to the bottom-center of the **current monitor**, 70px above the Dock.
- If you've moved the Dock to a side, the math still uses bottom-center; this is a known limitation.
- Hide it entirely with **"hide indicator"** or in Settings.

## Agent dashboard opens on the wrong display

**Settings → Agents → Dashboard monitor preference**: choose primary, current, or a specific display.

## "claude_session" actions fail in the intent engine

The `claude_session` action shells out to the same `claude` CLI as agents. If standalone agents work but `claude_session` doesn't, check that the working directory you're invoking from has appropriate file permissions, `claude` will refuse to run in a directory it can't read.

## Logs

When in doubt, check the log file:

```sh
~/Library/Logs/com.cadence.app/cadence.log
```

Or run Cadence from the terminal to see logs live:

```sh
/Applications/Cadence.app/Contents/MacOS/Cadence
```

## Reset

To wipe Cadence back to defaults without uninstalling:

```sh
rm ~/Library/Application\ Support/com.cadence.app/settings.json
```

## Still stuck

- File an issue at <https://github.com/MaxPrehoda/cadence/issues>
- Include macOS version, Cadence version (top-left of the indicator), and the relevant snippet from the log.
