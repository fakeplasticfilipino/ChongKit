# Character Sheet v4: flat boxes on top, notes below (design)

Date: 2026-10-09 · Status: **draft, for review** · Prototype: `sheet-prototype.html` (scratchpad, throwaway)
Replaces the v3 layout and look of `character-sheet/`. Saved data goes from version 4 to **version 5**, with
no upgrade: older saves open as a blank sheet (only a test account has v4 data).

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
Still no dice rolling, and **no automation**: it's a sheet you write on. Every box is a number or text you
type; nothing is worked out from anything else (skills don't follow stats, Initiative doesn't follow DEX).
The only things the sheet does on its own are the calculator math you type and the red Bloodied number.

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
│ │ (● ● ○ ○ ○ ☠)  ◌ ◌ ◌            │ │                                           │ │
│ └────────────────────────────────┘ └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Part | Default | Cap | Layout |
|---|---|---|---|
| Details (next to the name) | Hit Die, Level | 6 | one line, wraps |
| Current / Max pairs | Current HP / Max HP (♥, Bloodied) | 2 | stacked, full width of the vitals |
| Small boxes | Temp HP, Armor (shield), Initiative | 6 | rows of up to 3 |
| Wounds | five circles + skull, then 3 dashed extra circles | — | under the small boxes |
| Stats | STR DEX CON INT WIS CHA | 12 | rows of up to 6 |
| Skills | Arcana, Examination, Influence, Insight, Perception, Stealth | 18 | rows of up to 6 |

- **Even rows:** a list of `n` boxes with at most `per` in a row uses the fewest rows, then spreads the boxes
  evenly: `rows = ceil(n / per)`, `columns = ceil(n / rows)` (7 stats → 4 + 3; 12 → 6 + 6; 18 skills → 6 + 6
  + 6). Never a lone box on its own row. The pure helper `Sheet.columns(n, per)` is tested.
- **Stats** share one frame (dividers between them). Each has its ▲▽ save pips on top: every stat is also
  its save (cycle none → advantage → disadvantage → none, as `cycleSave` today). The separate Saves
  section goes away.
- **Skills** and **small boxes** are plain numbers you type (calculator math and ↑/↓ work). Armor is the one
  box with the shield.
- **Pairs:** the default HP pair has the heart and turns Current red when Bloodied (at or below half Max).
  An added pair (Mana, Focus…) is plain: renamable labels, no heart, no Bloodied.
- **Wounds:** click to fill black (as today: fill up to the circle, or clear the last one). The 3 dashed
  extras sit after the skull and toggle one by one; they're always shown (no on/off setting).
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
  details: [{ id, label, value }],                   // Hit Die, Level
  pairs:   [{ id, label, maxLabel, cur, max, hp }],   // hp: true on the default HP pair only
  boxes:   [{ id, label, value, shield }],            // small boxes
  wounds,                                            // 0–6 filled on the track
  woundMarks: [false, false, false],                 // the 3 dashed extras
  stats:   [{ id, label, value, mode }],              // mode '' | 'adv' | 'dis'
  skills:  [{ id, label, value }],
  tabs:    [{ id, name, boxes: [{ id, title, notes: [{ id, text, folded }] }] }],
  tab,                                               // the open tab
}
```

- **No upgrade.** `normalize` reads v5 only. Anything older (or not a sheet) becomes `blank()`, keeping
  just its `id`, `owner` and `updated` so sync still matches it up. `upgrade1`, `upgrade2`, the v3 → v4
  notes step, `removed`, `extras`, `SECTIONS`, `ADDS`, `saves`, `skillStat`, `statVal`, `skillTotal`,
  `boxSkillTotal`, `initiative`, `pointsFor`, `woundsMax` and `woundExtra` are deleted, with their tests.
- `normalize` enforces the caps (extra boxes past a cap are dropped) and fills missing fields.
- `undoLayout` is rewritten for the new lists: the earlier lists come back, but boxes, notes and tabs that
  still exist keep what was typed since.
- Kept as they are: `mergeChars`, `content`, `loadAll` / `saveAll`, `exportJson` / `importJson`,
  `evalExpr` / `applyMath`, `signed` / `parseModifier`, `bloodied`, `setWounds`, `cycleSave`, `move`.

## Files

- `character-sheet/sheet.js`: the v5 model, `blank`, `normalize`, caps, `columns`, `noteTitle`, the new
  `undoLayout`; the v1–v4 upgrades and the stat-following math removed.
- `character-sheet/ui.js`: redraws the top section and the notes. The notes (tabs, boxes, notes) move to
  their own file, `character-sheet/notes.js`, so `ui.js` stays readable; both are plain scripts (CSP:
  scripts from the site only).
- `character-sheet/sheet.css`: rewritten for the flat look.
- `character-sheet/index.html`: More → Reset character; loads `notes.js`.
- `character-sheet/tests/sheet.test.js`: old tests for removed code go; new: `blank` defaults, older saves
  open blank (id kept), caps, `columns`, `noteTitle`, reset, v5 round trip, `undoLayout`, merge on v5.
- `CLAUDE.md`: the Character Sheet section's rule 1 (look), rule 4 (configurable) and rule 5 (data) rewritten
  for v4; ground rule 4's "never white surfaces" note says the sheet is the exception. The rest of the site
  keeps the GM Guide look.
- `README.md`, `TRACKER.md`: what the sheet is now.

## Risks

- **Print:** the new layout needs its own print styles (top section on page 1, notes after, unfolded).
- A sheet page left open on another device with the old code would show v5 characters blank; reload open
  tabs after pushing (only test data is at stake).

## Out of scope

Dice, class / ancestry data, linking to Chong's Tracker or Chong Die, sharing a sheet with others.
