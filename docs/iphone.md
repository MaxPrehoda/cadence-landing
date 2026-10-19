# iPhone

The Cadence iPhone app is in a **private beta on TestFlight** (version 0.4.0, iOS 17 or later). It takes your Inbox with you: see what your agents are doing, answer their questions and reply to finished work from your phone while your Mac does the work. [Join the waitlist](/#iphone) to hear when the beta opens up.

## Pair your phone

1. On the Mac, open **⋯ → Take Cadence with you…** on the toolbar, or the phone button in the Inbox panel header. A QR code appears.
2. Scan it with the iPhone's camera or from the app. The code works once and expires after 10 minutes.
3. That's it. Your phone gets its own key, and the Mac lists it under **Settings → iPhone relay → Paired phones**.

Traffic between your phone and your Mac is end-to-end encrypted. On the same Wi-Fi the phone talks to your Mac directly; away from home it goes through Cadence's relay, which only carries sealed messages it can't read. Your Mac never opens a port.

To stop a phone reaching your Mac, press **Remove** next to it in Paired phones, or **Unpair** in the phone's Settings.

## What you can do from the phone

- **Home** opens on what needs you: questions waiting for an answer, then finished work, then what's still working. Tap an option to answer. Every answer waits two seconds, so **Undo** takes it back.
- **Agents** lists every agent by what it's working on, grouped by machine when you run [agents on a server](/guides/coding-agents-on-a-server). Open one to read its thread, see its changes file by file, or reply with text, voice or a picture.
- **Talk**: say or type one request and Cadence sends it to the agent already on that work, starts a new one, or asks the Director. The receipt names the agent it went to.
- **Widgets and Siri**: a Home Screen widget and Lock Screen widgets show what's waiting. Say "Talk to Cadence", or use the Talk control in Control Center, on the Lock Screen or on the Action Button.
- **Notifications** carry the agent's real options as buttons. Answering from the Lock Screen asks for Face ID, and when previews are hidden the Lock Screen shows only that an agent needs you.
- **Dictation** and the Cadence keyboard type anywhere on the phone.

## Continue in the cloud

For TestFlight testers there's a preview of [continuing an agent in the cloud](#/cloud) when your Mac falls asleep. It appears only on Macs paired with a TestFlight build of the app.

## Requirements

- Cadence for Mac 0.5.7 or later (earlier versions pair, but without per-phone keys or Unpair)
- An iPhone on iOS 17 or later, with a TestFlight invite
