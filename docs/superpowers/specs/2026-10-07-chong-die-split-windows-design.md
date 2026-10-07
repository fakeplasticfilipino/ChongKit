# Chong Die: Rolls window + stock tray (design)

Date: 2026-10-07 · Status: approved in chat (architecture), spec awaiting review

## Why

The command line and saved-roll panel sit on top of the 3D tray: they cover the dice, are cramped
at 375 px, and don't look like stock Owlbear Dice or Chong's Tracker. Stock Owlbear Dice can't take
rolls from another extension (no messages, no Avrae, waves or Nimble), so we keep the fork but give
it two windows: one for typing and saved rolls, one that is just the stock-looking tray.

**One extension, one install.** Two windows inside it.

## Windows

### Rolls window (the toolbar button)

The action popover, `index.html`, about **520 × 640** (manifest `action.width/height`).
Owlbear's look (the upstream MUI theme), flat, no cards.

```
┌───────────────────────────────────────────────┐
│ [ !r 1d20+5                              ]    │  command line, ↑/↓ history, Enter sends
│  error text (only when there is one)          │
│ Rolls  Spells  Attacks  +       ⚡  +  🎲  ⋯  │  tabs | Instant · add roll · Tray · menu
│───────────────────────────────────────────────│
│ (Longsword 1d20+5) (Damage 1d8+3) (Fireball…) │  pills, wrapping, scrolls
│                                               │
└───────────────────────────────────────────────┘
```

- Command line, history, tabs, pills, pill dialog, drag to reorder, long-press menu, ⋯ menu (Nimble
  rules, export / import, About): the existing components, moved here, laid out in one row of
  controls instead of the column down the right edge.
- **Tray** button (🎲) opens the tray, or closes it when open (pressed state follows the tray).
- Commands are parsed here before sending (`parseCommand`; same build, shares `src/roll`): a typo
  shows under the command line and is not sent; invalid pills stay outlined red.
- Sends each roll on the roll channel (below) with `place` = `!tab.instant` for pills, `false` for
  the command line. A command with only virtual dice always rolls (decided in the tray, as now).
- The window stays open after sending.
- History records what is typed in the command line (sent from here), not pills or tracker rolls.

### Dice tray (second window)

`tray.html` (today's `main.tsx` / `App`), opened with `OBR.popover.open`:
id `com.chongkit.chongdie/tray`, top-right of the screen (position tuned in the browser),
height 700, width kept at `innerHeight / 2 + 60` by the resize observer (now `popover.setWidth`),
`disableClickAway: true` (clicking the map can't kill a roll mid-throw).

- Looks like stock Owlbear Dice: no command line, no panel; upstream overlays (`DiceRollControls`)
  back at the top of the tray.
- Sidebar: upstream's (style picker, dice picker, hidden, extras, history), plus the primary-die
  picker (Nimble on) and a **×** at the bottom that closes the tray. The Rolls toggle is removed.
- Keeps everything that rolls: `useWaveRunner`, `DiceRollSync`, `PartyTrays`, Place, hand-picked
  dice as commands, the incoming-roll listener.
- Clicking another player's roll popover (`PopoverTrays`) opens the tray (was `OBR.action.open`).

## Roll path (one for the tracker and the Rolls window)

```
Rolls window / Chong's Tracker ──roll {id, command, place?}──▶ background
background ──ack {id}──▶ sender
background: tray open? (popover.getWidth(trayId) !== undefined) else open it
background ──run {id, command, place?}── every 250 ms ──▶ tray, until run-ack {id} (15 s give-up)
tray: dedupe id → place or roll
```

- `place` is a new **optional** field. Missing (Chong's Tracker): follow the Instant switch of the
  Rolls window's active tab, read fresh from localStorage (the active tab id is now saved, see
  Storage). Older trackers keep working; the tracker needs no change.
- Never re-open an open tray (`popover.open` on an open id would reload it mid-roll).
- `openTray()` / `closeTray()` / `isTrayOpen()` live in one module (`src/chong/trayWindow.ts`)
  used by the background, the Rolls window and `PopoverTrays`.

## Storage (both windows share localStorage)

- `chongkit.chongdie` (saved rolls): written **only by the Rolls window**. Gains optional
  `activeTabId` (old data without it: first tab). The tray only reads it (Instant for tracker
  rolls). The tray no longer records history, so it can't overwrite the Rolls window's copy.
- `chongkit.chongdie.prefs` (Nimble, primary style): Nimble is set in the Rolls window, the primary
  style in the tray. Each window reloads prefs on the `storage` event, so hand-picked dice follow
  Nimble without reopening the tray.
- The store is split: `chongStore` (Rolls window: saved rolls, tabs, draft, error) and a small tray
  store (prefs, placed command, tray errors). Prefs load/save stay in `prefs.ts`.

## Errors

- Bad command or pill: shown in the Rolls window, nothing sent.
- Tray can't roll a command it received (rare: dice limits): it shows the error as a small banner
  at the top of the tray (where the command line was) that clears on the next roll.
- Background gets no run-ack within 15 s: gives up silently (as now).

## Removed

`CommandLine` from the tray, `RollPanel` overlay, `PanelToggle`, `COMMAND_LINE_HEIGHT` offsets,
`panelOpen` state. Upstream's tray UI comes back nearly unchanged (easier upstream ports).

## Testing

- Vitest: `savedRolls` (`activeTabId` round-trip, old data), `incoming` (explicit `place` wins;
  missing `place` follows the saved active tab's Instant), prefs reload on storage change,
  `startCommandRoll` no longer touching saved rolls, `trayWindow` (doesn't re-open an open tray;
  mock OBR).
- Browser (local `vite preview` without Owlbear where possible; the Rolls window and tray pages
  render standalone): layout of both windows, pill → roll, typo error, Tray button.
- In Owlbear (on the TRACKER.md check list): tray opens beside the Rolls window, tracker roll with
  tray closed and open, party-tray click, Nimble toggled while the tray is open.

## Version and docs

Chong Die **2.0.0** (manifest), rebuild and commit `chong-die/`, NOTICE.md (two windows), TRACKER.md,
CLAUDE.md (Chong Die section: two windows, `place`, `activeTabId`), README.
