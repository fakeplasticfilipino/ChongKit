# Rules Reference

Transcribed from the **Nimble 5e v2 GM Guide v2.0.1**. Printed page numbers are cited. These are the
tables the combat generator uses. The data lives in `combat-generator/nimble-data.js`. This file was generated from it, so update both together.

## Combat Encounter Guidelines (p.26)

Add up the hero levels. Then compare the total monster levels to that number:

| Difficulty | Monster levels vs hero levels | Guide advice |
|---|---|---|
| Easy | less than half | Heroes lose minimal HP and resources. Use 1–2 per session. |
| Medium | around 75% | Some HP loss; heroes get hurt but shouldn’t drop to 0. Use 1–2 per session. |
| Hard | equal (100%) | Challenging but fair; some may drop to 0 HP, none should die. Use 1 per session. |
| Deadly | 100–125% | Requires strategy and teamwork. Tough battles or bosses. Use sparingly! |
| Very Deadly | 150%+ | Heroes will almost certainly need to retreat—or die. Only when they ignored telegraphed danger. |

- Typical encounters have **1–4 monsters per hero** (minions don't count). If either side outnumbers the other by a lot, the fight can be easier or harder than planned.
- A typical session has 2–5 combat encounters.
- Armor variety (sidebar): about **60% unarmored, 30% Medium, 10% Heavy**.

## Monster Armor & Defaults (p.25)

- **Medium Armor (M):** takes damage from the dice only. Damage modifiers are ignored.
- **Heavy Armor (H):** takes half the dice total, rounded up. Damage modifiers are ignored.
- Heroes' crits, save spells, and damage-type vulnerabilities ignore monster armor.
- Defaults: Medium-sized, speed 6, Reach 1, roll 1d20 for saves.
- **Flunkies** can't crit.
- **Minions** have no HP (any damage kills them). They use a single damage die, can't crit, and miss on a 1. When several minions attack the same hero, their damage counts as one attack.

## Monster Builder (p.30)

| Level | HP (none) | HP (M) | HP (H) | Dmg/round | Guide sample dice | Save DC | CR |
|---|---|---|---|---|---|---|---|
| 1/4 | 12 | 9 | 7 | 3 | 1d4+1 | 9 | 1/8 |
| 1/3 | 15 | 11 | 8 | 5 | 1d6+2 | 9 | 1/4 |
| 1/2 | 18 | 15 | 11 | 7 | 1d6+3 | 10 | 1/4 |
| 1 | 26 | 20 | 16 | 11 | 2d8+2 or (2×) 1d8+1 | 10 | 1/2 |
| 2 | 34 | 27 | 20 | 13 | 2d8+4 or (2×) 1d8+3 | 11 | 1 |
| 3 | 41 | 33 | 25 | 15 | 2d8+6 or (2×) 1d8+4 | 11 | 1 |
| 4 | 49 | 39 | 29 | 18 | 2d8+9 or (2×) 1d8+5 | 12 | 2 |
| 5 | 58 | 46 | 35 | 19 | 2d8+10 or (2×) 1d8+6 | 12 | 2 |
| 6 | 68 | 54 | 41 | 21 | 2d8+12 or (2×) 1d8+7 | 13 | 3 |
| 7 | 79 | 63 | 47 | 24 | 3d8+10 or (2×) 2d8+4 | 13 | 3 |
| 8 | 91 | 73 | 55 | 26 | 3d8+12 or (2×) 2d8+5 | 14 | 4 |
| 9 | 104 | 83 | 62 | 28 | 4d8+10 or (2×) 2d8+6 | 14 | 4 |
| 10 | 118 | 94 | 71 | 30 | 4d8+12 or (2×) 2d8+7 | 15 | 5 |
| 11 | 133 | 106 | 80 | 33 | 5d8+11 or (2×) 3d8+3 | 15 | 6 |
| 12 | 149 | 119 | 89 | 35 | 5d8+13 or (2×) 3d8+4 | 16 | 7 |
| 13 | 166 | 132 | 100 | 38 | 6d8+11 or (2×) 3d8+6 | 16 | 8 |
| 14 | 184 | 147 | 110 | 40 | 6d8+13 or (2×) 3d8+7 | 17 | 9 |
| 15 | 203 | 162 | 122 | 43 | 7d8+11 or (2×) 3d8+8 | 17 | 9 |
| 16 | 223 | 178 | 134 | 45 | 7d8+13 or (2×) 4d8+5 | 18 | 10 |
| 17 | 244 | 195 | 146 | 48 | 8d8+12 or (2×) 4d8+6 | 18 | 11 |
| 18 | 266 | 213 | 160 | 50 | 8d8+14 or (2×) 4d8+7 | 19 | 12 |
| 19 | 289 | 231 | 173 | 52 | 9d8+12 or (2×) 4d8+8 | 19 | 13 |
| 20 | 313 | 250 | 189 | 54 | 9d8+13 or (2×) 4d8+9 | 20 | 14 |

- For **each special ability** you add, lower HP or damage one step, or treat the monster as one step stronger.
- *"Any die size is fine as long as overall damage per round stays consistent."* That quote is the basis for the average-preserving dice randomizer.
- Die themes: d4 Undead (slow, with BIG bonus damage); d6 Goblins (small, chaotic, likely to miss or crit); d8 Humans (balanced and reliable attackers); d10 Beasts (stronger than humans); d12 Giants (superhumanly strong/accurate); d20 The mightiest creatures (massive damage).
- Glass cannons use damage from 1–5 rows higher and HP from the same number of rows lower. Tanks do the reverse.

## Minions (p.27)

| Party level | Minion die |
|---|---|
| 1–3 | d4 |
| 3–5 | d6 |
| 5–10 | d8 |
| 10–13 | d10 |
| 13–17 | d12 |
| 17–20 | d20 |

The guide's level ranges overlap at 3, 5, 10, 13 and 17. At those levels the generator picks either die size.

- 1 per hero: Slightly more difficult, but greatly increases tactical options.
- 2 per hero: Noticeably more difficult.
- 3 per hero: Noticeably more difficult.
- 4 per hero: Much more challenging.

## Legendary Monster Builder (p.44)

These stats are based on **party level** and don't change with party size. For an easier fight use stats 1–2 levels lower. For a harder one, 1–2 levels higher. The monster acts after **each hero's turn**. It gets a new ability when Bloodied (half HP). At 0 HP it enters its **Last Stand** and dies after the listed amount of extra damage.

| Party level | HP (M) | HP (H) | Last Stand | Save DC | Small attack | Big attack |
|---|---|---|---|---|---|---|
| 1 | 50 | 35 | 10 | 10 | 8 | 16 |
| 2 | 75 | 55 | 20 | 11 | 9 | 18 |
| 3 | 100 | 75 | 30 | 11 | 10 | 20 |
| 4 | 125 | 95 | 40 | 12 | 11 | 22 |
| 5 | 150 | 115 | 50 | 12 | 12 | 24 |
| 6 | 175 | 135 | 60 | 13 | 13 | 26 |
| 7 | 200 | 155 | 70 | 13 | 14 | 28 |
| 8 | 225 | 175 | 80 | 14 | 15 | 30 |
| 9 | 250 | 195 | 90 | 14 | 16 | 32 |
| 10 | 275 | 215 | 100 | 15 | 17 | 34 |
| 11 | 300 | 235 | 110 | 15 | 18 | 36 |
| 12 | 325 | 255 | 120 | 16 | 19 | 38 |
| 13 | 350 | 275 | 130 | 16 | 20 | 40 |
| 14 | 375 | 295 | 140 | 17 | 21 | 42 |
| 15 | 400 | 315 | 150 | 17 | 22 | 44 |
| 16 | 425 | 335 | 160 | 18 | 23 | 46 |
| 17 | 450 | 355 | 170 | 18 | 24 | 48 |
| 18 | 475 | 375 | 180 | 19 | 25 | 50 |
| 19 | 500 | 395 | 190 | 19 | 26 | 52 |
| 20 | 525 | 415 | 200 | 20 | 27 | 54 |

## Gold (p.22)

This is the average gold **each hero** gains per level. A poor patron pays like 1–2 levels lower. A wealthy one pays like 1–2 levels higher.

| Level | Gold | Level | Gold |
|---|---|---|---|
| 1 | 25 | 11 | 5,000 |
| 2 | 40 | 12 | 7,000 |
| 3 | 80 | 13 | 10,000 |
| 4 | 150 | 14 | 17,000 |
| 5 | 280 | 15 | 25,000 |
| 6 | 450 | 16 | 40,000 |
| 7 | 750 | 17 | 60,000 |
| 8 | 1,200 | 18 | 90,000 |
| 9 | 2,000 | 19 | 130,000 |
| 10 | 3,000 | 20 | 200,000 |

Lodging boons: Minor about 10 gp, Major about 100 gp, EPIC about 1,000 gp.

## Leveling pace (p.75)

- Levels 1–3: the included starter adventures level the party after each one.
- Levels 4–5: every 2–3 sessions.
- Levels 6–12: every 2–4 sessions.
- Level 13 and up: every 3–5 sessions or more.

## Derived by the generator (not printed in the guide)

- **Gold per encounter.** This is the p.22 gold-per-level, split across the fights in a level. The number of fights comes from sessions per level (p.75) and a typical session mix of 1–2 easy, 1–2 medium and 1 hard fight (p.26). Each fight is weighted by its monster levels ÷ party levels.
- **Band edges** the generator aims for: Easy 30–50%, Medium 65–85%, Hard 95–105%, Deadly 110–125%, Very Deadly 150–170%.
