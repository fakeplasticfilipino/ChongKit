# Character Sheet v4: flat boxes on top, notes below (design)

Date: 2026-10-09 · Status: **draft, for review** · Prototype: `sheet-prototype.html` (scratchpad, throwaway)
Replaces the v3 layout and look of `character-sheet/`. Saved data goes from version 4 to **version 5**.

## What changes

1. **Look:** flat, simple, whitish boxes instead of the parchment sheet. White fields, thin grey outlines
   (`#4a4a4a`), flat grey label bands (`#6f6f6f`, white caps text), near-square corners (3 px), a light grey
   page. Red stays for Bloodied only. No paper edge, desk, margin lines or corner imprint.
2. **Layout:** split top and bottom. The **top section** (all the numbers) spans the width; the **notes**
   span the width below it and get most of the page (at least 70% of the screen height).
3. **Everything is a list of boxes** with caps, so any box can be added, removed, renamed and reordered in
   Edit layout. **Reset** clears the character and brings back the default layout.
4. **Notes become tabs → note boxes → notes.** A note is free text whose first line is its name; it folds
   to that one line.

Kept as they are: the notice and footer, the toolbar (character picker, New, Edit layout, More, Saved,
Sign in), calculator boxes (`-4`, `+3`, `13-4`), ↑/↓ steppers, undo (toast + Ctrl+Z, keeps typing done
since), saving to localStorage, accounts and sync, import/export, print, the CSP and every security rule.
Still no dice rolling.

## Top section

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Brannoc Ashvale ____________________________________  HIT DIE d10   LEVEL 3      │
│ ┌ vitals (≈ 400 px) ─────────────┐ ┌ stats and skills ─────────────────────────┐ │
│ │ ┌───────────────┬───────────♥┐ │ │ ┌──△▽──┬──△▽──┬──△▽──┬──△▽──┬──△▽──┬──△▽─┐│ │
│ │ │      11      /      26     │ │ │ │  +2  │  +1  │  +1  │  -1  │   0  │  +3 ││ │
│ │ │ CURRENT HP  /   MAX HP     │ │ │ │ STR  │ DEX  │ CON  │ INT  │ WIS  │ CHA ││ │
│ │ └───────────────┴────────────┘ │ │ └──────┴──────┴──────┴──────┴──────┴─────┘│ │
│ │ ┌───────┐ ┌───────┐ ┌───────┐  │ │ ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐  │ │
│ │ │       │ │  14   │ │  +2   │  │ │ │  +1  ││  +3  ││   0  ││  +2  ││  +1  │… │ │
│ │ │TEMP HP│ │ ARMOR │ │ INIT  │  │ │ │ARCANA││EXAM. ││INFL. ││INSIGHT││PERC.│  │ │
│ │ └───────┘ └───────┘ └───────┘  │ │ └──────┘└──────┘└──────┘└──────┘└──────┘  │ │
│ │ (● ● ○ ○ ○ ☠)  ◌ ◌ ◌ ◌ ◌        │ │                                           │ │
│ └────────────────────────────────┘ └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Part | Default | Cap | Layout |
|---|---|---|---|
| Details (next to the name) | Hit Die, Level | 6 | one line, wraps |
| Current / Max pairs | Current HP / Max HP (♥, Bloodied) | 2 | stacked, full width of the vitals |
| Small boxes | Temp HP, Armor (shield), Initiative | 6 | rows of up to 3 |
| Wounds | five circles + skull, optional row of 5 dashed extras | (as today) | under the small boxes |
| Stats | STR DEX CON INT WIS CHA | 12 | rows of up to 6 |
| Skills | Arcana, Examination, Influence, Insight, Perception, Stealth | 18 | rows of up to 6 |

- **Even rows:** a list of `n` boxes with at most `per` in a row uses the fewest rows, then spreads the boxes
  evenly: `rows = ceil(n / per)`, `columns = ceil(n / rows)` (7 stats → 4 + 3; 12 → 6 + 6; 18 skills → 6 + 6
  + 6). Never a lone box on its own row. The pure helper `Sheet.columns(n, per)` is tested.
