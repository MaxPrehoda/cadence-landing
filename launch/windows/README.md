# Windows launch kit (not deployed)

Everything the site needs on the day Cadence for Windows ships. This folder and `scripts/` are in `.vercelignore`, so none of it is published until someone runs the launch script and commits the result.

The site has two states:

| | What visitors see | Where it lives |
|---|---|---|
| **A. Windows is coming** | `/windows` says it's being built and takes waitlist sign-ups. A Windows browser that asks for `/download` lands there. Nothing claims to work on Windows. | The site itself (`windows.html`, `platform.js`, `api/download.js`, `api/waitlist.js`, `vercel.json`) |
| **B. Windows is out** | Download for Windows, install steps, docs page, Mac and Windows named across the site. | This folder, applied by `scripts/windows-launch.mjs` |

## The rule

The launch copy may only say a feature works on Windows if the parity matrix (`windows-parity.md`, kept by the Windows team) marks every row behind it **run on Windows**. The script reads the matrix itself:

- `claims.json` ties each thing the copy says to parity row IDs.
- The seven **core** claims (install, the key, dictation, toolbar, Inbox, Talk, Claude Code agents) must all be proven or the script publishes nothing.
- Other claims (Pro, iPhone, herdr, Sets, …) are left out one by one while unproven: the Windows page lists them under "Not on Windows yet", and sentences elsewhere keep saying "Mac", which stays true.
- `facts.json` holds names and numbers the copy quotes (the Windows key, the installer name, signed or not). A blank fact the copy needs also stops the launch.

## Commands

```bash
node scripts/windows-launch.mjs status                 # what's proven, what's blank, has the site drifted
node scripts/windows-launch.mjs preview /tmp/win       # the full launch copy in a copy of the site, to read
node scripts/windows-launch.mjs preview /tmp/win --only-proven   # exactly what would be published today
node scripts/windows-launch.mjs apply                  # edit the site in place (refuses until ready)
node scripts/windows-launch.mjs apply --with-legal     # also terms.html (read it first)
```

Run `status` after any edit to the site's copy. If it reports drift, a sentence the kit expects has changed: update the matching `find` in `edits.mjs`.

## Launch day, in order

0. If the Windows preview is on (`node scripts/windows-preview.mjs status`), run `node scripts/windows-preview.mjs undo` first. This kit expects the "Windows is coming" text.
1. The GitHub release carries `Cadence_<version>_x64-setup.exe` next to the DMG. (Without it `/download/windows` falls back to the Windows page.)
2. Fill `facts.json`: `hotkey`, `version`, and `signed` if a certificate exists by then.
3. `status` shows the core claims proven and no drift.
4. `apply`, then `npm i --no-save marked@12.0.0 && node scripts/build-docs.mjs` if the script says the docs were not rebuilt.
5. By hand, because the script can't:
   - `art/og.png`: the card now says "Free for Mac and Windows"; re-screenshot `art/og-card.html` (see the main README).
   - `privacy.html` says "your Mac" throughout and names macOS storage. Read it against what the Windows build stores and where.
   - `index.html` structured data: `softwareVersion`.
   - Email the Windows waitlist (`SMEMBERS waitlist:windows` in Upstash). One message, as promised.
   - On a preview deployment, open `/download` from a Windows browser and confirm it starts the installer; `vercel dev` does not run the User-Agent rule in `vercel.json`.
6. Read the diff, commit, deploy.

## Files

| File | What it is |
|---|---|
| `claims.json` | Claim → parity rows, and which claims are core |
| `facts.json` | Key name, Windows version, installer name, signed or not |
| `edits.mjs` | Every change to an existing page: whole pages, repeated patterns, exact edits |
| `pages/windows.html` | The launch version of `/windows` |
| `pages/docs/windows.md` | The docs page "Cadence on Windows" |
