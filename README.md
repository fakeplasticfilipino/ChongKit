# ChongKit

Tools for our Nimble 5e table. All rules and numbers come from the **Nimble 5e v2 GM Guide v2.0.1** (the PDF in this repo).

## Tools

| Tool | Status | What it does |
|------|--------|--------------|
| [Chong's Tracker](chongs-tracker/) | ✅ v1 | Owlbear Rodeo extension: tracks token health, any system. |
| [Combat Generator](combat-generator/) | ✅ v2 | Builds an encounter for your party, with generic or named bestiary monsters: HP, armor, damage, Save DC, and the expected gold reward. |

See [TRACKER.md](TRACKER.md) for what's done and what's next.

## Combat Generator

**To use:** open the site on GitHub Pages and click **Combat Generator**, or open `combat-generator/index.html` in any browser. No install needed. It loads the book-style fonts from Google Fonts when online and falls back to system fonts offline.

1. Use **−/+** to set the number of heroes and their level.
2. Pick **Monsters** or **Boss**, then a difficulty. The fight updates right away.
3. Pick **Creatures**: **Generic** (Monster Builder stats) or a bestiary family such as Kobolds, Goblins, Bandits or Undead.
4. Armor, dice, build, minions, who's paying, special abilities and the encounter twist are under **More options**.

Your choices are remembered in this browser, so the page opens the way you left it. Only the settings are saved, never the generated fight.

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
- **New Dice:** the same generic monsters (or boss) with new dice (same averages). Bestiary monsters keep their printed attacks.
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
- **Build** (p.30): *Glass cannon* uses damage from 1–5 rows higher and HP from the same number of rows lower, like the guide's level 5 mage (34 HP, 26 damage). *Tank* is the mirror: HP from 1–5 rows higher, damage from 1–5 rows lower. The guide only says to "lower the damage and increase the HP/Armor", so the tank's matching shift is the tool's reading. *Mixed* picks normal, glass cannon or tank for each monster. The monster's level, and so the budget and Save DC, stay the same. Generic monsters only.
- **Unique encounter twist** (p.28–29): adds one of the guide's 37 twists (Ambush, Defend the Fort, Waves Upon Waves…) to the top of the fight. The guide calls these "dessert, not main course", so it's off by default.
- **Flavor abilities** (p.31): each ability drops the monster's HP one row, as the guide says to.
- **Minions** (p.25, p.27): the die size comes from party level. They have no HP and can't crit.
- **Bestiary** (p.33–41): with a creature family picked, monsters come only from that family's stat blocks (HP, armor, movement, attacks and abilities as printed). The tool finds a mix of their levels that lands inside the difficulty band with 1–4 monsters per hero. If the family can't reach the budget alone (e.g. Kobolds, which top out at level 1, for level-10 heroes), generic Monster Builder monsters fill the gap. They're listed with their level, e.g. `Monster A x1 (level 12)`, so you can reskin them as a kobold war-beast or similar. A family is greyed out only when none of its monsters can fit at all. Family minions (Kobold Minion, etc.) are used when the family has one.
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

## Chong's Tracker (Owlbear Rodeo)

A system-agnostic health tracker for [Owlbear Rodeo](https://www.owlbear.rodeo/).

**To install:** in Owlbear, open your profile → **Extensions** → **Add Extension**, paste
`https://fakeplasticfilipino.github.io/ChongKit/chongs-tracker/manifest.json`, then turn it on in your room.

**Using it**
- **Tabs** organize entries. Click **+** to add one, double-click to rename, **×** to delete. The
  **Players** tab is always there and can't be deleted. Players can make their own tabs too (and
  rename or delete those).
- **Add entries** in the box at the top: `Goblin x4 15` makes Goblin 1–4 with 15 HP. Add `ac:M`,
  `max:70` or `extra:5` if you like. Or paste a fight from the Combat Generator: every
  `Name xN / HP / Armor` block becomes entries (Armor None/Medium/Heavy becomes AC blank/M/H).
- **Minions** share one entry whose HP is how many are left: `Kobold Minion x10` (any name with
  "minion" in it) makes one entry with 10 HP. Pasted generator minions work the same way.
- **Mass delete (GM only):** `/clear` deletes every entry in the current tab; `/clear Goblin`
  deletes only names starting with "Goblin". It asks first.
- **Change HP** by typing math in the HP box and pressing Enter: `20-3` → 17, `-3` takes 3 off,
  `+5` heals 5, `12` sets it to 12. No dice: roll them at the table.
  - Damage uses up **Extra HP** first.
  - With **Max HP** set, healing can't go above it. HP can go below 0.
- **The ⓘ button** next to the add box lists these commands.
- **Attach to a token:** click the empty **+** circle on an entry, then click a token on the map, or select the token first and then click the **+**
  (Esc cancels). Box-select several tokens to attach them to that entry and the next ones in order
  (click Goblin 1's circle, then box-select 4 goblins). Or right-click tokens → **Track in Chong's
  Tracker**. The circle then shows the token's picture; click it to select the token on the map.
- **Select a token on the map** and its entry jumps to the top of the list (outlined, switching tabs
  if needed) until you deselect it, so you can change its HP without scrolling.
- **On the token:** HP in a red circle in the lower-left corner, Extra HP in a blue one beside it,
  and AC on a shield in the lower-right corner.
- **The ⋯ menu** on an entry has **Max HP** (fills the HP bar), **Extra HP**, **AC** (any text,
  e.g. `M`, `H`, `15`), stats shown/hidden, detach, move to another tab, and delete.
- **Hidden stats:** players see every entry, but when its stats are hidden they only see **H**
  (healthy) or **B** (Bloodied: at or below half Max HP, or at 0) and the AC, in the panel and on the
  token. New entries start with hidden stats (except in players' tabs). Toggle one entry from its ⋯
  menu; the eye next to the add box does the whole tab. For you, hidden entries are dimmed with a
  crossed-out eye.
- **Players** can add and edit entries in the Players tab and in tabs they made; everything else is
  read-only for them.

**Where it's saved:** in the current scene only (not the room), so each scene has its own tracker.
Hidden entries are hidden in the panel and on the map, but technically every player's browser
receives the scene data.

**Updating the Owlbear SDK** (`chongs-tracker/vendor/obr-sdk.js`): in a scratch folder run
`npm i @owlbear-rodeo/sdk esbuild`, write `entry.js` containing
`export { default } from "@owlbear-rodeo/sdk"; export * from "@owlbear-rodeo/sdk";`, then
`npx esbuild entry.js --bundle --format=esm --minify --outfile=obr-sdk.js` and copy the result over.

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
node --test combat-generator/tests/*.test.js chongs-tracker/tests/*.test.js
```

The tests check that every generated damage expression averages exactly the guide's value, that encounters (generic and bestiary) land inside the difficulty bands, and that bestiary fights only use their own family.
