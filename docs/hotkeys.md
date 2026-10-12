# Hotkeys

Cadence uses one key for two jobs. The default is `⌥` (Option).

| Gesture | What happens |
|---|---|
| **Hold** the key (longer than 200 ms) | [Dictation](#/dictation). Speak, release, and your words are typed into the focused app. |
| **Double-tap** the key (both taps within 350 ms) | [Talk](#/talk). Say or type a request for your agents. |
| **Tap** the key while Talk is open | Send the request. |
| **Double-tap and hold** | Talk, sent when you let go. |
| A quick tap, or a shortcut such as `⌥←` | Nothing. The recording is cancelled and nothing is typed. |

## Change the key

Open **Settings → Hotkey → Push-to-Talk Key**.

- Click a preset: **⌥ Option**, **⌘ Cmd**, **⌃ Control**, **⌘⌥** or **⌃⌥**.
- Or click **Record** and hold the combination you want, up to three modifiers. Click **Cancel** to stop recording without changing it.

The same key is used for both dictation and Talk. The **Talk to your agents** section below it shows the current double-tap trigger.

Option is recommended because it rarely clashes with app shortcuts. Command works, but you use it in shortcuts all the time. A hold that turns into a shortcut, like `⌘C`, is cancelled and types nothing.

## Other keys

These only work when the matching Cadence window is in front.

**Inbox panel**

| Key | Action |
|---|---|
| `1` to `9` | Pick an option or suggested reply |
| `J` / `K` | Next / previous card |
| `E` | Skip or clear the card |
| `Space` | Type a reply |
| `V` | Speak a reply |
| `S` | Capture a screen region |
| `↑` | Open the agent's thread |
| `Esc` | Undo an answer within two seconds, or close |
| `⌘N` | New agent |

**Talk pill**

| Key | Action |
|---|---|
| `⌥` (tap) or `Return` | Send |
| `Esc` | Cancel |
| `Return` | **Move to herdr and send**, when offered |

## Permission

The global hotkey needs **Input Monitoring**. If you skipped it during onboarding, open **System Settings → Privacy & Security → Input Monitoring**, turn on Cadence, then quit and reopen Cadence.

Cadence listens for the key in two ways at once: an event tap, and a fast check of the modifier keys' state as a backup. If macOS turns off the event tap (Secure Input, screen sharing, sleep and wake), the hotkey keeps working.

## If the hotkey does not work

- Check that Input Monitoring is on for Cadence, then quit and reopen it.
- Some remote-control and screen-sharing apps grab the keyboard. Quit them and try again.
- If permissions look granted but nothing works after an upgrade, see [Troubleshooting](#/troubleshooting).
