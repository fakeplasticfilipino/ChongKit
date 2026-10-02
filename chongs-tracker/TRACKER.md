# Chong's Tracker: tracker

Owlbear Rodeo extension for tracking token health and counters. System-agnostic, separate from
the Nimble tools. Update this when work starts or finishes.

Legend: ✅ done · 🚧 in progress · 📋 planned · 💡 idea

## ✅ v1 — built, needs a real Owlbear test
- [x] Extension skeleton: `manifest.json`, action popover (`index.html`), background page, vendored SDK
- [x] Tabs: create (+), rename (double-click), delete (×); **Players** tab is permanent
- [x] Entries: name + HP; everything saved to the **scene's** metadata (never room metadata), one key per entry
- [x] Inline math in HP boxes: `20-3`, `-3`, `+5`, `12`; no dice
- [x] HP rules: damage uses Extra HP first; with Max HP set, HP can't go above it; HP can go below 0
- [x] Batch command: `Goblin x4 15`, `Ogre 59 ac:M max:70 extra:5`, or paste the combat generator's text
- [x] Attach selected token(s) to an entry; several selected = next entries in order
- [x] Token badges (local, per screen): red HP circle, blue Extra HP circle, label for counters marked "show on token"
- [x] Expand an entry: Max HP, Extra HP, AC (free text: `M`, `H`, `15`…), custom counters (number, slider, checkbox) with show-on-token toggle, move to tab, delete
- [x] Hidden by default (except Players tab); GM eye toggle per entry and per tab
- [x] Players: see Players tab + revealed entries (read-only); add and edit entries in the Players tab
- [x] Right-click a token → "Track in Chong's Tracker"
- [x] Follows Owlbear's theme (dark/light)
- [x] Tests: math, HP rules, command parser, generator paste, metadata round trip, permissions

## 📋 Next up
- [ ] Install in a real Owlbear room and check: badge size/position on different token sizes, the counter label anchor, context-menu icon, players' view
- [ ] Fix whatever that test turns up

## 💡 Ideas
- [ ] Reorder entries (drag)
- [ ] Click an entry's name to select its token on the map

## Notes
- Hidden entries are hidden in the UI only: scene metadata is readable by every client.
- Manifest paths are absolute (`/ChongKit/chongs-tracker/...`) because the site is served under
  `/ChongKit/`. If the repo is renamed, update `manifest.json`.
