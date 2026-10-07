# Chong Die: how it works

The rules (license, build, version bump, contracts) are in the repo's `CLAUDE.md`. This is the map.

## Window

One window: the toolbar button opens the tray (`index.html` → `src/main.tsx` → `App`).

- **Tray** (`tray/InteractiveTray.tsx`): upstream's 3D tray, with the command line always on top
  (`chong/CommandLine.tsx`) and ▤ Rolls beside it. Tray errors show as a banner
  (`TrayError`).
- **Rolls panel** (`chong/RollPanel.tsx`), docked to the right, 280 px, toggled by ▤
  (`prefs.panelOpen`). The window width is `windowWidth(height, panelOpen)` (`chong/layout.ts`),
  set with `OBR.action.setWidth` in one step (stepping it through Owlbear looks laggy). Opening widens
  the window, then fades the panel in once it fits; closing fades it out, then narrows the window
  (`usePanelFade` in `App.tsx`, `PANEL_FADE_MS`). Tray and panel never shrink. Tabs + ⋯ on top; the first tab (Rolls: can't be closed or moved)
  starts with the dice style button and a pill per die (`DicePills`: each click adds one die to the
  tray, thrown with the tray's Roll button), a faint line, then the tab's pills and a + pill.
- **⋯** (`chong/MoreMenu.tsx`): hide rolls, roll history, other players' trays, export / import,
  about.
- Owlbear plumbing (roll sync, resize) is in `App`, so it runs with the panel closed.
- **Look = Chong's Tracker** (`chong/look.ts` copies `chongs-tracker/style.css`): transparent body
  (Owlbear's glass shows through), translucent white surfaces, no outlines, 8 px corners, round
  transparent icon buttons, purple when on.
- Don't try a separate tray popover again: in 2.0 it never appeared in Owlbear.

## Rolling

The engine decides every number; the tray acts the result out. Spec: `docs/2026-10-08-command-language-v4-design.md` (language), `docs/2026-10-07-roll-engine-design.md` (engine).

- Everything rolls as a command, even dice picked by hand (`rollPickedDice` → `countsToCommand`).
  `startCommandRoll` (`chong/rollRunner.ts`) parses and rolls the command, then throws stage 0.
- **Hold to roll:** custom rolls (typed, pills, history, Reroll) never throw right
  away: `placeCommand` (`chong/place.ts`) puts their first stage's dice on the tray as picked dice
  and keeps the command in `trayStore.placed`; holding Roll shakes them, releasing throws the
  command (`startCommandRoll` with the hold's `speedMultiplier`). Changing or clearing the dice by
  hand drops the command (`dropPlaced` in `controls/store.ts`). Commands with only virtual dice
  (`1d7`) roll at once.
- **Roll engine** (`src/engine/`, pure TS, Vitest): `parse` (a scanner; the only module that knows the words: `adv dis crit miss critadv xN`, glued to an optional number or `N-M` range, acting on the first dice group) → `roll` (plan + random source: the browser's `crypto.getRandomValues` in the app) → `record` (every die's value, size, kind, kept, crit, parent and source; each group's Primary Die and `primaries`; marks; total) → `format` (the result text). The Primary Die in the crit range is a crit; a chain die crits and chains only on its max. `faces.ts` picks the face of each 3D die; `revealStages` splits the record into the throws the tray shows. Errors are `EngineError`, shown under the command line.
- **Marks, not verdicts:** the total is the real sum of kept dice plus modifiers; MISS, CRIT and
  CAPPED are marks beside it. Caps: 100 dice per roll (checked before rolling) and 20 chain dice
  (a `critadv` pick counts as one); hitting either marks the roll CAPPED.
- **Sync:** each roll carries `chong` metadata (`ChongRollMeta` in `chong/rollMeta.ts`:
  `{ v: 4, record, parts, faces, stage }`): the record, 3D die id → record die and part, 3D die id →
  forced face, and the stage shown so far. Only the roller rolls; every tray acts out the same
  record, with no recomputing and no waves. Hidden rolls sync without the record. A roll in another
  format (`isCurrentMeta`) shows as its text with no dice, never as an error.
- **Stages:** stage 0 is the first throw; each later stage holds the chain dice made by the one before
  (`revealStages`). `revealNext` (run by `useRevealRunner`) waits until every die on the tray has
  settled, then pops the next stage's dice out of their parents (`popThrow`); an advantage chain die
  pops as a pair.
- **Dropped dice** fade once they have landed (a die the record dropped: advantage,
  a chain pick's lower die).

## Primary Die outlines

Placed by the record, not by where a die lands, and shown whenever a group uses `crit` or `miss`
(`usesCrit` / `usesMiss`); there is no switch. The Primary Die is the first die of a group still kept;
the outlined dice are the group's `primaries` (just the Primary Die).

- `chong/Highlights.tsx` draws the outline: the die's own geometry, scaled 1.08, inside out
  (`BackSide`), unlit. Per die: gold when it crit; dark red when it is the group's Primary Die and
  the group missed; else purple.
- Chain dice aren't outlined; the CRIT mark is in the result text.

## Faces (landing on the record's face)

**Pre-simulate, then play back (3.1).** Before the tray shows a throw, `PlaybackDiceSet`
(`dice/DiceRoll.tsx`) runs it out of sight in a headless Rapier world (`helpers/preSimulate.ts`:
the live world's settings, `colliders/trayShape.ts`, every die of the throw, the dice already lying
in the tray as fixed obstacles; settle and 5 s cap per 1/120 step) and records each die's path and
its collisions. `dice/PlaybackDice.tsx` reads the face the path lands on (U) off its last pose, turns
the model by R (below) before the first frame, and plays the path back, interpolated, with the
collision sounds (`dice/useDieSound.ts`). The die tumbles and stops on the record's face T; nothing
turns after it lands. Since R maps the solid onto itself, the turned die looks like any die.

- **Why playback, not replay in the live world.** Rapier replays a headless throw bit for bit
  (tested in `preSimulate.test.ts`), but a live world only matches when it is built bit-identically
  (moving a start by 1e-6 changed a top face on 5 to 8 throws of 20), and the live settle check
  runs on render frames. Playing the recorded path back needs neither.
- **Every tray simulates for itself.** Other players' trays run the same pre-simulation from the
  synced throws and obstacle poses, and compute their own R from what their path lands on, so they
  show T even if a path differed. Each path is made once per die id (`tracksRef`): a die keeps its
  path while others land, chain dice are thrown, or one is dragged and rethrown (the moving dice
  aren't obstacles for a rethrow).
- **Fallbacks.** A die with no record face (hidden rolls on other trays, rolls in another format)
  rolls live as before. If the pre-simulation throws, the die rolls live and turns after it
  settles (the 3.0 turn in `PhysicsDice`: a 250 ms slerp from identity to R).
- **The reported pose** is `rotation · R` (d4: plus the pivot's shift, `turnedPose`), what
  `finishDieRoll` stores and `DiceRollSync` sends, so the static dice of every tray, and a die
  placed again by a fixed transform (which never turns), show the record's face.
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
- **In the code:** `helpers/faceSymmetry.ts` (pure, tested for every die and style: every landed
  face turns to read every face) builds each type's group from `colliders/colliderVertices.ts`
  (the hulls' vertices, shared with the colliders and the pre-simulation) and picks `R` from the
  locators read off the die (`getLocatorsFromDiceGroup`, so the d20's rotated mesh is accounted for).

## Storage (localStorage)

- `chongkit.chongdie`: saved rolls (tabs, pills, typed history), `chong/savedRolls.ts`. Only
  `chongStore` writes it.
- `chongkit.chongdie.prefs`: `panelOpen` (`chong/prefs.ts`, `prefsStore`); the 2.x `nimble` switch is dropped on load.
- Stores: `chongStore` (saved rolls, tabs, draft, error), `trayStore` (tray error banner),
  `prefsStore`, `partyStore` (other players, the tray shown full size).
