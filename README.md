# ChongKit

Tools for our Nimble 5e table. All rules and numbers come from the **Nimble 5e v2 GM Guide v2.0.1** (the PDF in this repo).

## Tools

| Tool | Status | What it does |
|------|--------|--------------|
| [Chong's Tracker](chongs-tracker/) | ✅ v1 | Owlbear Rodeo extension: tracks token health, any system. |
| [Chong Die](chong-die/) | ✅ v4 | Owlbear Rodeo 3D dice with a plain-words command line, saved rolls in a panel beside the tray. Fork of Owlbear Rodeo Dice (GPL-3.0). |
| [Character Sheet](character-sheet/) | ✅ v4 | A character sheet in the browser: HP, small boxes, wounds, stats with save pips, skills, and tabs of note boxes; add, remove, rename and reorder any box; saves locally. |
| [Combat Generator](combat-generator/) | ✅ v2 | Builds an encounter for your party, with generic or named bestiary monsters: HP, armor, damage, Save DC, and the expected gold reward. |

See [TRACKER.md](TRACKER.md) for what's done and what's next.

## Character Sheet

**To use:** open the site and click **Character Sheet**, or open `character-sheet/index.html` in any
browser. Everything saves in this browser as you type (localStorage), so it's there next time;
**Export** saves a character as a `.json` file and **Import** loads one back (handy for moving to
another device). The list at the top switches between characters and **New** starts one; **More** has
Copy, Export, Import, Print, Reset and Delete. Number boxes step with the ↑ / ↓ keys (Shift: by 5).
Characters saved before v4 open as a blank sheet.

**Accounts (optional):** **Sign in** (toolbar) with Discord, or with an email and password
(**Create account** sends a confirmation email first). Signed in, every character is also saved to
your account, so it's there on any device; the toolbar shows **Synced**. Signing in on a browser
that already has characters merges them with the account's (for a character on both, the newer
edit wins). Coming back to the tab picks up edits made elsewhere. Signed out, the sheet works as
before, only in this browser. Deleting a character while signed in deletes it from the account too.

- **Forgot password?** (in the Sign in box) emails a link; opening it asks for a new password.
- **Sign out** keeps your characters in this browser unless you tick **Remove my characters from this
  browser** (do that on a shared computer). Characters from one account are never uploaded to
  another, even if someone else signs in on the same browser.
- **Delete account and all its characters…** (in the account box) removes the account for good.
- **Offline:** keep playing. The toolbar says **Not synced**; edits and deletes are sent when you're
  back online. Two tabs of the sheet open at once share their edits.
- **Limits:** 256 KB per character (far more than any sheet needs) and 50 characters per account.
  Imports over 1 MB are refused. If two devices edit the same character, the edit made last (by each
  device's clock) wins.

It's a sheet you write on: every box holds what you type, and nothing is worked out for you (no math,
no skills following stats).

- **Top:** the name, with Hit Die and Level beside it. On the left: Current HP / Max HP (the heart),
  Temp HP, Armor (in the shield) and Initiative, and the wounds. On the right: the stats (STR, DEX, CON,
  INT, WIS, CHA), each with a save pip that cycles ▲ advantage / ▼ disadvantage / none, and the skills
  (Arcana, Examination, Influence, Insight, Perception, Stealth). Below 1150 px wide the top section
  stacks into one column.
- **Wounds:** click a circle to fill it (black) up to there; click the last filled one to clear it. The
  skull is the last wound; the three dashed circles after it are extra wounds (each clicks on and off).
- **Notes** (below, full width): tabs like a browser's (click to switch, **+** adds one, double-click to
  rename, × closes it with Undo, drag to move). Each tab holds note boxes that arrange themselves in
  columns; **+ Box** (at the end of a tab) adds another note box; give a box a title, **+ Note** adds a note, the chevron on its title folds or opens all its
  notes, × removes it (Undo). A note is free text: its first line is its name, and folded it shows just
  that line ("Fireball."). Drag a note by its grip to reorder it or move it to another box.
