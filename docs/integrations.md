# Integrations

External tools Cadence can drive by voice. Each is opt-in. Cadence won't reach for cloud or APIs you haven't configured.

## Browser (Chrome DevTools Protocol)

Cadence drives Chrome / Chromium-based browsers via CDP for DOM inspection, clicking, console reading, and screenshots.

**Setup**

Quit Chrome, then relaunch with the debug port:

```sh
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222
```

If you use a different port, set it in **Settings → Browser → CDP port**.

**What you can say**

> "Find the element with text 'checkout'"
> "Click the submit button"
> "What errors are in the console"
> "Take a screenshot of this tab"
> "Navigate to github.com/anthropics"

These all flow through the [intent engine](#/intent-engine) → `browser_*` actions.

## Slack

Send and read messages without leaving your editor.

**Setup**

1. Create a Slack app at <https://api.slack.com/apps>
2. Add bot scopes: `chat:write`, `channels:read`, `channels:history`
3. Install to your workspace, copy the **Bot User OAuth Token** (`xoxb-…`)
4. Paste it into **Settings → Integrations → Slack token**

**What you can say**

> "Send a message to the general channel saying hello"
> "Read the last five messages from #engineering"
> "List my Slack channels"

## Email (Mail.app)

Driven by AppleScript, so it works with whatever account(s) Mail is configured with.

**Setup**

Make sure Cadence has **Automation** permission for Mail; macOS will prompt the first time:

**System Settings → Privacy & Security → Automation → Cadence → Mail**

**What you can say**

> "Read my last three emails"
> "Send an email to dana@example.com saying I'll join in 5"
> "Draft an email to the team about Friday"
> "Reply to the email from Dana saying sounds good"
> "How many unread emails do I have"

## iMessage (Messages.app)

Same AppleScript pattern as Mail.

**What you can say**

> "Text Mom saying I'll be late"
> "Read my last messages from Alex"

Contacts are resolved by name; Cadence will fall back to phone number / email if no contact matches.

## Obsidian

Native vault integration. Cadence reads and writes Markdown files directly. No plugin required.

**Setup**

**Settings → Integrations → Obsidian vault path**: point at the folder that contains your `.obsidian/` directory.

**What you can say**

> "Write an Obsidian note about meeting notes"
> "Add to my Ideas note in Obsidian: try a new color scheme"
> "Read my Standup note"

Notes are created at the root of the vault unless you specify a path. Daily notes, templates, and folder organization are not yet automated. Cadence treats the vault as a flat Markdown directory.

## Claude Code

Covered in depth on the [agents page](#/agents). The integration is what powers `"new agent"`, `"approve"`, and the dashboard.

## What's planned

The following integrations are on the roadmap but not yet shipped:

- Linear / Jira (read tickets, create issues by voice)
- Calendar (Google + Apple): schedule events, list today's meetings
- Notion (page create / append / read)
- Custom MCP servers (bring your own tool surface)

Watch the [GitHub repo](https://github.com/MaxPrehoda/cadence) or the changelog for updates.
