# Chong Die: tracker

Owlbear Rodeo dice extension, a fork of owlbear-rodeo/dice (GPL-3.0). How it works:
`chong-die-src/DESIGN.md`. Version history: `git log`. Update this when work starts or finishes.

Legend: ✅ done · 🚧 in progress · 📋 planned · 💡 idea

## ✅ Now (v4.3.0)
- 4.3.0: clicking a saved pill also puts its roll in the command line (cursor at the end), so a player can add ` adv`, ` dis` or `+2` before throwing; while dice the line placed wait on the tray, the tray follows the line as it changes (half-typed text keeps the last good roll); Roll throws what the line says, the line clears, and an edited pill goes into ↑ history. Quick roll still throws pills at once.
- 4.2.0: `crit` is now `chain` (`chain5-10`, `chain>=5`, `chainadv`) and its mark CHAIN, since crits exist in other systems and don't chain; in a roll with `chain` or `miss`, the Primary Die's value goes to the die that lands leftmost (each tray works it out from its pre-simulation; the record and the odds are unchanged); the breakdown line is always shown along the bottom of the tray, on one line when it fits.
- 4.1.0: ⚡ Quick roll between the command line and ▤ (remembered; custom rolls throw at once); `crit>=5`, `crit>9`, `miss<=4`, `miss<2` alongside `crit5-10`.
- 4.0.0: a simpler command language (words glued to numbers: `adv3`, `crit5-10`, `miss1-4`, `critadv`, `x2`; words act on the first dice); removed keep/drop, explode, crit each, saved names and notes; removed the Chong's Tracker roll link; Rolls panel 280 px.
- One window: tray with the command line on top and ▤ Rolls beside it; the Rolls panel docks to the right and fades in / out as it opens / closes (the tray never squeezes)
- Rolls tab with dice pills (each click adds a die to the tray) and the dice style; saved-roll pills that always roll; ⋯ for hide, history, players' trays, export / import
- Chong's Tracker's look (transparent, translucent surfaces)
- Roll engine (`src/engine/`): plain words (`adv`, `dis`, `chain`, `miss`, `chainadv`, `xN`), the engine rolls first and every tray acts out the same record; MISS / CHAIN / CAPPED marks
- Primary Die outline from the record whenever a roll uses `chain` or `miss`, always on the leftmost die; dropped dice fade; chain dice pop out after their parent settles
- Dice land on the record's face naturally (3.1.0): each throw is pre-simulated out of sight and played back with the model already turned, so there's no turn after landing; sounds replay from the simulation
- Libraries in six `vendor-*` chunks: a new MUI / drei part rewrites only that chunk (~250 KB), never Rapier (2 MB) or three.js
- Hold to roll for every custom roll (typed, pills, history): dice wait on the tray, hold and release Roll

## History
- 3.0.2: a sign glued after a name or range (`atk+3`, `nimble-1`, `miss 4-+3`) counts; the `# note` ends the result's first line; `crit each` outlines every kept first-throw die; `nimble` lives in `chong/savedRolls.ts` (none in the engine); "Saved atk" is a plain notice, not red
- Removed in 3.0: Avrae syntax, waves, right-click exploding, the Nimble switch
- Removed in 2.7: the ⚡ Instant switch, bonus / advantage, the fairness tester and debug store

## 📋 To check at the table (Owlbear, two players)
- [ ] 4.3.0: click a pill, type ` adv`: a second die joins the tray; hold Roll: it rolls with advantage, the line clears, ↑ brings it back
- [ ] 4.2.0: `2d6 chain miss` twenty times: the outlined die is always the leftmost, on both trays; a dragged Primary keeps its value; the breakdown line sits at the bottom, on one line, with CHAIN / MISS
- [ ] 3.1.0: dice tumble and stop on the result with no turn, on both trays; collision sounds still play; a chain die bounces off the dice lying in the tray; a die dragged and rethrown lands on the same face
- [ ] `2d6 adv`: three d6 land, the dropped one fades; same text and total on the other tray
- [ ] `1d8 chain` until it chains: a chain d8 pops out after the parent settles; gold outline; CHAIN
- [ ] Twenty rolls of `4d6 adv chain`: every die shows the result's face on both trays; `1d4`, `1d10`, `1d100`, `1d20` turn in place with no jump (watch the d4)
- [ ] Drag-rethrow a die mid-roll and after the roll: it lands on the same recorded face
- [ ] ⋯ → Hide rolls: the other player sees the backdrop and no total; the turned faces still show
- [ ] `1d7` rolls at once; `1d20 frob` shows the error banner
- [ ] `100d6`: rolls and syncs (metadata size); `1d10+3 crit miss x2`: two separate rolls, each outlined on both trays

## ✅ Checked in a real Owlbear room (two players)
- [x] Install from the manifest; the window narrows / widens with ▤; phone width
- [x] Owlbear's glass shows through the panel
- [x] Command line, dice pills + Roll, pills; other players see the same dice and total
- [x] (2.x) Nimble: outline on your tray and on other players'; right-click and long-press chains, same total on both sides
- [x] Hidden rolls; ⋯ → a player's tray; roll history
- [x] Export / import (downloads may be blocked in the extension frame)

## 💡 Backlog
- A die popped out next to a wall can come to rest wedged on the wall or its parent: aim `popThrow` away from the nearest wall
- Import keeps duplicate tab / pill ids: regenerate them
- Pills can't be dragged on touch screens; a pill's tooltip can show on top of its long-press menu
- Virtual dice (d7, d30 …) show only in the text, not as a chip
