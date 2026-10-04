# Chong's Tracker: tracker

Owlbear Rodeo extension for tracking token health. System-agnostic, separate from
the Nimble tools. Update this when work starts or finishes.

Legend: ✅ done · 🚧 in progress · 📋 planned · 💡 idea

## ✅ v1 — built, needs a real Owlbear test
- [x] Extension skeleton: `manifest.json`, action popover (`index.html`), background page, vendored SDK
- [x] Tabs: create (+), rename (double-click), delete (×); **Players** tab is permanent; players can make and manage their own tabs
- [x] Entries: name + HP; everything saved to the **scene's** metadata (never room metadata), one key per entry
- [x] Inline math in HP boxes: `20-3`, `-3`, `+5`, `12`; no dice
- [x] HP rules: damage uses Extra HP first; with Max HP set, HP can't go above it; HP can go below 0
- [x] Batch command: `Goblin x4 15`, `Ogre 59 ac:M max:70 extra:5`, or paste the combat generator's text
- [x] Minions: one shared entry, HP = number of minions (`Kobold Minion x10` → 10 HP)
- [x] `/clear` and `/clear Goblin`: GM-only mass delete in the current tab, with a confirm
- [x] Several tokens per entry: minion groups take every picked token (×N in the row); minion tokens get no badges, other entries badge their first token on the map
- [x] Drag a card to reorder (anywhere but buttons/boxes; a short press on the name still edits)
- [x] Tabs saved one key each (`com.chongkit.tracker/t/<id>`), so players and the GM adding tabs at once don't clash; the old single key migrates itself
- [x] Asset links carry `?v=<version>` so Owlbear never mixes old and new files
- [x] Panel background lets Owlbear's glass show through (no `color-scheme`); add box updates the list immediately
- [x] Attach both ways: click an entry's empty + circle then a token on the map, or select first then click +; box-select several = next entries in order
- [x] Token badges (local, per screen): small dark pills with a thin colored edge (v1.6.0, were big outlined circles): HP lower-left (red edge; hidden: green H / dark-red B), Extra HP beside it (blue), AC lower-right with a shield mark; what doesn't fit beside HP moves up a row (never overlaps); layout in `core.js` `badgeSpecs` (tested)
- [x] Entry row: token picture (click = select on map), name, neutral HP bar (fills against Max HP), Extra HP chip
- [x] ⋯ menu: Max HP, Extra HP, AC (free text: `M`, `H`, `15`…), show/hide, delete
- [x] Move an entry to another tab by dragging it onto the tab (the ⋯ menu's tab picker and + Token are gone)
- [x] Detach: with the token selected, an × shows over its picture in the entry; click it (the Detach button is gone)
- [x] Save a tab to the room (door button, confirm with a 16 kB warning): the tab and its entries live in room metadata and show in every scene; per tab, not per player
- [x] Help sheet: ⓘ in the lower-right corner opens a short prose guide over the whole panel (also shown on the extension page); no + button by the add box (Enter adds)
- [x] Hidden stats look the same on the map for GM and players (H/B + AC); GM sees real HP in the panel; hidden entries are just dimmed (no eye icon)
- [x] Selecting a tracked token on the map puts its entry at the top of the list (outlined) until deselected
- [x] Hidden stats by default (except players' tabs): players see the entry with H/B (Bloodied ≤ half) and AC, in the panel and on tokens; GM toggles per entry (⋯ menu) and per tab
- [x] Players: see every entry; add and edit entries in the Players tab and in tabs they made
- [x] Right-click a token → "Track in Chong's Tracker"
- [x] One flat look matching Owlbear's panels (no light/dark switching)
- [x] Tab strip scrolls sideways: + pinned right, wheel scrolls, edges fade, thin faint scrollbar from 5 tabs, open tab scrolls into view, dragging an entry near an end scrolls it
- [x] Tests: math, HP rules, command parser, generator paste, metadata round trip, permissions
- [x] Browser smoke test against a fake Owlbear SDK (add, math, Extra/Max HP, AC, attach/detach, focus, hide all, rename, room tab, /clear, help, delete tab, phone width): all pass. Fixed two typing bugs it found: text typed into the add box right after making a tab was wiped, and a change from another player mid-rename wiped the tab name (v1.4.1)

## ✅ Notes (v1.5.0)
- [x] Entry notes (⋯ menu): a pasted generator block keeps its Damage, Save DC, Move and ability lines there
- [x] Tab general note (box under the add box): the fight's title, twist, family traits and loot from a paste; GM tabs: GM only. Works on the Players tab too (its `t/players` key carries the note)
- [x] Armor keeps its first letter: Medium → M, Heavy → H, `ac:Medium` too; None gives no AC (v1.5.1)
- [x] `/clear` also empties the tab's general note (`/clear Goblin` leaves it) (v1.5.2)
- [x] Tests: notes from a paste, general note, armor letters, Players tab note round trip
- [x] Browser smoke test (fake SDK): paste → tab note + entry notes, edit both, saved to metadata

## 📋 Next up
- [ ] Install in a real Owlbear room and check: notes (tab + entry), drag onto a tab, the × detach, a room tab across two scenes, badge pills on different token sizes and maps (v1.6.0), click-to-attach (popover stays open?), token pictures in the panel, context-menu icon, players' view
- [ ] Fix whatever that test turns up

## Dropped
- Custom counters (number, slider, checkbox): removed, not wanted

## 💡 Ideas
- (none right now)

## Notes
- Hidden stats are hidden in the UI only: scene metadata is readable by every client.
- Room tabs: token ids are per scene, so a room entry keeps tokens from several scenes and shows the
  ones on the current map. Tokens deleted without detaching stay in the list (a few bytes each).
- Manifest paths are absolute (`/ChongKit/chongs-tracker/...`) because the site is served under
  `/ChongKit/`. If the repo is renamed, update `manifest.json`.
