# Intent engine

When a spoken sentence doesn't match a built-in [voice command](#/voice-commands), it falls through to the **intent engine**: Cadence sends the utterance plus current context (active app, clipboard, selection) to Claude, which returns a structured action plan that gets executed locally.

This is how you get from "make this email more formal" or "run the tests and tell me if they pass" to a working desktop automation, without writing macros.

## Enable / disable

**Settings → Intent engine → Enabled**. Off by default if you haven't supplied an Anthropic API key.

The engine uses Claude Haiku for plan resolution, fast and cheap (typically <$0.001 per command).

## What it sees

For every spoken command, Claude receives:

- The transcribed utterance
- Active app name and bundle ID
- Active window title
- Current clipboard contents (if any)
- Currently selected text (if any)
- Working directory of the active terminal/editor

It does **not** receive your microphone audio, your dictation history, or anything from outside the active app's frontmost context.

## Action catalog

The engine composes plans from 35 primitive actions:

### System
| Action | Effect |
|---|---|
| `open_app` | Activate or launch a macOS app |
| `keyboard_shortcut` | Press a chord (e.g. `Cmd+Shift+K`) |
| `type_text` | Type text at the cursor |
| `get_selection` | Capture currently selected text |
| `replace_selection` | Replace selection with new text |
| `notify_user` | Speak a message via TTS |
| `read_clipboard` / `write_clipboard` | Pasteboard I/O |
| `open_file` | Open a file in its default app |
| `open_url` / `search_web` | Drive the default browser |
| `shell_command` | Run a bash command, capture output |

### LLM transforms
| Action | Effect |
|---|---|
| `llm_transform` | Rewrite text with an instruction (uses `{{selection}}`, `{{clipboard}}`, etc.) |

### Browser (Chrome with `--remote-debugging-port=9222`)
| Action | Effect |
|---|---|
| `browser_find` | Find elements by text |
| `browser_query` | Find by CSS selector |
| `browser_click` | Click element by selector or text |
| `browser_console` | Read recent console messages |
| `browser_styles` | Computed CSS for a selector |
| `browser_navigate` | Go to URL |
| `browser_page_info` | Title + URL of current tab |
| `browser_screenshot` | Capture current tab |

### Communication
| Action | Effect |
|---|---|
| `slack_send` / `slack_read` / `slack_channels` | Slack via bot token |
| `email_read` / `email_send` / `email_draft` / `email_reply` / `email_unread` | Mail.app via AppleScript |
| `imessage_send` / `imessage_read` | Messages.app via AppleScript |

### Knowledge
| Action | Effect |
|---|---|
| `obsidian_create_note` | New markdown file in vault |
| `obsidian_append_note` | Append to existing note |
| `obsidian_read_note` | Read note contents |

### Agents
| Action | Effect |
|---|---|
| `claude_session` | Create / prompt / status / kill a Claude Code session |

## Variable substitution

Actions execute sequentially, and outputs from earlier steps are available as template variables in later steps:

- `{{selection}}`, output of `get_selection`
- `{{clipboard}}`, output of `read_clipboard` (or context)
- `{{shell_output}}`, output of `shell_command`
- `{{llm_result}}`, output of `llm_transform`
- `{{browser_result}}`, output of any `browser_*` action
- `{{comms_result}}`, output of any `slack_*` / `email_*` / `imessage_*` action

This is what lets the engine compose patterns like:

> "Use AI to write an Obsidian note summarizing the selected text"

→ `get_selection` → `llm_transform` → `obsidian_create_note`

## Example utterances

```
"Make this more concise"
"Translate this to French"
"Run the tests"
"What errors are in the console"
"Find the element with text 'checkout'"
"Send hello to Slack #general"
"Read my last 3 emails"
"Text Mom saying I'll be late"
"Add to my Ideas note in Obsidian: try a new color scheme"
```

## Safety guardrails

The system prompt forbids destructive shell commands (`rm -rf` etc.) without explicit user request. You can review the planned actions before they execute by enabling **Settings → Intent engine → Confirm before executing**. Cadence will speak the plan and wait for "approve" / "deny".

For higher-risk integrations (email send, Slack send, shell), enable per-action confirmation in **Settings → Intent engine → Action policy**.
