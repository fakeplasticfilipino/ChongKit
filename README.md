# ChongKit

Tools for our Nimble 5e table. All rules and numbers come from the **Nimble 5e v2 GM Guide v2.0.1** (the PDF in this repo).

## Tools

| Tool | Status | What it does |
|------|--------|--------------|
| [Combat Generator](combat-generator/) | ✅ v2 | Builds an encounter for your party, with generic or named bestiary monsters: HP, armor, damage, Save DC, and the expected gold reward. |

See [TRACKER.md](TRACKER.md) for what's done and what's next.

## Combat Generator

**To use:** open the site on GitHub Pages and click **Combat Generator**, or open `combat-generator/index.html` in any browser. No install needed. It loads the book-style fonts from Google Fonts when online and falls back to system fonts offline.

1. Use **−/+** to set the number of heroes and their level.
2. Pick **Monsters** or **Boss**, then a difficulty. The fight updates right away.
3. Pick **Creatures**: **Generic** (Monster Builder stats) or a bestiary family such as Kobolds, Goblins, Bandits or Undead.
4. Armor, dice, minions, who's paying, and special abilities are under **More options**.

The fight is written as plain text in one box, one block per monster:

```
Kobold Trapper x3
HP: 26
Armor: None
Damage: Throw Scorpion (2×). (Range 8) 1d4+2.
Save DC: 10 (by level)
```

followed by any abilities, then the gold for each hero and the whole party (plus the family's loot table, if it has one). The box is editable, so rename monsters or add notes right there.

- **New Encounter:** a different fight with the same settings.
- **New Dice:** the same generic monsters (or boss) with new dice (same averages).
- **Copy:** copies the text, ready to paste into notes or Discord.

### Randomized dice (same average)

The guide's Monster Builder (p.30) gives each monster level a **damage per round**. For example, a level 6 monster deals 21. The guide also says any die size is fine *"as long as overall damage per round stays consistent."*

Each time you generate, the tool picks a random mix of dice whose average is **exactly** that number:

| Level 6 (21 dmg/round) | Average |
|---|---|
| 2d8+12 (guide sample) | 9 + 12 = 21 |
| 4d6+7 | 14 + 7 = 21 |
| 2d20 | 21 |
| (2×) 1d12+4 | 2 × 10.5 = 21 |
| 6d4+6 | 15 + 6 = 21 |

The only exception is level ¼ (3 damage). No real dice average exactly 3, so it uses the closest option (±0.5), just like the guide's own `1d4+1`.

Named bestiary monsters keep the attacks printed in the guide. Their dice are not randomized.

### How encounters are built

- **Budget** (p.26): add up the hero levels. Easy is under 50% of that, Medium about 75%, Hard 100%, Deadly 100–125%, and Very Deadly 150% or more.
- **Monster count** (p.26): 1–4 monsters per hero, not counting minions.
- **Stats** (p.30): HP by armor type, damage per round, and Save DC all come from the Monster Builder table.
- **Armor** (p.26): the default mix is about 60% unarmored, 30% Medium and 10% Heavy.
- **Flavor abilities** (p.31): each ability drops the monster's HP one row, as the guide says to.
- **Minions** (p.25, p.27): the die size comes from party level. They have no HP and can't crit.
- **Bestiary** (p.33–41): with a creature family picked, monsters come only from that family's stat blocks (HP, armor, movement, attacks and abilities as printed). The tool finds a mix of their levels that lands inside the difficulty band with 1–4 monsters per hero. A family that can't do that for your party (e.g. Kobolds, which top out at level 1, for level-10 heroes) is greyed out. Family minions (Kobold Minion, etc.) are used when the family has one.
  - **Save DC is derived.** The bestiary doesn't print a Save DC, so the tool uses the p.30 Monster Builder DC for the monster's level and marks it **(by level)**. The Mummy Lord (level 21) uses the level-20 row.
  - The Oozes' red **X** is filled in with each ooze's number (Gray Ooze 2, Ochre Jelly 3, Black Pudding 5, Elder Ooze 6).
- **Legendary** (p.44): stats come from party level. Easy uses the row 2 levels lower and Very Deadly the row 2 levels higher.

### Rewards

The guide gives **gold per hero per level** (p.22). It doesn't give gold per encounter, so the tool works it out from other numbers in the guide:

```
encounter gold per hero = gold per level (p.22)
                        × encounter weight (monster levels ÷ party levels)
                        ÷ (sessions per level (p.75) × hard-fights per session (p.26))
```

- Sessions per level: 1 for levels 1–3 (one per starter adventure), 2.5 for levels 4–5, 3 for levels 6–12, and 4 for level 13+.
- A typical session is 1.5 easy, 1.5 medium and 1 hard fight. That adds up to about 2.8 hard fights' worth.
- **Who's paying?** moves the gold table 1–2 levels down or up, as p.22 describes for poor or wealthy patrons.

## Hosting (GitHub Pages)

The repo root is the website:

| Path | Page |
|---|---|
| `index.html` | Landing page with a card for each tool |
| `combat-generator/` | The combat generator |
| `docs/rules-reference.md` | Rules tables from the guide |
| `assets/css/nimble.css` | Shared book-style look |

To turn it on: in the repo's GitHub settings, go to **Pages**, choose **Deploy from a branch**, then pick **main** and **/ (root)**.
`_config.yml` keeps the PDF (`source/`), tests, `CLAUDE.md` and `TRACKER.md` off the published site.

To preview locally, run `python3 -m http.server` in the repo root and open http://localhost:8000/.

## Development

```
node --test combat-generator/tests/*.test.js
```

The tests check that every generated damage expression averages exactly the guide's value, that encounters (generic and bestiary) land inside the difficulty bands, and that bestiary fights only use their own family.
