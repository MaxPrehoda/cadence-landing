# Cadence Drive

Cadence Drive is one folder, `~/Cadence Drive`, kept the same on every computer you've paired with Cadence and on your iPhone. Agents write ordinary files to it. Cadence shows which agent wrote what, merges edits on its own, and keeps every file sealed end to end.

It comes with [Cadence Pro](/pricing) at no extra charge, in Cadence 0.12.0 and later. [The Cadence Drive page](/drive) has the overview.

## Turn it on

1. Open **Settings → Agents → Cadence Drive** and press **Turn on Cadence Drive**. The folder appears in your home folder.
2. On another computer you've paired with Cadence, do the same. It joins the same drive.
3. On your iPhone, open the **Drive** tab in the Cadence app (TestFlight beta).

It's an ordinary folder. Finder, your editor, your terminal and every agent read and write it directly.

## Who wrote what

Cadence credits each change to the agent that made it. It follows the file edits of Claude Code sessions, and agents can also write through Cadence's Drive tools.

- **Toolbar.** Each agent that's writing to the drive gets a ring in its colour.
- **Writing now.** The Drive view in Cadence's panel lists the files being written right now, with the text arriving as it's written.
- **In a file.** Open a file and a coloured edge shows which agent, or you, wrote each part.

## When two agents edit the same file

- Edits to different lines combine automatically.
- CSV and TSV files merge row by row.
- When two agents change the same lines, a card arrives in the Inbox on your Mac and your iPhone. It shows both sides, with a combined version by Claude first. Keep the combined version, keep either side, or keep both as separate files. Like every Inbox answer, you get two seconds to undo. Both agents get the result.

## History and Trash

- Every file keeps its last 200 versions. In the file view, the history bar replays the file; pick a version and restore it.
- Deleted files, deleted on this computer or another device, wait in the Trash for 30 days.

## The file browser

The Drive view in Cadence's panel is a full file browser: folders, list or grid, and columns you can sort by who changed a file, when, and its size. Drag files in to add them.

Right-click a file to open it, or choose **Show in Finder**, **Copy path**, **Rename**, **Move to…**, **Duplicate**, **Version history**, **Hand to an agent…** or **Move to Trash**.

Search covers every text file in the drive. Type plain words, or a regular expression between slashes, like `/TODO|FIXME/`.

## Hand files to agents

- From the file view or the right-click menu, choose **Hand to an agent…**.
- With [Talk](#/talk): double-tap `⌥` and say "Give the checkout agent the API notes", "Put my clipboard in the drive as launch copy" or "What changed in the drive today?".
- Claude Code agents that Cadence starts get four tools: `drive_list`, `drive_read`, `drive_write` and `drive_search`.

## Briefs

When an agent finishes, its recap is saved in `briefs/` in the drive. The next agent, on any computer, can read it and pick up where the last one left off.

## On your iPhone

The iPhone app (TestFlight beta) has a **Drive** tab with the same live view. Read any file, and answer collisions there too. From the share sheet, **Save to Cadence Drive** puts a photo, a screenshot or a PDF into the drive, with an optional note to an agent. See [iPhone](#/iphone).

## Privacy

- Each file's contents and name are sealed on your device with AES-256-GCM, using keys that only your devices hold.
- Cadence's relay stores the sealed files for your other devices. It can't read their contents or their names.

## Limits

- Files can be up to 512 MB each.
- An empty folder syncs once a file is in it.
