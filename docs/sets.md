# Sets

A set is a group of agents you can put away and bring back later. Putting a set away closes its terminal windows but keeps every agent running. Your screen gets quieter, and nothing is lost.

## Put agents away

Hover the agents pill on the [toolbar](#/toolbar). Below the dots, click the put-away icon. If you hold the pointer there for two seconds, the pill opens and the row reads **Put away as a set**.

- Every agent on the toolbar that is not already in a set becomes one set, named after the folder they share.
- Their Terminal windows close. If an agent's tab shares a window with other tabs, only that tab closes.
- The agents keep working in herdr: same conversation, same scrollback, same state.

If you already have open sets, the button reads **Put everything away** and puts those away too. With one open set and nothing else, it reads **Put away** followed by the set's name.

## The set chip

A put-away set shows as one chip on the toolbar with the number of agents in it. The chip uses the same colors as the dots:

| Chip | Meaning |
|---|---|
| Amber | At least one agent in the set needs you |
| Blue | At least one is working |
| Green | All of them are done |

Questions from agents in a put-away set still land in the [Inbox](#/inbox), so you can answer without opening anything.

## Open a set

Click the chip, or click any agent from the set. Every window comes back where it was, at the same size, and tabs that shared a window come back together.

Agents you start while a set is open join that set. The **+** row in the peek starts new agents in the open set's folder.

## Rename a set

While peeking, hover the set's row and click the pencil. Type a name, then press `Return` to save or `Esc` to cancel.

## End an agent

Hover a row while peeking and click the trash icon twice. The agent stops and its window closes.

## Good to know

- Sets work with terminal agents, which herdr keeps alive. They are stored in `sets.json` in Cadence's data folder.
- The toolbar shows up to eight dots. Putting groups away is the easiest way to keep it short.
- macOS may ask you to let Cadence control Terminal the first time you put a set away or open one. Cadence needs that to read and restore window positions.
