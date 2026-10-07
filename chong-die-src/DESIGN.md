# Chong Die: how it works

The rules (license, build, version bump, contracts) are in the repo's `CLAUDE.md`. This is the map.

## Window

One window: the toolbar button opens the tray (`index.html` → `src/main.tsx` → `App`).

- **Tray** (`tray/InteractiveTray.tsx`): upstream's 3D tray, with the command line always on top
  (`chong/CommandLine.tsx`) and ▤ Rolls beside it. Errors from the tracker show as a banner
  (`TrayError`).
- **Rolls panel** (`chong/RollPanel.tsx`), docked to the right, 360 px, toggled by ▤
  (`prefs.panelOpen`). The window width is `windowWidth(height, panelOpen)` (`chong/layout.ts`),
  set with `OBR.action.setWidth` in one step (stepping it through Owlbear looks laggy). Opening widens
  the window, then fades the panel in once it fits; closing fades it out, then narrows the window
  (`usePanelFade` in `App.tsx`, `PANEL_FADE_MS`). Tray and panel never shrink. Tabs + ⋯ on top; the first tab (Rolls: can't be closed or moved)
  starts with the dice style button and a pill per die (`DicePills`: each click adds one die to the
  tray, thrown with the tray's Roll button), a faint line, then the tab's pills and a + pill.
- **⋯** (`chong/MoreMenu.tsx`): hide rolls, roll history, other players' trays, Nimble rules,
  export / import, about.
- Owlbear plumbing (roll sync, tracker rolls, resize) is in `App`, so it runs with the panel closed.
- **Look = Chong's Tracker** (`chong/look.ts` copies `chongs-tracker/style.css`): transparent body
  (Owlbear's glass shows through), translucent white surfaces, no outlines, 8 px corners, round
  transparent icon buttons, purple when on.
- Don't try a separate tray popover again: in 2.0 it never appeared in Owlbear.

## Rolling

- Everything rolls as a command, even dice picked by hand (`rollPickedDice` → `countsToCommand`).
  `startCommandRoll` (`chong/rollRunner.ts`) parses, evaluates and throws the first wave.
- **Hold to roll:** custom rolls (typed, pills, Chong's Tracker, history, Reroll) never throw right
  away: `placeCommand` (`chong/place.ts`) puts their first wave's dice on the tray as picked dice
  and keeps the command in `trayStore.placed`; holding Roll shakes them, releasing throws the
  command (`startCommandRoll` with the hold's `speedMultiplier`). Changing or clearing the dice by
  hand drops the command (`dropPlaced` in `controls/store.ts`). Commands with only virtual dice
  (`1d7`) roll at once. Follow-up waves (rerolls, explosions) still throw by themselves.
- **Roll engine** (`src/roll/`, pure TS, Vitest): Avrae's `d20` syntax, operations in the order
  written. Rerolls and explosions come back as waves of new dice. Keys: `<rep>.<dice id>.<n>`, + `r`
  (reroll) / `e` (explosion) / `m` (exploded by hand); a later op following up the same die again
  adds its op index (`1d6!!` → `0.0.0e1`).
- **Sync:** each roll carries `chong` metadata (`ChongRollMeta` in `chong/rollMeta.ts`: command,
  3D die id → logical die, virtual dice, `manual`, `nimble`), so every player recomputes the same
  total from the synced values. Only the roller's tray throws new waves (`throwNextWave`, run by
  `useWaveRunner` on every change).
- **From Chong's Tracker:** `{ id, command }` on `…/roll` → the background acks, opens the window and
  re-sends `…/run` until `…/run-ack` (`chong/channels.ts`, `background.ts`, `chong/incoming.ts`).

## Nimble (⋯ → Nimble rules)

Recorded with the roll as `chong.nimble`, so everyone sees the roller's setting. Nothing automatic.

- **Primary die:** `highlightedDice` picks, for each dice term, the die that landed furthest left
  (lowest x; not explosion dice, not dice rerolled away). `chong/Highlights.tsx` draws an
  outline: the die's own geometry, scaled 1.08, inside out (`BackSide`), unlit. Purple, or by
  `highlightTone`: dark red when the die shows 1, bright gold on its highest face (a d100 by its
  whole value; both trays pass their landed values).
- **Explosion chains:** right-click (touch: long-press, `dice/InteractiveDice.tsx`) a landed die →
  `explodeDie` adds its key to `chong.manual`; `evaluate(…, { manual })` starts a chain there after
  the term's own ops (`<key>m`, then `…mm` while the new die shows its max; counted in the 20 extra
  dice); `throwNextWave` pops each new die out of its parent (`popThrow`).

## Storage (localStorage)

- `chongkit.chongdie`: saved rolls (tabs, pills, typed history), `chong/savedRolls.ts`. Only
  `chongStore` writes it.
- `chongkit.chongdie.prefs`: `nimble`, `panelOpen` (`chong/prefs.ts`, `prefsStore`).
- Stores: `chongStore` (saved rolls, tabs, draft, error), `trayStore` (tray error banner),
  `prefsStore`, `partyStore` (other players, the tray shown full size).
