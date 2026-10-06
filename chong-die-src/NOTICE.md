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
