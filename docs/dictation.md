# Dictation

Hold a key, speak, let go, and your words are typed into whatever app has focus: a text field, an editor, a browser, a terminal prompt. Speech recognition runs on your Mac.

## Two ways to dictate

- **Hold to talk.** Hold `⌥` (or your chosen [hotkey](#/hotkeys)), speak, and release. Your text appears at the cursor.
- **Continuous.** Click the **mic** button on the [toolbar](#/toolbar) to start, and click it again to stop. Good for long passages.

A quick tap of the hotkey, or a shortcut that uses it (like `⌥←`), types nothing. Cadence throws that audio away.

You can also speak to agents directly: press `V` in the [Inbox](#/inbox), or click the mic in an agent's thread or terminal. The words go into that reply box instead of the app in front.

## How it works

1. **Capture.** Cadence keeps the half second before you pressed the key, so your first word is not clipped, and up to 600 ms after release while you finish a word.
2. **Speech detection.** Silero VAD, a small neural model running on your Mac, finds where you are speaking and where you paused.
3. **Transcription while you talk.** Each piece is transcribed at the next pause while you are still holding the key, so on release only the last bit is left.
4. **Recognition.** NVIDIA Parakeet TDT 0.6B v2 turns speech into text. If you have a Whisper Large v3 Turbo model downloaded, it double-checks words that might be from your vocabulary.
5. **Text Polish.** An optional local model fixes punctuation, capitalization and filler words. See [Text Polish](#/text-polish).
6. **Typing.** The text is pasted at your cursor.

On Cadence's own test set, this setup measured 1.88% word error rate on clean read speech, about 330 ms from release to text at the 95th percentile, and no phantom words on recordings of silence, keyboard noise, fans or music.

## Speech models

Pick a model in **Settings → Models**. Changing models needs a restart.

| Model | Size | Notes |
|---|---|---|
| **Parakeet v2 (English, recommended)** | 630 MB | The default. Fastest and most accurate in Cadence's tests. |
| **Parakeet v3 (25 languages)** | 640 MB | For dictating in other languages. |
| Tiny / Base / Small / Medium (English) | 75 to 539 MB | Whisper models. Smaller and less accurate. |
| **Large v3 Turbo (Q5)** | 574 MB | Whisper. With Parakeet active, it runs the vocabulary check described above. |
| Large v3 Turbo | 1.6 GB | Full-size version of the above. |

Models download from Hugging Face the first time you pick them and are stored in `~/Library/Application Support/com.cadence.app/models/`.

## Vocabulary

Add names and jargon you want spelled your way, like people, products, repos and tools, in **Settings → Commands → Vocabulary**. Type terms and press `Return`. The speech model is primed with them.

Your agents' names and your auto-correction targets are added to the vocabulary automatically.

## Auto-corrections

If a word is always heard wrong, add a rule in **Settings → Commands → Auto-Corrections**: the phrase Cadence hears, and the phrase you want. Rules apply to dictation and voice commands.

Cadence also notices when you keep fixing the same word by hand. An **Auto-correction detected** notice appears in the main window. Click **Add** to keep the rule or **Dismiss** to ignore it.

## Microphone

Choose an input in **Settings → Audio → Microphone**. **Automatic** follows the macOS default and switches when you plug in or unplug a device.

**Prefer the built-in mic over Bluetooth headsets** is on by default. AirPods and other headsets switch to a low-quality call codec while their mic is open, which costs accuracy and muffles whatever they are playing. This applies when the input is set to Automatic.

## How text is typed

Cadence pastes the text with the clipboard and `⌘V`, then puts your previous clipboard contents back. This needs the **Accessibility** permission.

## History

The **Feed** tab in the main window shows dictations live. Switch to **History** to see your last 50, with the app each one went to. They are kept in your local settings file.

## Save recordings

**Settings → Audio → Save recordings** keeps the audio and text of each dictation (newest 300) in `~/Library/Application Support/com.cadence.app/recordings/`. It is off by default and nothing leaves your Mac. It is useful if you want to build a test set from your own voice.
