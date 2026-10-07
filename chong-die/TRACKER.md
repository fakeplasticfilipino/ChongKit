# Chong Die: tracker

Owlbear Rodeo dice extension, a fork of owlbear-rodeo/dice (GPL-3.0). How it works:
`chong-die-src/DESIGN.md`. Version history: `git log`. Update this when work starts or finishes.

Legend: ✅ done · 🚧 in progress · 📋 planned · 💡 idea

## ✅ Now (v3.1.0)
- One window: tray with the command line on top and ▤ Rolls beside it; the Rolls panel docks to the right and fades in / out as it opens / closes (the tray never squeezes)
- Rolls tab with dice pills (each click adds a die to the tray) and the dice style; saved-roll pills that always roll; ⋯ for hide, history, players' trays, export / import
- Chong's Tracker's look (transparent, translucent surfaces)
- Roll engine (`src/engine/`): plain words (`adv`, `keep`, `crit`, `miss`, `chain`, `explode`, `xN`), the engine rolls first and every tray acts out the same record; MISS / CRIT / CAPPED marks
- Saved names (`name = text`); `nimble = crit miss 1` built in and editable
- Primary Die outline from the record whenever a roll uses `crit` or `miss`; dropped dice fade; chain dice pop out after their parent settles
- Dice land on the record's face naturally (3.1.0): each throw is pre-simulated out of sight and played back with the model already turned, so there's no turn after landing; sounds replay from the simulation
- Libraries in six `vendor-*` chunks: a new MUI / drei part rewrites only that chunk (~250 KB), never Rapier (2 MB) or three.js
- Rolls from Chong's Tracker (converted to the new words); shared examples tested by both sides; `npm test` runs everything
- Hold to roll for every custom roll (typed, pills, tracker, history): dice wait on the tray, hold and release Roll
- 3.0.2: a sign glued after a name or range (`atk+3`, `nimble-1`, `miss 4-+3`) counts; the `# note` ends the result's first line; `crit each` outlines every kept first-throw die; `nimble` lives in `chong/savedRolls.ts` (none in the engine); "Saved atk" is a plain notice, not red
- Removed in 3.0: Avrae syntax, waves, right-click exploding, the Nimble switch
- Removed in 2.7: the ⚡ Instant switch, bonus / advantage, the fairness tester and debug store

## 📋 To check at the table (Owlbear, two players)
- [ ] 3.1.0: dice tumble and stop on the result with no turn, on both trays; collision sounds still play; a chain die bounces off the dice lying in the tray; a die dragged and rethrown lands on the same face
- [ ] `2d6 adv`: three d6 land, the dropped one fades; same text and total on the other tray
- [ ] `1d8 crit` until it crits: a chain d8 pops out after the parent settles; gold outline; CRIT
- [ ] `atk = 1d10 nimble chain 5+ chain adv`, then `atk +3`: on 5+ a pair pops out and the lower fades; on 1 a dark red outline and MISS
- [ ] Twenty rolls of `4d6 adv crit`: every die shows the result's face on both trays; `1d4`, `1d10`, `1d100`, `1d20` turn in place with no jump (watch the d4)
- [ ] Drag-rethrow a die mid-roll and after the roll: it lands on the same recorded face
- [ ] ⋯ → Hide rolls: the other player sees the backdrop and no total; the turned faces still show
- [ ] Pill, tracker note roll (`(2×) 1d8!+1d8+2`) and history replay wait on the tray; with Chong Die closed the tracker says "Install Chong Die to roll"
- [ ] `1d7` rolls at once; `1d20 frob` shows the error banner
- [ ] `100d6`: rolls and syncs (metadata size); `1d10 nimble+3` adds the 3; `3d10 crit each`: each die outlined; `1d10 crit # sword`: the note shows on the other player's tray

## ✅ Checked in a real Owlbear room (two players)
- [x] Install from the manifest; the window narrows / widens with ▤; phone width
- [x] Owlbear's glass shows through the panel
- [x] Command line, dice pills + Roll, pills; other players see the same dice and total
- [x] (2.x) Nimble: outline on your tray and on other players'; right-click and long-press chains, same total on both sides
- [x] Hidden rolls; ⋯ → a player's tray; roll history
- [x] A roll clicked in Chong's Tracker, with the window closed and open
- [x] Export / import (downloads may be blocked in the extension frame)

## 💡 Backlog
- A die popped out next to a wall can come to rest wedged on the wall or its parent: aim `popThrow` away from the nearest wall
- Import keeps duplicate tab / pill ids: regenerate them
- Pills can't be dragged on touch screens; a pill's tooltip can show on top of its long-press menu
- Virtual dice (d7, d30 …) show only in the text, not as a chip
- Two tracker rolls in flight: the background's per-roll ack listeners can unsubscribe each other (harmless, deduped)
