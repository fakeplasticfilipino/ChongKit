# Notice

Chong Die is a modified version of **Owlbear Rodeo Dice**
(https://github.com/owlbear-rodeo/dice), © Owlbear Rodeo, licensed under the
GNU General Public License v3.0 (see `LICENSE`). Chong Die is distributed
under the same license.

## Changes made by ChongKit

- Renamed to Chong Die; plugin id `com.chongkit.chongdie/` (was `rodeo.owlbear.dice/`)
- Built into `../chong-die/`, served from `/ChongKit/chong-die/` on GitHub Pages
- Libraries split into `vendor-*` chunks by how often they change (Rapier, three.js, React, MUI,
  3D helpers, the rest), so a rebuild only rewrites what changed; Vitest added for tests
- Avrae-style roll engine (`src/roll/`): parser, evaluator, result text (replaced in 3.0, see below)
- Command line, saved-roll tabs and pills (`src/chong/`)
- Follow-up dice waves for rerolls and exploding dice (removed in 3.0)
- Owlbear SDK upgraded from 1.3.9 to 3.x (for messages from Chong's Tracker)
- Command line always on top of the tray, with a Rolls button beside it; the Rolls panel docks to
  the right of the tray; it fades in / out as it opens or closes
- Sidebar removed: dice are pills in the first tab, dice style beside them, the other
  settings (hide, history, players' trays) in the ⋯ menu; bonus / advantage, the fairness tester
  and the debug store removed; Chong's Tracker look (transparent, translucent surfaces)
- Hold to roll for every custom roll: typed commands, pills and Chong's Tracker rolls put their
  dice on the tray; hold and release Roll to throw them
- Optional Nimble switch: a purple outline on each term's leftmost landed die (dark red on a 1,
  bright gold on the highest face);
  right-click / long-press a landed die to start an explosion chain (in everyone's result)
  (removed in 3.0)

### 3.0 (Oct 2026)

- New roll engine (`src/engine/`) replacing the Avrae-style one: saved names expand, a plain-words
  command parses to a plan, the plan rolls to a complete record (every die, its Primary Die, marks,
  total), and the record is formatted as the result text. The Avrae syntax, the wave runner and
  reading values back from the physics are removed
- Words: `adv`/`dis` counters, `keep`/`drop`, `crit` (and `crit each`), `miss`, `chain` (and
  `chain adv`), `explode`, `xN`, `# note`, with caps of 100 dice and 20 chain dice (CAPPED mark)
- Saved names (`name = text`), with `nimble` built in and editable (`chong/savedRolls.ts`: the
  engine holds no game system); replaces the Nimble switch
- The roller's record is what every player's tray acts out (`chong` metadata, version 3); hidden
  rolls sync without it
- Tray: chain dice pop out in stages after their parent settles, dropped dice fade, and the Primary
  Die outline is drawn from the record whenever a roll uses `crit` or `miss`; right-click / long-press
  exploding removed
- Dice land on the record's face: a settled die turns its model by a 250 ms symmetry turn of the
  solid (from the collider hull) onto the face the roll decided, and that pose is what other players
  see (`helpers/faceSymmetry.ts`, `dice/PhysicsDice.tsx`)
- Upstream files changed in 3.0: `colliders/D4–D20Collider.tsx` (hull vertices moved to
  `colliders/colliderVertices.ts`, shared with the face turn); `materials/DiceMaterial.tsx`
  (pass-through props, for fading); `dice/Dice.tsx` (a `faded` prop); `dice/DiceRoll.tsx`,
  `dice/InteractiveDiceRoll.tsx`, `plugin/PlayerDiceRoll.tsx` (faded dice and faces from the record,
  no landed values passed down); `helpers/getValueFromDiceGroup.ts` (`getLocatorsFromDiceGroup`);
  `dice/store.ts` (`rerollDraft` keeps a rethrown die's record metadata; reveal stages);
  `dice/InteractiveDice.tsx` (right-click / long-press exploding removed);
  `controls/DiceRollControls.tsx` (dice picked by hand roll through the engine);
  `controls/DiceResults.tsx` (comment); `plugin/DiceRollSync.tsx` (hidden rolls sync without the
  record); `tray/InteractiveTray.tsx` (the reveal runner)

### 3.0.2 (Oct 2026)

- A `+` or `-` glued after a saved name (`atk+3`), a range (`miss 4-+3`) or `chain adv` starts the
  next part; the result's first line ends with the roll's `# note`; `crit each` outlines every
  kept die of the first throw; `nimble` moved out of the engine into `chong/savedRolls.ts`;
  "Saved" / "Deleted" notices are no longer red; a d1's 1 is not bold

### 3.1.0 (Oct 2026)

- Dice land on the record's face with no turn: each throw is pre-simulated headless
  (`helpers/preSimulate.ts`) and played back (`dice/PlaybackDice.tsx`), the model turned by the
  solid's symmetry from the first frame; collision sounds replay from the simulation
  (`dice/useDieSound.ts`). Upstream files changed: `colliders/TrayColliders.tsx` (built from
  `colliders/trayShape.ts`, shared with the pre-simulation), `dice/PhysicsDice.tsx` (sound moved
  to `useDieSound`), `dice/DiceRoll.tsx` (plays back dice with a record face)
