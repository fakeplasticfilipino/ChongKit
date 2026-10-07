# ChongKit

Tools for our Nimble 5e table. All rules and numbers come from the **Nimble 5e v2 GM Guide v2.0.1** (the PDF in this repo).

## Tools

| Tool | Status | What it does |
|------|--------|--------------|
| [Chong's Tracker](chongs-tracker/) | ✅ v1 | Owlbear Rodeo extension: tracks token health, any system. |
| [Chong Die](chong-die/) | ✅ v2 | Owlbear Rodeo 3D dice with an Avrae-style command line and saved rolls in a panel beside the tray. Fork of Owlbear Rodeo Dice (GPL-3.0). |
| [Character Sheet](character-sheet/) | ✅ v3 | A Nimble character sheet in the browser: six stats, saves, skills, tabs of collapsible entries, notes; add more of any box, remove any; saves locally. |
| [Combat Generator](combat-generator/) | ✅ v2 | Builds an encounter for your party, with generic or named bestiary monsters: HP, armor, damage, Save DC, and the expected gold reward. |

See [TRACKER.md](TRACKER.md) for what's done and what's next.

## Character Sheet

**To use:** open the site and click **Character Sheet**, or open `character-sheet/index.html` in any
browser. Everything saves in this browser as you type (localStorage), so it's there next time;
**Export** saves a character as a `.json` file and **Import** loads one back (handy for moving to
another device). The list at the top switches between characters and **New** starts one; **More** has
Copy, Export, Import, Print and Delete. Every number box steps with the ↑ / ↓ keys (Shift: by 5).
Characters saved by v1 move over by themselves (WIL becomes WIS, level joins the class, Finesse and
Might points become extra skill boxes); v2 sheets drop the unused starter Mana / Gold / Inventory boxes
and move note entries into a Notes tab.

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

- **Details:** name on the banner; Class & Level, Ancestry, Height, Weight; Hit Dice (left / die).
- **Stats:** STR, DEX, CON, INT, WIS, CHA. Type each stat in its box (`3`, `+3` or `-1`; modifiers
  show their sign); the oval under it is a slot for a second number. Click a stat's name to mark it
  as a key stat (it turns dark).
- **Saves:** STR, DEX and WIL each have a number box. The circle on the left cycles ▲ advantage /
  ▼ disadvantage / none.
- **Skills** show their stat plus any skill points, so they follow the stat. Type a skill's total
  (`+4`, `-1`…) and the difference is kept as points. Initiative works the same way from DEX.
- **Combat:** Armor (shield), HP / Max HP / Temp, Initiative / Speed, Wounds.
- **HP, Temp HP, saves, the ovals and Current/Max boxes do math:** `-4` takes 4 off, `+3` adds 3,
  `13-4` or `10` sets it (Enter or click away). HP turns dark red when Bloodied (at or below half max).
- **Wounds:** click a circle to fill it (black) up to there; click the last filled one to clear it. The
  skull is the last wound. Edit layout can add a row of five smaller dashed circles under the track for
  extra wounds (each clicks on and off).
- **Tabs** (Actions, Abilities, Inventory to start) work like browser tabs: click to switch, **+** adds
  one, double-click a name to rename it, × closes it (with Undo), drag a tab to move it. Each tab is a
  list of bars showing a name and a short summary on the right. Click a bar to open it and edit its
  name, summary and details. Drag the grip to reorder, × to delete (with Undo), Expand all / Collapse
  all at the top.
- **Edit layout** (toolbar) is for changing the sheet: every box gets a red × to take it off, and each
  section ends with buttons that add another box of its own kind: **+ Stat** (big box, oval, name),
  **+ Save**, **+ Skill** (type its stat under it: a stat's name like DEX, or an added stat's, makes it
  follow that stat; anything else, or nothing, leaves it a plain number for systems without stats), **+ Line** in the details,
  and in Combat **+ Number** (like Armor) or **+ Current / Max** (like HP). Added boxes sit in the
  section with the rest; type their name, drag the grip to reorder. Removed boxes come back from the
  same bar, and Combat's bar sets Max Wounds. **Done** (or Esc) goes back to playing. Removing or
  deleting anything shows **Undo** (Ctrl+Z works too).
- **Notes:** tabs of free text on ruled lines, working like the tabs above (+, double-click to rename,
  ×, drag). Older sheets' notes are in the first tab, **Notes**.

**Derived, not from the GM Guide:** the sheet's layout (our table's sheet), its stats, saves,
skill-to-stat pairs, skill = stat + points, Initiative = DEX + bonus and the six-wound track are not
from the GM Guide (which has no character rules). Ancestry and Class are free text: there's no
"Apply" that fills in stats, because that data isn't in the GM Guide.

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
  everyone). Each entry has its own note in its ⋯ menu. Pasting a fight again doesn't repeat the note.
