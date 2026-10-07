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
- Avrae-style roll engine (`src/roll/`): parser, evaluator, result text
- Command line, saved-roll tabs and pills (`src/chong/`)
- Follow-up dice waves for rerolls and exploding dice
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
- Dice land on the record's face: a settled die turns its model by a symmetry of the solid
  (from the collider hull) onto the face the roll decided, and that pose is what other players see
