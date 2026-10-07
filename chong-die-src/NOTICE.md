# Notice

Chong Die is a modified version of **Owlbear Rodeo Dice**
(https://github.com/owlbear-rodeo/dice), © Owlbear Rodeo, licensed under the
GNU General Public License v3.0 (see `LICENSE`). Chong Die is distributed
under the same license.

## Changes made by ChongKit

- Renamed to Chong Die; plugin id `com.chongkit.chongdie/` (was `rodeo.owlbear.dice/`)
- Built into `../chong-die/`, served from `/ChongKit/chong-die/` on GitHub Pages
- Libraries split into a separate `vendor` chunk; Vitest added for tests
- Avrae-style roll engine (`src/roll/`): parser, evaluator, result text
- Command line, saved-roll tabs and pills, Place/Instant (`src/chong/`)
- Follow-up dice waves for rerolls and exploding dice
- Owlbear SDK upgraded from 1.3.9 to 3.x (for messages from Chong's Tracker)
- Command line always on top of the tray, with quick roll and Rolls buttons beside it; the Rolls
  panel docks to the right of the tray
- Sidebar removed: dice are pills in the first tab, dice style beside them, the other
  settings (hide, bonus / advantage, history, players' trays) in the ⋯ menu; fairness tester button
  removed; Chong's Tracker look (transparent, translucent surfaces)
- Optional Nimble switch: the top number of each term's leftmost landed die lights up;
  right-click / long-press a landed die to start an explosion chain (in everyone's result)