- **Edit layout** (toolbar): every box gets a × to remove it and a grip to drag it, labels can be
  renamed, and each list ends with a + button: up to 6 details, 2 Current / Max pairs, 6 small boxes,
  12 stats and 18 skills. Rows stay even (7 stats sit 4 + 3). **Done** (or Esc) goes back. Removing
  anything shows **Undo** (Ctrl+Z works too).
- **Reset character** (More) clears the character and brings back the default layout (Undo brings it
  back).
- **Print** (More, or Ctrl+P) prints the top section on page 1 and the open tab's notes after it, every
  note open.

**Derived, not from the GM Guide:** the sheet's layout, defaults, caps and the six-wound track are our
table's choices; the GM Guide has no character rules. Ancestry and Class data isn't in the GM Guide, so
there's nothing that fills a sheet in.

## Combat Generator

**To use:** open the site on GitHub Pages and click **Combat Generator**, or open `combat-generator/index.html` in any browser. No install needed. It loads the book-style fonts from Google Fonts when online and falls back to system fonts offline.

1. Use **−/+** to set the number of heroes and their level.
2. Pick **Monsters** or **Boss**, then a difficulty. The fight updates right away.
3. Pick **Creatures**: **Generic** (Monster Builder stats) or a bestiary family such as Kobolds, Goblins, Bandits or Undead.
4. Armor, dice, build, minions, who's paying, special abilities, the encounter twist, the **Summary** line (difficulty, heroes and level) and the **Loot** are under **More options**. The last four are off by default.

Your choices are remembered in this browser, so the page opens the way you left it. Only the settings are saved, never the generated fight.

The fight is written as plain text in one box, one block per monster:

```
Kobold Trapper x3
HP: 26
Armor: None
Damage: Throw Scorpion (2×). (Range 8) 1d4+2.
Save DC: 10 (by level)
```

followed by any abilities. With **Loot** ticked, the gold for each hero and the whole party (plus the family's loot table, if it has one) comes last; with **Summary** ticked, a line like `Medium Fight · 4 heroes, level 3` comes first. The box is editable, so rename monsters or add notes right there.

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
- **Tabs** organize entries. Click **+** to add one, double-click to rename, **×** to delete. Many
  tabs scroll sideways (mouse wheel works; a thin scrollbar shows from 5 tabs on). The
  **Players** tab is always there and can't be deleted. Players can make their own tabs too (and
  rename or delete those).
- **Add entries** in the box at the top (press Enter): `Goblin x4 15` makes Goblin 1–4 with 15 HP. Add `ac:M`,
  `max:70` or `extra:5` if you like. Or paste a fight from the Combat Generator: every
  `Name xN / HP / Armor` block becomes entries. Armor keeps its first letter (Medium/Heavy becomes
  AC M/H; `ac:Medium` works too); None gives no AC. The block's other lines (Damage, Save DC, Move,
  abilities) become each entry's **note**; everything not beside a monster (the fight's title,
  twist, family traits, loot) goes in the tab's **general note**.
- **Notes:** the box under the add box is the tab's general note (GM tabs: GM only; players' tabs:
  everyone). Each entry has its own note in its ⋯ menu. Pasting a fight again doesn't repeat the note. Click a note to edit it.
- **Minions** share one entry whose HP is how many are left: `Kobold Minion x10` (any name with
  "minion" in it) makes one entry with 10 HP. Pasted generator minions work the same way.
- **Mass delete (GM only):** `/clear` deletes every entry in the current tab and empties its general
  note; `/clear Goblin` deletes only names starting with "Goblin" (the note stays). It asks first.
- **Change HP** by typing math in the HP box and pressing Enter: `20-3` → 17, `-3` takes 3 off,
  `+5` heals 5, `12` sets it to 12. No dice: roll them at the table.
  - Damage uses up **Extra HP** first.
  - With **Max HP** set, healing can't go above it. HP can go below 0.
- **Help:** the ⓘ button in the panel's lower-right corner opens a short plain-language guide
  (× or Esc closes it). The same guide is on the extension's own page (its link in Owlbear).
