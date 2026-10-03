# Tracker

Status of ChongKit tools. Update this when work starts or finishes.

Legend: ✅ done · 🚧 in progress · 📋 planned · 💡 idea

## Character Sheet (`character-sheet/`)

### ✅ v1 — done
- [x] Layout of the official Nimble sheet: details row, Hit Points shield with Temp HP, STR/DEX/INT/WIL with key-stat box and save ▲/▼, Armor, Initiative, Wounds track with skull and 5 mark boxes, 10-skill band, two notes panels
- [x] Skills = stat + points (type a total, the difference is kept); Initiative = DEX + bonus
- [x] Calculator boxes for HP / Temp HP / Current-Max (`-4`, `+3`, `13-4`); Bloodied HP in dark red
- [x] Per-section + popover: add Number / Text / Current-Max / Skill boxes, remove and restore default boxes, drag to reorder; Mana, Gold, Inventory and Max Wounds waiting under Defense
- [x] Notes: free text left, collapsible entries right (click a bar to open, drag to reorder, delete)
- [x] Several characters in localStorage; New / Copy / Delete / Export / Import (.json) / Print
- [x] Phone layout (one column, skills 5 × 2); landing-page card
- [x] Long skill names (Examination, Naturecraft) fit on narrow phones; Android's condensed font added to the fallbacks
- [x] Tests: skill math, wounds, saves, Bloodied, calculator, normalize, storage, import/export, undo
- [x] Clearer editing: playing vs **Edit layout** mode, + N tabs for extras, red × to remove, Undo toast + Ctrl+Z (keeps typing done since), grips for dragging, ↑/↓ steps numbers, outlined white fields, entry previews + expand/collapse all, More menu, Saved indicator

### 💡 Ideas
- Ancestry / Class "Apply" (fills stats, HP, saves, key stats) — needs the core rules data, which isn't in the GM Guide

## Combat Generator (`combat-generator/`)

### ✅ v1 — done
- [x] Extract rules from the GM Guide (p.22, 25–27, 30–31, 44, 75) → `nimble-data.js`, `docs/rules-reference.md`
- [x] Encounter budget by difficulty (Easy / Medium / Hard / Deadly / Very Deadly) — p.26
- [x] 1–4 monsters per hero, levels drawn from the Monster Builder table — p.26, p.30
- [x] HP by armor (None / Medium / Heavy), 60/30/10 armor mix — p.26, p.30
- [x] **Randomized damage dice with exactly the guide's average** (single or 2× attacks, any die or themed die)
- [x] Save DC + CR equivalent per monster — p.30
- [x] Optional flavor abilities (HP drops 1 row per ability) — p.30–31
- [x] Minion waves (0–4 per hero), die size by party level — p.25, p.27
- [x] Legendary solo boss (HP, Bloodied, Last Stand, small/big attack, DC) — p.44
- [x] Expected gold reward per hero + party, patron wealth shift — p.22, p.26, p.75
- [x] Editable monster names, copy-as-text
- [x] UI restyled to match the GM Guide (parchment, stat-block frames, ability bars, heart/shield icons)
- [x] Simple UI: −/+ steppers, boxed toggles for fight type and difficulty, More options, auto-regenerate, HP / Damage / Save DC stat boxes, one toolbar (New Encounter · New Dice · Copy)
- [x] Removed: dice rolling, HP trackers, helper and explainer text (not wanted)
- [x] Tests: dice averages, difficulty bands, HP table lookup, reward table

### ✅ v2 — done
- [x] Bestiary picker (p.33–41): Creatures = Generic or one of 10 families (Kobolds, Goblins, Bandits, Snakemen, Dungeon Denizens, Hill & Field, Undead, Forest Denizens, Cultists/Horrors, Underground). Every stat block transcribed and checked against page images.
- [x] Exact level-mix search so named fights land inside the p.26 band with 1–4 per hero; families that can't are greyed out
- [x] Save DC for bestiary monsters **derived** from the p.30 row by level (marked "(by level)")
- [x] Faction loot tables shown with the reward (Kobold, Goblin, Bandit, Dungeon Denizen, Undead, Briarbane, Horrible, Underground)
- [x] Output is one plain, editable textbox (Name xN / HP / Armor / Damage / Save DC), with New Encounter · New Dice · Copy

### ✅ v3 — done
- [x] Build: Normal / Mixed / Glass cannon / Tank (p.30: damage and HP shift 1–5 rows in opposite directions; tank mirror is the tool's reading)
- [x] Unique encounter twist (p.28–29, all 37), off by default
- [x] Generic monsters fill in when a family can't reach the budget (shown with their level for reskinning)
- [x] Setup choices remembered in localStorage (never the generated fight)

### 📋 Next up
- (nothing queued)

## ✅ Nimble 3rd Party Creator License
- [x] Attribution word for word in every Nimble page footer (landing page, combat generator, rules reference)
- [x] Free-to-use notice as a banner at the top of each Nimble page, linking nimbleRPG.com

## Chong's Tracker (`chongs-tracker/`)
Owlbear Rodeo extension, tracked separately in [chongs-tracker/TRACKER.md](chongs-tracker/TRACKER.md).

## Site (GitHub Pages)
- [x] Landing page (`index.html`) with a card per tool
- [x] Shared stylesheet `assets/css/nimble.css`
- [x] `_config.yml` keeps the PDF, tests and notes off the public site
- [x] Pages is on (https://fakeplasticfilipino.github.io/ChongKit/)

## Other tools (future)
- 💡 Skill challenge runner (p.15)

## Open questions
- Gold per encounter is **derived**, not printed in the guide (see README → Rewards). Adjust the
  sessions-per-level or session-mix assumptions in `nimble-data.js` if our table levels faster/slower.
