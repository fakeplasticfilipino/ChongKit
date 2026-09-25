# ChongKit

Tools for our Nimble 5e table. All rules and numbers come from the **Nimble 5e v2 GM Guide v2.0.1** (the PDF in this repo).

## Tools

| Tool | Status | What it does |
|------|--------|--------------|
| [Combat Generator](combat-generator/index.html) | ✅ v1 | Builds an encounter for your party: monster HP, damage dice, Save DC, and the expected gold reward. |

See [TRACKER.md](TRACKER.md) for what's done and what's next.

## Combat Generator

**To use:** open `combat-generator/index.html` in any browser. No install needed. It loads the book-style fonts from Google Fonts when online and falls back to system fonts offline.

1. Set the number of heroes, their level, and the difficulty.
2. Pick **Group of monsters** or **Legendary solo boss**.
3. Optional: armor, the flavor of the damage die, minion waves, who's paying, and flavor abilities.
4. Click **Generate encounter**.

Each monster card shows:
- **HP**, with a box for each creature so you can track damage
- **Damage**: a randomized dice expression with its average per round, plus a **Roll** button
- **Save DC**, armor, and the CR it roughly matches

At the bottom you'll see the **expected reward** in gold, per hero and for the whole party.

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

The only exception is level ¼ (3 damage). No real dice average exactly 3, so it uses the closest option (±0.5), just like the guide's own `1d4+1`. The card marks these with **≈**.

**Re-randomize dice only** keeps the same monsters and rolls new dice expressions.

The **Roll** button follows the Nimble attack rules. If the first die rolls a 1, the attack misses. If it rolls its maximum, the attack crits and explodes (you roll again and add). Minions can't crit.

### How encounters are built

- **Budget** (p.26): add up the hero levels. Easy is under 50% of that, Medium about 75%, Hard 100%, Deadly 100–125%, and Very Deadly 150% or more.
- **Monster count** (p.26): 1–4 monsters per hero, not counting minions.
- **Stats** (p.30): HP by armor type, damage per round, and Save DC all come from the Monster Builder table.
- **Armor** (p.26): the default mix is about 60% unarmored, 30% Medium and 10% Heavy.
- **Flavor abilities** (p.31): each ability drops the monster's HP one row, as the guide says to.
- **Minions** (p.25, p.27): the die size comes from party level. They have no HP and can't crit.
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

## Development

```
node --test combat-generator/tests/*.test.js
```

The tests check that every generated damage expression averages exactly the guide's value, and that encounters land inside the difficulty bands.
