# Chong Die: tracker

Owlbear Rodeo dice extension, a fork of owlbear-rodeo/dice (GPL-3.0). How it works:
`chong-die-src/DESIGN.md`. Version history: `git log`. Update this when work starts or finishes.

Legend: ✅ done · 🚧 in progress · 📋 planned · 💡 idea

## ✅ Now (v2.9.0)
- One window: tray with the command line on top and ▤ Rolls beside it; the Rolls panel docks to the right and glides open / closed (the tray never squeezes)
- Rolls tab with dice pills (each click adds a die to the tray) and the dice style; saved-roll pills that always roll; ⋯ for hide, history, players' trays, Nimble, export / import
- Chong's Tracker's look (transparent, translucent surfaces)
- Avrae roll engine with reroll / explosion waves; same total on every player's tray
- Nimble switch: purple outline on each term's leftmost landed die (dark red on a 1, bright gold on the highest face); right-click / long-press starts an explosion chain
- Rolls from Chong's Tracker; shared examples tested by both sides; `npm test` runs everything
- Removed in 2.7: Place mode (and the ⚡ switch), bonus / advantage, the fairness tester and debug store

## ✅ Checked in a real Owlbear room (two players)
- [x] Install from the manifest; the window narrows / widens with ▤; phone width
- [x] Owlbear's glass shows through the panel
- [x] Command line, dice pills + Roll, pills; other players see the same dice and total
- [x] Nimble: outline on your tray and on other players'; right-click and long-press chains, same total on both sides
- [x] Hidden rolls; ⋯ → a player's tray; roll history
- [x] A roll clicked in Chong's Tracker, with the window closed and open
- [x] Export / import (downloads may be blocked in the extension frame)

## 💡 Backlog
- A die popped out next to a wall can come to rest wedged on the wall or its parent: aim `popThrow` away from the nearest wall
- Other players' trays may replay a follow-up wave slightly differently mid-roll (totals are right); maybe defer `addDice` a tick
- A pill over the dice limits (`!rr 25 5d6`) isn't outlined red; it errors only on click
- Import keeps duplicate tab / pill ids: regenerate them
- Pills can't be dragged on touch screens; a pill's tooltip can show on top of its long-press menu
- Virtual dice (d7, d30 …) show only in the text, not as a chip
- Two tracker rolls in flight: the background's per-roll ack listeners can unsubscribe each other (harmless, deduped)
- The vendor chunk changes whenever a new library part is imported (~3.5 MB of git history each time): split three.js/Rapier from MUI, or build on GitHub Actions instead of committing `chong-die/`
- Hidden rolls still put the command and virtual-die values in player metadata (accepted)
