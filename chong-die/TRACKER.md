# Chong Die: tracker

Owlbear Rodeo dice extension, a fork of owlbear-rodeo/dice (GPL-3.0). Spec:
`docs/superpowers/specs/2026-10-06-chong-die-design.md`. Update this when work starts or finishes.

Legend: ✅ done · 🚧 in progress · 📋 planned · 💡 idea

## ✅ v1.0.0
- [x] Upstream imported into `chong-die-src/`, renamed (plugin id `com.chongkit.chongdie/`), builds into `chong-die/`
- [x] Roll engine (`src/roll/`): Avrae parser, evaluator with reroll / explosion waves, result text, virtual dice for odd sizes
- [x] Saved rolls (tabs, pills, Instant switch, export/import) in localStorage `chongkit.chongdie`
- [x] Command rolls on the tray: follow-up waves, exploding dice pop out of their parent, other players see the same total
- [x] Command line (always on top, fades while rolling, history), panel, tab strip, pills, Place flow
- [x] Tests (Vitest): parser, evaluator, physical dice, result text, saved rolls, roll metadata, Place
- [x] Browser check (local): adv roll, exploding waves, reroll wave, virtual d7, save pill, Place, Instant

## ✅ v1.1.0
- [x] Owlbear SDK 3.x
- [x] Rolls from Chong's Tracker: background acks, opens the window, re-sends until acked; follows the open tab's ⚡ (tested)
- [x] Panel: + (add roll) and ⚡ (Instant) icon buttons; ★ removed; small new-tab +
- [x] Pills show name + dice; optional description (hover / long-press, dialog)

## ✅ v1.2.0
- [x] ⋯, + and ⚡ stacked down the panel's right edge; tabs get the whole row
- [x] Panel button at the end of the command line
- [x] Primary-die glow under the first die of each roll: purple, gold on a crit, red on a miss (`primaryDice`, tested)

## 📋 Next up
- [ ] Look at the primary glow with the window in front (size 0.13, opacity 0.35; tune if too faint or strong)
- [ ] Owlbear after the SDK 3 upgrade: party trays, other players' roll popovers, a roll clicked in the tracker
- [ ] Install in a real Owlbear room and test with two players: same totals on both sides, hidden rolls, party trays
- [ ] Watch an exploding die pop out with the window in front (the local check ran in a hidden pane, so physics only stepped on screenshots)
- [ ] Check in Owlbear: invalid pill outline, export/import (downloads may be blocked in the extension frame), phone width

## 💡 From the v1 review (deferred)
- Other players' trays may replay a follow-up wave slightly differently mid-roll (totals are right); check with two clients, maybe defer `addDice` a tick
- Hidden rolls still put virtual-die values and the command in player metadata: strip `chong.virtual` when hidden
- A pill over the dice limits (`!rr 25 5d6`) isn't outlined red; it errors only on click
- Import keeps duplicate tab / pill ids: regenerate them
- Virtual dice show only in the text, not as a flat chip; the history chip shows the command but not the total
- Pills can't be dragged on touch screens

## 💡 From the v1.1 review (deferred)
- Two tracker rolls in flight: the background's per-roll ack listeners can unsubscribe each other (harmless, deduped); use one listener + pending map, and catch the broadcast promises
- On touch, a pill's description tooltip can show on top of the long-press menu
- The vendor chunk changes whenever a new library part is imported (about 3.5 MB of git history each time): split three.js/Rapier from MUI so most rebuilds leave it alone
