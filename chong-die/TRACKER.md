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
- [x] ~~Primary-die glow~~ (replaced in v1.3.0)

## ✅ v1.3.0
- [x] Primary die drawn in its own style (sidebar button under the dice style picker; default: a style different from the dice)
- [x] Nimble switch (N): primary die explodes on max, a 1 is a Miss; recorded with the roll so everyone sees the same (tested)
- [x] Dice picked by hand roll as commands (primary die + Nimble), except advantage / disadvantage picks
- [x] Glow removed; Combat Generator's Avrae Version removed

## ✅ v1.4.0
- [x] Nimble rules moved to the ⋯ menu (N button removed)
- [x] Primary die button and primary style only with Nimble on (tested)

## ✅ v1.4.1
- [x] Exploding dice pop out higher (peak ≈1.3, under the 1.5 roof) and spin harder (tested)

## ✅ v2.0.0
- [x] Two windows: the toolbar button opens the Rolls window (520 × 640: command line, tabs and the ⚡ + 🎲 ⋯ row, pills); the tray is its own popover, stock look, top right, × to close
- [x] Every roll goes `…/roll` → background → tray (opened if closed, never re-opened); `place` in the message, tracker rolls follow the saved active tab (tested)
- [x] Stores split: only the Rolls window writes saved rolls; prefs follow the other window via `storage` (tested)
- [x] Browser check (local, no Owlbear): Rolls window layout, typo error not sent, history; tray page stock sidebar

## ✅ v2.1.0
- [x] v2.0's separate tray popover never appeared in Owlbear: back to one window, the Rolls panel docked to the right of the tray (300 px, the window widens), ▤ in the sidebar, remembered (tested)
- [x] Panel rolls on the tray directly (`runPill`, tested); tracker rolls via the background → action (the v1 path)
- [x] Browser check (local): layout 60 | 350 | 300, typo error, roll recorded, panel toggle

## ✅ v2.2.0
- [x] Command line always on top of the tray, ⚡ quick roll (Instant) and ▤ Rolls beside it (round, Owlbear-style)
- [x] Upstream's dice sidebar moved into the Rolls panel (360 px); closed, the window is just the tray (tested width)
- [x] Browser check (local): layout, quick roll toggles the tab's Instant, typo error under the line, ▤ closes/opens the panel

## ✅ v2.3.0
- [x] Chong's Tracker look: transparent window, translucent surfaces, no outlines, round icon buttons
- [x] Sidebar removed: dice pills (click adds one, count shown) at the top of the Rolls tab with dice style / primary die on the left; settings in ⋯ (hide, bonus / advantage, history, players' trays)
- [x] Rolls tab can't be closed or moved (tested); + add roll is a pill after the last pill
- [x] Browser check (local): dice pills put dice on the tray, ⋯ menu, layout

## ✅ v2.4.0
- [x] Nimble rules and the primary-die style removed: fully system-agnostic again
- [x] Leftmost die of each term glows on the tray floor (tested which dice; seen in the browser)
- [x] Right-click a landed die (touch: long-press) explodes it: `chong.manual` + `<key>m` dice, chains, 20-dice cap (tested); browser: 9 → 13 with a die popping out

## ✅ v2.5.0
- [x] Nimble switch back in ⋯ (recorded with the roll): glows + right-click chains; off = plain dice (tested)
- [x] Glow goes on the die that landed furthest left in each term, not the first in the command (tested; browser: 1d6+3d6)
- [x] Right-click starts a chain: the new die explodes again on its max (tested; browser: one right-click, 17 → 25)

## ✅ v2.6.0
- [x] Nimble highlight is the top number itself, glowing purple (ray down → nearest number in the shared number mask; `findNumber` tested); browser: d6, d8, d10, d12, d20 incl. two-digit numbers

## 📋 Next up
- [ ] Check the number glow on every dice style (only Galaxy checked) and on a d4 / d100
- [ ] A die popped out next to a wall can come to rest wedged on the wall / its parent (seen in the browser): aim popThrow away from the nearest wall
- [ ] Owlbear, v2.4: long-press on a phone explodes without throwing the die; another player sees the exploded die and the same total; glows on other players' trays
- [ ] Owlbear, v2.3: Owlbear's glass shows through (transparent body); ⋯ → a player's tray; hidden rolls
- [ ] Owlbear, v2.2: the window narrows to just the tray with the panel closed; another player's roll popover with the panel closed (its focus listener lives in the sidebar)
- [ ] Owlbear, v2.1: the window widens / narrows with ▤; a panel roll and a placed pill on the tray; a tracker roll with the window closed and open; phone width (the window may be wider than the screen)
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
