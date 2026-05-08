# Voice commands

The fast path. These commands are handled by a deterministic pattern parser — no LLM round-trip, sub-100 ms response.

If your utterance doesn't match a built-in pattern, it falls through to the [intent engine](#/intent-engine), which uses Claude to compose multi-step plans.

## Apps

| Phrase | Action |
|---|---|
| "Open Safari" | Launch / activate an app |
| "Switch to Slack" | Activate without launching |
| "Launch Notion" | Same as open |
| "Open Chrome and Safari" | Multi-app open |
| "Close window" | ⌘W |
| "Close tab" | ⌘W in browsers |
| "New tab" | ⌘T |

App names are matched fuzzily, so "VS Code" and "Visual Studio Code" both work.

## Search

| Phrase | Action |
|---|---|
| "Search for rust async patterns" | Google search in default browser |
| "Google macOS hidden defaults" | Same |
| "Look up the history of bell labs" | Same |

## VS Code

When VS Code is the active app, these commands map to native shortcuts:

| Phrase | Action |
|---|---|
| "Open terminal" | ⌃` |
| "Search file foo.ts" | Quick open |
| "Command palette" | ⇧⌘P |
| "Toggle sidebar" | ⌘B |
| "Go to line 42" | ⌃G then number |
| "Close all editors" | ⌘K W |
| "Split editor" | ⌘\ |
| "Toggle zen mode" | ⌘K Z |
| "Focus explorer" | ⇧⌘E |

## Notes & todos

| Phrase | Action |
|---|---|
| "Take a note: feedback from Dana on onboarding" | Add to local notes store |
| "Note that the budget review is Tuesday" | Same |
| "Make a todo to email Dana" | Add a todo (not yet completed) |
| "Add a todo to refactor the parser" | Same |

Notes and todos live in `settings.json` and are visible from the indicator menu.

## Obsidian

If you've set **Obsidian vault path** in settings, these commands write directly into your vault as Markdown files:

| Phrase | Action |
|---|---|
| "Write an Obsidian note about meeting notes" | Create new note |
| "Add to my ideas note in Obsidian saying try a new color scheme" | Append to existing note |
| "Read my Obsidian note titled standup" | Speak contents back |

## Indicator & TTS

| Phrase | Action |
|---|---|
| "Hide indicator" | Hide the floating pill |
| "Show indicator" | Bring it back |
| "Stop speaking" | Silence in-flight TTS |
| "Be quiet" | Same |

## Custom commands

Create your own triggers in **Settings → Custom commands**. Each command has:

- **Trigger phrase** — what you say
- **Action** — keyboard shortcut, app open, shell command, or URL
- **Enabled** toggle

Trigger phrases are case-insensitive and match anywhere in the utterance (after the wake word, if applicable).

## App aliases

Whisper sometimes mishears app names. Add aliases in **Settings → App aliases**:

| Spoken | Resolves to |
|---|---|
| "vs code" | "Visual Studio Code" |
| "chat gpt" | "ChatGPT" |
| "obsidian vault" | "Obsidian" |

## App groups

Define groups so one phrase opens many apps:

```
Group: "morning setup"
Apps: Slack, Linear, Cron, Gmail
```

> "Open my morning setup"

opens all four.

## Conversational filler

Cadence strips common filler words (`up`, `the`, `my`, `a`, `please`, `can you`, `could you`) before matching. So all of these work:

- "Open Safari"
- "Open up Safari please"
- "Could you open Safari for me"
