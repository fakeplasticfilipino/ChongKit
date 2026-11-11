# Chong's Tracker — room tabs kept by the GM, shared by broadcast

Room tabs (tabs saved to the room with the door button, and their entries) stop living in Owlbear's
room metadata. The GM's browser keeps them; the GM's panel shares them with the players by OBR
broadcast whenever they are around. Suggested by an extension author: room metadata is small (16 kB,
shared by every extension in the room) and writing it risks clashing with other extensions.

Normal tabs are unchanged: they stay in the scene's metadata, one key per entry and per tab.

## Who holds what

- **GM's browser** (localStorage `chongkit.tracker.room.<roomId>`): every room tab and its entries,
  plus a version number that goes up on every change. This is the real copy. No size limit beyond
  localStorage.
- **Players' browsers** (same key): the last copy received from the GM, kept so a player still sees
  room tabs when the GM isn't in the room.
- **Owlbear's room metadata**: nothing of ours after the one-time move (below).

## Messages (`OBR.broadcast`, channel `com.chongkit.tracker/room`)

- `list` — GM → everyone: `{ v, tabs, entries }`, the whole room list. Sent after every change the GM
  applies, and in answer to a request. A receiver ignores a `list` whose `v` is not newer than its copy.
- `request` — player → GM: "send me the list". Sent when a player's panel or background opens, and
  again every 20 s while it has no answer. Several GMs may answer; the newest `v` wins.
- `edit` — player → GM: one change to a room tab or entry (the same patches the panel builds today:
  an entry patch, a delete, a tab patch). The GM applies it to its copy, bumps `v`, saves, and sends
  `list`.
- Big lists are split into numbered pieces of at most 16 kB (`{ id, part, of, chunk }`) and joined on
  arrival; a list whose pieces don't all arrive within 10 s is dropped (the next `list` replaces it).

The panel and the background script of the same browser share the copy through localStorage (the
`storage` event), so only one of them needs to answer broadcasts: the panel when it is open, else the
background.

## The GM offline

- A player's room tabs are **read-only while no GM has answered** in the last 30 s (a `list` received,
  or a reply to a `request`): the panel shows them as it does tabs the player can't edit. Editing comes
  back as soon as a `list` arrives. (The table's choice: no queued edits, no conflicts.)
- The GM never waits for anyone: GM edits apply at once, as now.

## Token badges and right-click Track

- `background.js` reads room tabs from the same local copy (instead of `OBR.room.getMetadata()`) and
  redraws when it changes (`storage` event or a `list` broadcast).
- Right-click **Track** into a room tab: on the GM, saved directly; on a player, sent as an `edit`
  (refused with a notification while read-only).

## Moving existing room tabs

The first time a GM's panel opens in a room whose metadata still holds our room keys
(`com.chongkit.tracker/t/…`, `…/e/…`): it reads them with today's `readState`, merges them into its
local copy (local wins for the same id if newer), saves, broadcasts `list`, then deletes those keys
from the room (sets them to `null`). Players' panels still read old room keys as a fallback until the
GM has moved them, so nothing disappears in between. The old single `com.chongkit.tracker/tabs` key is
still only read to migrate.

## Backup

The list now lives on one GM browser, so the GM's help (?) gets **Export room tabs** (a `.json` file)
and **Import room tabs** (merges by id; newer wins). Plain file, checked with the same validation as
loaded metadata.

## Limits and warnings

- The 16 kB room warning on the door button goes away.
- No other limit is enforced; a very long list just takes several pieces.

## Code

- `core.js` (pure, tested): the message shapes, `splitMessage` / `joinPieces`, `applyEdit(list, edit)`
  (reuses the existing patch logic), `newerList(a, b)`, the read-only rule (`roomEditable(lastHeard, now,
  role)`), the move-over patch (`moveRoomPatch(roomMd)` → { local list, room deletes }), and
  export/import validation. Tests in `tests/core.test.js`.
- `app.js`: room tabs read from and written to the local copy; GM answers `request` and applies `edit`;
  player sends `request` / `edit`; read-only state; the move-over; export/import in the help.
- `background.js`: badges from the local copy; Track into room tabs by role.
- `manifest.json` version and every `?v=` bumped; CLAUDE.md tracker rule 3, README and
  `chongs-tracker/TRACKER.md` updated.

## Out of scope

Normal (scene) tabs; Chong Die (it only writes each player's own roll to player metadata); queued
player edits while the GM is offline.
