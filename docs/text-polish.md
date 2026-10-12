# Text Polish

Text Polish cleans up dictation before it is typed: punctuation, capitalization, sentence flow and filler words like "um" and "you know". It does not change what you meant.

## Local polish

Polish runs on your Mac with Qwen 2.5 1.5B, a small language model. It is on by default, but the model is a separate download of about 1.1 GB.

1. Open **Settings → Injection → Text Polish**.
2. If it says **Model not downloaded**, click **Download**.
3. Restart Cadence when the download finishes.

When the model is ready, the row shows **Qwen 2.5 1.5B** with a **Ready** badge. To turn polish off, switch off **Enable text polish**.

Polish runs on each piece of speech while you are still holding the key, so it adds little time after release. Until the model is downloaded, dictation is typed without polish.

## Per-app tone

Different apps want different writing. Set a tone per app in **Settings → AI → App Tone Profiles**:

| Tone | Use it for |
|---|---|
| **Casual** | Chat apps. Friendly, contractions are fine. |
| **Formal** | Email and documents. |
| **Technical** | Editors and docs. Keeps jargon and code terms as you said them. |
| **Raw (no polish)** | Terminals or anywhere you want your exact words. Skips polish entirely. |

- **Add Current App** adds a profile for the active app, set to Casual. Change the tone from the menu next to it.
- **Add Common Presets** adds Slack (Casual), Mail (Formal) and VS Code (Technical).
- Click **✕** to remove a profile.

Apps without a profile get the default polish.

## Cloud Polish (optional)

Cloud Polish sends the text through Claude Haiku after the local pass, for better grammar and sentence restructuring on longer dictation. It needs your own Anthropic API key and adds roughly 200 ms per dictation.

1. Get a key at [console.anthropic.com](https://console.anthropic.com).
2. Paste it into **Settings → AI → Anthropic API Key**.
3. Turn on **Settings → AI → Cloud Polish**.

With Cloud Polish on, the **transcribed text** is sent to Anthropic's API. Your audio is not. Transcription still happens on your Mac. See [Privacy](#/privacy).

Cloud Polish is off by default.
