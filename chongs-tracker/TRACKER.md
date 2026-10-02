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
- [x] Attach both ways: click an entry's empty + circle then a token on the map, or select first then click +; box-select several = next entries in order
- [x] Token badges (local, per screen): red HP circle lower-left, blue Extra HP circle beside it, AC shield lower-right; dark outlines
- [x] Entry row: token picture (click = select on map), name, neutral HP bar (fills against Max HP), Extra HP chip
- [x] ⋯ menu: Max HP, Extra HP, AC (free text: `M`, `H`, `15`…), show/hide, detach, move to tab, delete
- [x] ⓘ button lists the add-box commands
- [x] Selecting a tracked token on the map puts its entry at the top of the list (outlined) until deselected
- [x] Hidden stats by default (except players' tabs): players see the entry with H/B (Bloodied ≤ half) and AC, in the panel and on tokens; GM toggles per entry (⋯ menu) and per tab
- [x] Players: see every entry; add and edit entries in the Players tab and in tabs they made
- [x] Right-click a token → "Track in Chong's Tracker"
- [x] One flat look matching Owlbear's panels (no light/dark switching)
- [x] Tests: math, HP rules, command parser, generator paste, metadata round trip, permissions

## 📋 Next up
- [ ] Install in a real Owlbear room and check: badge size/position on different token sizes, the AC shield shape, click-to-attach (popover stays open?), token pictures in the panel, context-menu icon, players' view
- [ ] Fix whatever that test turns up

## Dropped
- Custom counters (number, slider, checkbox): removed, not wanted

## 💡 Ideas
- [ ] Reorder entries (drag)

## Notes
- Hidden stats are hidden in the UI only: scene metadata is readable by every client.
- Tabs are one metadata key, so a player and the GM changing tabs at the same instant can overwrite each other.
- Manifest paths are absolute (`/ChongKit/chongs-tracker/...`) because the site is served under
  `/ChongKit/`. If the repo is renamed, update `manifest.json`.
