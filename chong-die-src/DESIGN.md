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

## Faces (3.0: landing on the record's face)

Decided by a throwaway spike (Task 1 of the 3.0 plan). **Settle-then-turn:** the die rolls and
settles as now; then its visible model (the `dice` group, never the collider) turns in a 250 ms
slerp from identity to `R`, a rotation of the solid onto itself that puts the record's face T where
the landed face U is (`R · locator(T) ≈ locator(U)`, in the die's frame).

- **Why not pre-simulation.** Rapier does replay a throw exactly: a headless world
  (`@dimforge/rapier3d-compat` 0.11.2, the build `@react-three/rapier` 1.1.1 uses; fixed 1/120
  step; the tray's colliders; every die of the throw) gave the same top face on 20/20 throws of 1
  to 6 dice across two runs, poses bit-identical. But only a bit-exact copy works: moving the dice's
  start by 1e-6 changed a top face on 4 to 7 throws of 20. Held: same WASM build, fixed step with
  `interpolate={false}` (frame rate only changes how many steps run per frame), same collider
  shapes, a fresh world per roll. Not shown: that the live world is built bit-identically (bodies
  come from `@react-three/rapier` through three.js transforms, the Euler round trip in
  `PhysicsDice`, React's effect order), and the settle check, lock and 5 s cap run on render frames
  and the wall clock, not on steps (locking 2 or 3 steps late kept every top face in 200 throws,
  but the poses differ).
- **Finding R.** Build each die's symmetry group from the collider hull's face normals (proper
  rotations; d4 12, d6 24, d8 24, d10/d100 10, d12 60, d20 60), tolerance about 2e-3 rad (the
  collider vertices are printed to 6 digits). Don't solve it from the locators: they aren't an
  exactly symmetric set. Pick the group element taking T's locator closest to U's. Checked for
  every resting face and every T, read the way `getValueFromDiceGroup` does: d4 16/16, d6 36/36,
  d8 64/64, d10 100/100, d12 144/144, d20 400/400, d100 100/100.
- **Locators** (the `.tsx` values the app uses): the d6's are exact. The d10/d100's sit at 31.2°
  above and 26.8° below the equator (the faces are at ±42.3°), so `R` misses by up to 4.9°; the d20's
  by up to 2.3° (positions rounded to 2 decimals), d8 4.8°, d12 1.5°. All still read right; the
  smallest margin is the d20 (0.23 in the up-dot between the top locator and the next).
- **The model stays put** under every `R` (within 0.16% of its size) for every die but the d4,
  whose model is centred at y ≈ −0.165 (model units, ×0.1 in the tray), not at the origin: turn it
  about that point or it jumps by a fifth of its size. Its locators point at corners (a d4 reads its
  top corner).
- **Other players:** `R` is a symmetry of the collider and the model, so the final pose can carry
  `rotation · R` (d4: plus the pivot's shift) and their trays snap to it as now.
- **In the code:** `helpers/faceSymmetry.ts` (pure, tested for every die and style: every landed
  face turns to read every face) builds each type's group from `colliders/colliderVertices.ts`
  (the hulls' vertices, shared with the colliders) and picks `R` from the locators read off the
  die (`getLocatorsFromDiceGroup`, so the d20's rotated mesh is accounted for). `DiceRoll` hands
  each `PhysicsDice` its `forcedFace` (`chong.faces[id]`; on every tray that has the record).
  On settle, or at the 5 s cap where it lies, a die showing another face locks its body, turns its
  `group` (250 ms; the hull is the same shape under `R`) and then reports the forced face with the pose
  `rotation · R` (d4: the position moved by the pivot's shift, `turnedPose`). That pose is what
  `finishDieRoll` stores and `DiceRollSync` sends, so the static dice of every tray, and a die
  placed again by a fixed transform (which never turns), show the record's face. A die already
  showing it, or one the record doesn't cover (non-command rolls), reports as before.
- The spike's scripts (symmetry check, headless harness) are kept locally in
  `.superpowers/sdd/2026-10-07-roll-engine-plan/spike-harness/` (git-ignored).

## Storage (localStorage)

- `chongkit.chongdie`: saved rolls (tabs, pills, typed history), `chong/savedRolls.ts`. Only
  `chongStore` writes it.
- `chongkit.chongdie.prefs`: `nimble`, `panelOpen` (`chong/prefs.ts`, `prefsStore`).
- Stores: `chongStore` (saved rolls, tabs, draft, error), `trayStore` (tray error banner),
  `prefsStore`, `partyStore` (other players, the tray shown full size).
