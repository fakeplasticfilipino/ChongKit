# Tracker

Status of ChongKit tools. Update this when work starts or finishes.

Legend: ✅ done · 🚧 in progress · 📋 planned · 💡 idea

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
- [x] Roll button (miss on 1, exploding crit on max, minions can't crit)
- [x] HP tracker boxes, editable monster names, copy-as-text
- [x] UI restyled to match the GM Guide (parchment, stat-block frames, ability bars, heart/shield icons)
- [x] Tests: dice averages, difficulty bands, HP table lookup, reward table

### 📋 Next up
- [ ] Bestiary picker (p.33–41): generate with named monsters (Kobolds, Goblins, Bandits, Snakemen, Oozes, Mimics, Undead…) instead of generic "Monster A". *Needs careful transcription — HP values extract out of order from the PDF; verify against page images.*
- [ ] Faction loot tables (e.g. "Goblin Loot", "Bandit Loot") shown with the reward
- [ ] Glass-cannon / tank variants (p.30: shift damage rows up and HP rows down, or vice versa)
- [ ] Mixed-level parties (enter each hero's level instead of one level for all)

### 💡 Ideas
- [ ] "Unique Encounter" twist roller (p.28–29: Ambush, Defend the Fort, Waves Upon Waves…)
- [ ] Legendary Bloodied / Last Stand ability suggestions (p.43 optional actions)
- [ ] Save/load encounters for session prep
- [ ] Initiative tracker

## Other tools (future)
- 💡 Treasure / Boon generator (p.19–23: Minor/Major/EPIC boons, lodging boons)
- 💡 Skill challenge runner (p.15)

## Open questions
- Gold per encounter is **derived**, not printed in the guide (see README → Rewards). Adjust the
  sessions-per-level or session-mix assumptions in `nimble-data.js` if our table levels faster/slower.