- **Attach to a token:** click the empty **+** circle on an entry, then click a token on the map, or select the token first and then click the **+**
  (Esc cancels). Box-select several tokens to attach them to that entry and the next ones in order
  (click Goblin 1's circle, then box-select 4 goblins). Or right-click tokens → **Track in Chong's
  Tracker**. The circle then shows the token's picture; click it to select the token on the map.
- **Detach a token:** while its token is selected, an **×** shows over the picture in the entry;
  click it to take the selected token(s) off the entry.
- **Minions on several tokens:** a minion entry takes every token you pick (box-select the 10
  kobolds, click its **+**), shown as ×10. Click any of them on the map to bring the entry to the top
  and take HP off. Minion tokens get no badges (their HP is shared, so it lives in the panel). To
  change a group's tokens, detach them and pick them again.
- **Reorder** by dragging a card (grab it anywhere but its buttons and boxes; a quick click on the
  name still edits it). **Move it to another tab** by dropping it on that tab (players: onto
  players' tabs only).
- **Select a token on the map** and its entry jumps to the top of the list (outlined, switching tabs
  if needed) until you deselect it, so you can change its HP without scrolling.
- **On the token:** small dark pills along the bottom edge: HP in the lower-left corner (red edge;
  with Extra HP it reads `8 + 2`; hidden stats show a green **H** or a dark-red **B**) and AC in the
  lower-right corner. They grow with the token, within limits; when they don't fit on one row, AC
  moves up a row.
- **The ⋯ menu** on an entry has **Max HP** (fills the HP bar), **Extra HP**, **AC** (any text,
  e.g. `M`, `H`, `15`), **Note**, stats shown/hidden (GM), and delete.
- **Hidden stats:** players see every entry, but when its stats are hidden they only see **H**
  (healthy) or **B** (Bloodied: at or below half Max HP, or at 0) and the AC, in the panel. On the map
  everyone, GM included, sees just H/B and AC for those entries; the GM still sees the real HP in
  the panel. New entries start with hidden stats (except in players' tabs). Toggle one entry from its ⋯
  menu; the eye next to the add box does the whole tab. For you, hidden entries are dimmed.
- **Players** can add and edit entries in the Players tab and in tabs they made; everything else is
  read-only for them.

**Where it's saved:** in the current scene, so each scene has its own tracker. A tab can instead be
**saved to the room** (the door button next to the add box; GMs for any tab, Players included,
players for tabs they made), so it shows in every scene of the room, e.g. the party's HP. A door
icon marks those tabs. It asks first, because room storage is small (16 kB in all, shared with other
extensions; a warning shows past 12 kB) and token links are per scene (attach the tokens again in
each scene). Clicking the door again keeps the tab in the current scene only.
Hidden entries are hidden in the panel and on the map, but technically every player's browser
receives the scene data.

**Updating the Owlbear SDK** (`chongs-tracker/vendor/obr-sdk.js`): in a scratch folder run
`npm i @owlbear-rodeo/sdk esbuild`, write `entry.js` containing
`export { default } from "@owlbear-rodeo/sdk"; export * from "@owlbear-rodeo/sdk";`, then
`npx esbuild entry.js --bundle --format=esm --minify --outfile=obr-sdk.js` and copy the result over.

## Chong Die (Owlbear Rodeo)

3D dice for [Owlbear Rodeo](https://www.owlbear.rodeo/) with a plain-words command line and
saved rolls. The engine rolls every number first and the tray acts the result out (the dice land on
the faces the roll decided). It is a modified version of
[Owlbear Rodeo Dice](https://github.com/owlbear-rodeo/dice) and, like it, licensed under the
**GPL-3.0** (source in `chong-die-src/`, changes listed in `chong-die-src/NOTICE.md`).

**To install:** in Owlbear, open your profile → **Extensions** → **Add Extension**, paste
`https://fakeplasticfilipino.github.io/ChongKit/chong-die/manifest.json`, then turn it on in your room.

**Using it**
- **Hold to roll:** every roll waits on the tray. Its dice appear (the command shows under them);
  hold **Roll** to shake them, let go to throw. **×** clears them.
- **⚡ Quick roll** (between the command line and ▤): on, typed rolls, pills, history and Reroll
  throw at once instead of waiting to be held. It remembers.
- **Command line** (always on top of the tray): type a roll and press Enter.
  ↑ / ↓ step through what you typed before. A typo shows under the line and isn't rolled.
- **▤ Rolls** (beside the command line) opens the panel docked to the right of the tray; closed,
  it's just the tray. It remembers.
- **Rolls tab** (always first): the dice style, then a pill per die (d4 … d100). Each click puts one
  more on the tray (the pill shows ×2, ×3); throw them with the tray's Roll button.
- **Your pills** (saved rolls) sit under a faint line. Click one to put it on the tray. **+** after the last pill
  adds one (name, roll, optional description shown on hover / long-press); drag to reorder or onto
  another tab; right-click (long-press) to edit or delete. Tabs: **+** adds, double-click renames,
  **×** deletes, drag to reorder.
- **⋯**: Hide rolls, Roll history, other players' trays, export / import (your saved
  rolls live in this browser only), about.
- **Outline:** whenever a roll uses `crit` or `miss`, the Primary Die (the first die still kept) gets a **purple outline**, dark red
  when the Primary Die is in the `miss` range, gold when that die crit. A
  die the roll dropped (advantage) fades once it lands. Chain dice pop out of the
  die that made them after it settles.
- **Marks, not verdicts:** the total is always the real sum; **MISS**, **CRIT** and **CAPPED** are
  shown beside it and the table decides what they mean.

**Roll syntax:** dice and numbers joined by `+` or `-` (spaces optional), then words anywhere after
the first dice. Every word is glued to an optional number; the words act on the first dice.

| Word | Means | Example |
|---|---|---|
| `NdS` | N dice of S sides (`d20` is `1d20`, `d%` is `1d100`) | `2d6+1d4-1` |
| `adv`, `adv3`, `dis`, `dis2` | Advantage / disadvantage (bare = 1); they cancel first. Net n adds n dice, then drops the n lowest (highest for `dis`); ties drop from the left | `1d20+5 adv` |
| `crit`, `crit10`, `crit5-10`, `crit>=5`, `crit>9` | The Primary Die in this range (bare: the die's max) crits and adds a chain die | `1d10+3 crit` |
| `miss`, `miss1`, `miss1-4`, `miss<=4`, `miss<2` | Mark MISS when the Primary Die is in this range (bare: 1) | `1d10+3 crit miss` |
| `critadv`, `critadv2` | Chain dice roll with advantage (needs `crit`) | `1d10 crit critadv` |
| `x2`, `x3` | Roll the whole command N times, separately (1 to 25) | `1d10+3 crit miss x2` |

Nimble's attack is `1d10+3 crit miss`. The Primary Die is the first die still kept after advantage.
A chain die is one more die of the same size added to the total (with `critadv`, an advantage pick);
**a chain die chains again only on its max**, never on the crit range. A range's `-` is part of it
(`crit5-10`); to subtract, leave a space (`crit5 -2`). `>=`, `>`, `<=`, `<` count to the die's
end (`crit>=5` on a d10 is 5–10); one that leaves no face (`crit>10` on a d10) is an error. Errors show under the command line (a word
twice, a range outside the die or backwards, `crit` and `miss` overlapping, `critadv` without
`crit`, unknown words). Limits: 100 dice per roll and 20 chain dice; a roll that hits either stops
adding dice and is marked CAPPED. d2 and d3 are read from a d4 and a d6; other odd sizes (d5, d30, …)
are rolled without a 3D die. Chong Die leaves out keep/drop, exploding dice, rerolls, multiplication
and division, and target checks on purpose.

**Building:** `cd chong-die-src`, then `npx yarn@1.22.22` (install) and `npx yarn@1.22.22 build`,
which writes the site files into `chong-die/`. Commit both folders. How it works: `chong-die-src/DESIGN.md`.

**Tests:** `npm test` in the repo root runs every tool's tests.

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
node --test combat-generator/tests/*.test.js chongs-tracker/tests/*.test.js character-sheet/tests/*.test.js
cd chong-die-src && npx yarn@1.22.22 test
```

The tests check that every generated damage expression averages exactly the guide's value, that encounters (generic and bestiary) land inside the difficulty bands, and that bestiary fights only use their own family.