- **Rolls in notes:** dice in a note (`1d8!+3d8+2`, `2d6+3`, `1d20`) are underlined. Click one to
  roll it in **Chong Die** (it must be installed in the room): Chong Die's open tab decides whether it
  rolls at once (⚡ on) or puts the dice on the tray. A `(2×)` before it on the line rolls it twice.
  Click anywhere else in the note to edit it.
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

3D dice for [Owlbear Rodeo](https://www.owlbear.rodeo/) with an Avrae-style command line and
saved rolls. It is a modified version of [Owlbear Rodeo Dice](https://github.com/owlbear-rodeo/dice)
and, like it, licensed under the **GPL-3.0** (source in `chong-die-src/`, changes listed in
`chong-die-src/NOTICE.md`).

**To install:** in Owlbear, open your profile → **Extensions** → **Add Extension**, paste
`https://fakeplasticfilipino.github.io/ChongKit/chong-die/manifest.json`, then turn it on in your room.

**Using it**
- **Command line** (always on top of the tray): type a roll and press Enter. `!r` is optional.
  ↑ / ↓ step through what you typed before. A typo shows under the line and isn't rolled. It fades
  while dice roll. Beside it: **⚡ Quick roll** (the open tab's Instant switch, below) and **▤ Rolls**.
- **▤ Rolls** opens the panel docked to the right of the tray (the window widens; closed, it's just
  the tray). It remembers.
- **Rolls tab** (always first; it can't be closed or moved): a pill per die (d4 … d100). Each click
  puts one more on the tray (the pill shows ×2, ×3); throw them with the tray's Roll button. On the
  left: the dice style, and the primary die (Nimble on). Your own pills sit under a faint line.
- **Tabs of pills** (saved rolls): the small **+** after the tabs adds a tab; double-click renames,
  **×** deletes, drag to reorder. The **+** after the last pill adds a roll.
- **⋯** : Hide rolls, Bonus and advantage (for dice picked by hand), Roll history, other players'
  trays, Nimble rules, export, import, about.
- **+** (after the last pill) adds a roll to the open tab: a name, the roll (filled in from the command
  line) and an optional description. Pills show the name and the dice; hover (or long-press) shows
  the description. Drag a pill to reorder it or onto another tab; right-click (long-press on touch)
  to edit or delete it.
- **⚡ Quick roll** is the open tab's Instant switch. On: clicking a pill rolls it. Off: the pill puts its dice on the
  tray and you throw them with the Roll button (changing dice by hand cancels the pill's roll).
- Rolls clicked in **Chong's Tracker** notes come here and follow the ⚡ of the tab open in the
  panel (remembered even with the panel closed).
- **Nimble rules** (⋯ menu → Nimble rules): the first die of every roll is the **primary die** (one
  per roll with `!rr`). It explodes on its max and a 1 on it is a **Miss**. Off: plain Avrae
  rolling. Dice picked by hand on the tray follow it too (except with advantage / disadvantage).
  Write your own `e` on the first dice for a crit range: `1d6e>3+2d6` crits on 4–6.
- **Primary die style:** with Nimble on, a button under the dice style picker picks the primary
  die's style (it and the dice that explode out of it).
- The ⋯ menu exports and imports your saved rolls as a file. They live in your browser only.

**Roll syntax** (Avrae's `d20` syntax)

| Write | Means |
|---|---|
| `1d20+5`, `d%` | Dice and math: `+ - * / // %`, parentheses |
| `4d6kh3`, `2d20kl1`, `8d6k>2`, `4d6p<3`, `3d6pl1` | Keep / drop highest, lowest, above, below |
| `1d6rr1`, `2d6ro<3`, `1d6ra6` | Reroll until not / once / once and add |
| `2d6e6`, `1d4!`, `3d10e>8` | Exploding dice (a new die pops out of the one that exploded) |
| `4d6mi2`, `2d8ma6` | Minimum / maximum per die |
| `1d6[fire]` | Label |
| `1d20+5 adv Perception` | `adv` / `dis` turn the first d20 into 2d20kh1 / kl1; the rest is a comment |
| `!rr 4 1d20+5` | Roll it 4 times |
| `!rrr 4 1d20+5 15` | Roll it 4 times against DC 15 |

Operations apply in the order written. Rerolls and explosions are thrown as extra dice (at most 20
per roll). d2 and d3 are read from a d4 and a d6; other odd sizes (d5, d30, …) are rolled without
a 3D die. Limits: 100 dice per throw, sides up to 1000, repeats up to 25.

**Building:** `cd chong-die-src`, then `npx yarn@1.22.22` (install) and `npx yarn@1.22.22 build`,
which writes the site files into `chong-die/`. Commit both folders. Tests: `npx yarn@1.22.22 test`.

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
