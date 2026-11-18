# Windows preview kit (not deployed)

The state between "Windows is coming" and the full launch: an installer people can download, labelled as what it is. This folder and `scripts/` are in `.vercelignore`; nothing here is on the site until someone runs the script and commits the result.

| State | What visitors see | How it gets on the site |
|---|---|---|
| A. Coming | `/windows` is a waitlist | already in the site files |
| **P. Preview** | `/windows` has the preview download, the warnings, install steps and the waitlist. The home page gains a "Windows preview" link and button. | `node scripts/windows-preview.mjs apply --tag <tag>` |
| B. Launch | Download for Windows across the site | `launch/windows/`, only when the parity matrix allows |

## What the preview copy says, and doesn't

- Says: early preview, not tested on Windows, unsigned (with the SmartScreen steps), what is built but never run, what is left out, where to send problems and where the log file is.
- Never says a feature works on Windows. Mac copy is unchanged.
- A Windows browser that clicks any Download button, or asks for `/download`, lands on `/windows`, not on the installer. Only the button on that page links to `/download/windows-preview`.

## The release it points at

A GitHub **pre-release** on `MaxPrehoda/cadence-landing` with its own tag, carrying `Cadence_<version>_x64-setup.exe`. It must be a pre-release: "latest release" is what the Mac download button and the Mac app's update check read, and a pre-release is invisible to both. The site finds the installer by tag and by the `x64 … -setup.exe` name, so the version in the file name can change without touching the site.

`release.json` holds the tag (blank until win-release names it), the key the page quotes and the log file path.

## Commands

```bash
node scripts/windows-preview.mjs status                    # on or off, blanks, drift
node scripts/windows-preview.mjs preview /tmp/winp --tag T # the preview state in a copy of the site, to read
node scripts/windows-preview.mjs apply --tag T             # edit the site in place (refuses without a tag)
node scripts/windows-preview.mjs undo                      # back to "Windows is coming"
```

## Publishing it, in order

1. The pre-release exists and its installer has been downloaded and started once on a real PC. If it does not start at all, don't publish.
2. `apply --tag <tag>`, read the diff (6 files: `windows.html`, `index.html`, `faq.html`, `llms.txt`, `platform.js`, `api/download.js`).
3. Commit together with the "Windows is coming" files it builds on (`vercel.json`, `api/waitlist.js`, `download-v2.js`, the `platform.js` script tags). Deploy.
4. Check on the deployment: `/download/windows-preview` starts the installer; `/download` from a Windows browser lands on `/windows`; `/download` from a Mac still starts the DMG.
5. Replacing the installer later: upload the new file to the same pre-release and delete the old one. The site follows within a minute.

## Before the full launch

Run `undo` first. The launch kit's edits expect the "Windows is coming" text and report drift while the preview is on.