- **Stats** share one frame (dividers between them). Each has its ▲▽ save pips on top: every stat is also
  its save (cycle none → advantage → disadvantage → none, as `cycleSave` today). The separate Saves
  section goes away.
- **Skills** keep today's rule: a skill follows a stat (total = stat + points; typing a total stores the
  difference). The stat is free text in Edit layout (`skillStat`), so it can follow an added stat or none.
- **Small boxes** are numbers with calculator math. A small box can also follow a stat the same way a skill
  does; the default Initiative follows DEX (today's DEX + bonus). Armor is the one box with the shield.
- **Pairs:** the default HP pair has the heart and turns Current red when Bloodied (at or below half Max).
  An added pair (Mana, Focus…) is plain: renamable labels, no heart, no Bloodied.
- **Wounds** stay exactly as today (track size, the optional extra row, filling black).
- **Phone:** vitals stack above stats and skills; stats and skills use rows of up to 3. No sideways scroll.

### Edit layout

- Every box (defaults included) gets a × to remove it and a grip to drag it within its list; its label
  becomes a text field.
- Each list ends with a dashed **+ Stat (6/12)** / **+ Skill (6/18)** / **+ Box (3/6)** / **+ Current / Max**
  / **+ Detail** button, shown only while there's room.
- Removing, adding and moving go through undo as today. There is no "restore removed box" list any more:
  undo brings a box back, Reset brings back all the defaults.

### Reset

More → **Reset character**: asks first ("Clear this character and start again?"), then replaces the current
character with a blank one (`Sheet.blank()`: default layout, every field empty) that keeps the character's
id and owner and gets a new `updated`, so it syncs like any edit. It can be undone (toast) until the next change.

## Notes

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [ACTIONS][SPELLS][INVENTORY][+]                                                  │
│ ┌ ▾ CANTRIPS    × ┐ ┌ ▾ TIER 1      × ┐ ┌ ▸ TIER 2      × ┐ ┌ ▾ RITUALS     × ┐  │
│ │ ▸ Mage Hand.  × │ │ ▾ Fireball    × │ │ + NOTE          │ │ ▸ Alarm.      × │  │
│ │ ▸ Light.      × │ │   1d10 ranged…  │ └─────────────────┘ │ + NOTE          │  │
│ │ + NOTE          │ │   120ft.        │ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ └─────────────────┘  │
│ └─────────────────┘ │ ▸ Shield.     × │ ╎      + BOX      ╎                      │
│                     │ + NOTE          │ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘                      │
│                     └─────────────────┘                                          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- **Tabs** work as today (`tabStrip`: +, double-click to rename, × with undo, drag).
- **Note boxes:** a titled box (grey band, the title is a text field). The band's ▾/▸ folds or unfolds every
  note in the box; × removes the box (undo). **+ Box** at the end of the tab adds one. Boxes arrange
  themselves into as many columns as fit (CSS columns, at least 300 px each), filling top to bottom, so
  tall and short boxes pack without gaps. No caps on boxes or notes (the 256 KB database limit still applies).
- **Notes:** one auto-growing text field. **Folded**, a note shows only its first line, with a full stop
  added unless it already ends in `.`, `!`, `?` or `:` ("Fireball" → "Fireball."); an empty first line shows
  "Untitled". ▸/▾ or clicking the folded line toggles it. × deletes it (undo). Drag to reorder within its
  box or into another box. Folded state is saved (it syncs). The pure helper `Sheet.noteTitle(text)` is tested.
- Notes are content, so they can be typed in, added, folded and deleted in play mode as well as in Edit layout.

## Data (version 5)

```js
{
  v: 5, id, name, updated, owner,
  details: [{ id, label, value }],                       // Hit Die, Level
  pairs:   [{ id, label, maxLabel, cur, max, hp }],       // hp: true on the default HP pair only
  boxes:   [{ id, label, value, stat, points, shield }],  // small boxes; stat '' = plain number
  wounds, woundsMax, woundExtra, woundMarks,              // unchanged
  stats:   [{ id, label, value, mode }],                  // mode '' | 'adv' | 'dis'
  skills:  [{ id, label, stat, points }],
  tabs:    [{ id, name, boxes: [{ id, title, notes: [{ id, text, folded }] }] }],
  tab,                                                    // the open tab
}
```

- `removed`, `extras`, `saves`, `hp`, `armor`, `initBonus`, `hitDice`, `cls`, `ancestry`, `height`,
  `weight`, `speed`, `noteTabs` and `noteTab` go away (read only by the upgrade).
- `normalize` enforces the caps; anything over a cap moves to the "From the old sheet" note (below), so an
  import or a hand-edited file never loses text.
- `undoLayout` is rewritten for the new lists: the earlier lists come back, but boxes, notes and tabs that
  still exist keep what was typed since.

### Upgrading v4 characters (`upgrade4`, tested)

| v4 | v5 |
|---|---|
| `hp.cur` / `hp.max` | the HP pair |
| `hp.temp`, `armor` | Temp HP and Armor small boxes |
| `initBonus` | Initiative small box following DEX, `points = initBonus` |
| `speed` (if filled) | a Speed small box |
| combat extras: `num` / `pair` | small boxes / pairs (up to the caps) |
| `hitDice` (`cur` + `die`, e.g. "1" + "d10") | Hit Die detail ("1d10") |
| `cls`, `ancestry`, `height`, `weight` (if filled) | detail lines; Level detail is added empty |
| header text extras | detail lines (up to the cap) |
| the six stats (`val`) + added stat boxes | stats, in order |
| saves STR / DEX / WIL `mode` | the pip on STR / DEX / WIS |
| the ten skills (`points`, stat link) + added skill boxes | skills, in order, keeping their stat links |
| removed default boxes (`removed`) | simply not in the lists |
| each entries tab (`title`, `sum`, `body`) | a tab with one box; each entry → a folded note: title, summary and body on their own lines, empty ones skipped |
| each notes tab (`name`, `text`) | a "Notes" tab with one box per notes tab (title = its name) holding one unfolded note with its text |
| wounds | unchanged |

Things that have no place on the new sheet but hold something typed go into a **"From the old sheet"** box
in the Notes tab, one note each, so nothing is lost: stat number slots (`slot`), key-stat marks, save numbers
(`val`), and boxes past the caps. Empty ones are dropped. Upgrades still chain: v1 → v2 → v3 → v4 → v5.

## Files

- `character-sheet/sheet.js`: the v5 model, `blank`, `upgrade4`, `normalize`, caps, `columns`,
  `noteTitle`, the new `undoLayout`; `skillStat`/`statVal` work on the stats list.
- `character-sheet/ui.js`: redraws the top section and the notes. The notes (tabs, boxes, notes) move to
  their own file, `character-sheet/notes.js`, so `ui.js` stays readable; both are plain scripts (CSP:
  scripts from the site only).
- `character-sheet/sheet.css`: rewritten for the flat look.
- `character-sheet/index.html`: More → Reset character; loads `notes.js`.
- `character-sheet/tests/sheet.test.js`: upgrade4 mapping (every row of the table), caps and overflow note,
  `columns`, `noteTitle`, `blank` defaults, reset, v5 round trip, `undoLayout`, merge still works on v5.
- `CLAUDE.md`: the Character Sheet section's rule 1 (look), rule 4 (configurable) and rule 5 (data) rewritten
  for v4; ground rule 4's "never white surfaces" note says the sheet is the exception. The rest of the site
  keeps the GM Guide look.
- `README.md`, `TRACKER.md`: what the sheet is now.

## Risks

- **An old page left open on another device.** Pre-v5 code can't read v5 data: it would show a blank sheet,
  and if someone typed into it, that newer edit would upload over the real one (the database only refuses
  *older* edits). Old code can't be patched after the fact, so: after pushing, reload every open sheet tab
  on every device (GitHub Pages caches files for up to 10 minutes), and export a backup of each character
  before the switch.
- **Print:** the new layout needs its own print styles (top section on page 1, notes after, unfolded).

## Out of scope

Dice, class / ancestry data, linking to Chong's Tracker or Chong Die, sharing a sheet with others.
