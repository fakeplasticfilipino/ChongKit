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
- Two windows: the toolbar button opens a Rolls window (command line, saved rolls); the tray is a
  separate popover (`tray.html`) opened by the background page, with a close button in its sidebar
- Primary die drawn in its own style and optional Nimble rules
