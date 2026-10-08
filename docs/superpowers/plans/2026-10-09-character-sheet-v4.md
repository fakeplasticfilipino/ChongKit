# Character Sheet v4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `character-sheet/` as a flat whitish sheet: a top section of capped, configurable boxes and a full-width notes area of tabs → note boxes → foldable notes, on a new data version 5.

**Architecture:** `sheet.js` stays the pure, tested model (browser global `Sheet`, CommonJS for Node). `ui.js` keeps saving, sync, undo, the toolbar and sign-in, and gets a new top-section renderer. The notes move to a new plain script `notes.js` (global `SheetNotes`) that `ui.js` hands its helpers to. `sheet.css` is rewritten; the page overrides `nimble.css`'s tokens with `body.cs-flat`.

**Tech Stack:** Plain HTML + vanilla JS (no build, no libraries), `node:test` for tests, Supabase sync unchanged.

**Spec:** `docs/superpowers/specs/2026-10-09-character-sheet-v4-design.md`

## Global Constraints

- Zero-install: plain scripts loaded with `<script src>`; no modules, no CDN, no build. The page's CSP allows scripts from the site only, so no inline `<script>`; inline `style` attributes are allowed (`style-src 'unsafe-inline'`).
- User text is only ever set as text / `value`, never as HTML (`innerHTML` only for our own SVG paths).
- Caps: details 6, pairs 2, small boxes 6, stats 12, skills 18 (`Sheet.CAPS`). Rows: small boxes up to 3, stats and skills up to 6 (`Sheet.PER_ROW`); phones up to 3.
- Defaults: details Hit Die, Level; pair Current HP / Max HP (the ♥); small boxes Temp HP, Armor (shield), Initiative; stats STR DEX CON INT WIS CHA; skills Arcana, Examination, Influence, Insight, Perception, Stealth; tabs Actions, Spells, Inventory, each with one empty note box.
- Wounds: 6 on the track (five circles + skull), then 3 dashed extras.
- No automation: no calculator math, no Bloodied colour, nothing derived from another box. ↑/↓ step a whole number (`Sheet.step`).
- Look: white fields `#fff`, outlines `#4a4a4a`, label bands `#6f6f6f` with white caps text, corners 3 px, page `#dcdcd8`, no red on the sheet.
- No helper or explainer text in the UI (labels and numbers only).
- Keep every security rule in CLAUDE.md's Character Sheet section (PKCE, CSP, text-only user content, database limits).
- Git: `git pull --rebase origin main` before starting and before pushing; commit straight to `main`; never commit `.claude/launch.json`. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `npm test` (repo root) must pass before every commit.

**User decisions (already made):**
- "I want the simplistic whitish box aesthetic" (not the brown, curved parchment look).
- Split horizontally: stats on top, notes below, notes "significantly bigger".
- Hard caps for looks: 12 stats ("abilities"), 18 skills, one extra Current / Max pair, 3 more small boxes (6 total).
- Defaults are removable; "resetting the sheet should always revert back to these defaults".
- Save pips on every stat.
- Note boxes arrange themselves automatically inside the notes area.
- "No automation, this is just a sheet you write on": no skill/stat links, no calculator math, no Bloodied colour.
- 3 extra wound circles.
- No upgrade of old saves: "I don't mind losing data" (only a test account has v4 data).

---

## File Structure

| File | Responsibility |
|---|---|
| `character-sheet/sheet.js` | Rewrite: v5 model, defaults, caps, `normalize`, `reset`, `columns`, `noteTitle`, `moveNote`, `step`, `undoLayout`; storage, merge, import/export kept. |
| `character-sheet/tests/sheet.test.js` | Rewrite: tests for the v5 model. |
| `character-sheet/notes.js` | New: draws the notes area (tabs → note boxes → notes), drag notes between boxes. |
| `character-sheet/ui.js` | Edit: new top section, Edit layout boxes, Reset, undo snapshots, print; saving / sync / sign-in untouched. |
| `character-sheet/index.html` | Edit: `body.cs-flat`, More → Reset character, load `notes.js`. |
| `character-sheet/sheet.css` | Rewrite: the flat look. |
| `CLAUDE.md`, `README.md`, `TRACKER.md`, `index.html` (root) | Docs and the landing card. |

---

### Task 1: The v5 model in sheet.js

**Goal:** `sheet.js` holds the version 5 character (lists of boxes with caps, tabs of note boxes) with its pure helpers, covered by a rewritten test file.

**Files:**
- Modify (full rewrite): `character-sheet/sheet.js`
- Test (full rewrite): `character-sheet/tests/sheet.test.js`

**Acceptance Criteria:**
- [ ] `Sheet.blank()` returns `v: 5` with exactly the defaults listed in Global Constraints.
- [ ] `Sheet.normalize` returns a blank sheet keeping only `id`, `owner`, `updated` for any input with `v < 5`.
- [ ] `normalize` caps each list, keeps defaults for a missing list, keeps an empty list empty, drops junk entries, makes missing ids.
- [ ] `columns(7, 6) === 4`, `columns(12, 6) === 6`, `columns(18, 6) === 6`, `columns(4, 3) === 2`.
- [ ] `noteTitle('Fireball\n1d10') === 'Fireball.'`; empty first line → `'Untitled'`.
- [ ] `moveNote`, `step`, `reset`, `undoLayout`, `mergeChars`, `loadAll`/`saveAll`, `importJson` behave as the tests below say.
- [ ] `npm test` passes.

**Verify:** `node --test character-sheet/tests/sheet.test.js` → `ℹ fail 0`

**Steps:**

- [ ] **Step 1: Write the failing tests** — replace `character-sheet/tests/sheet.test.js` with:

```js
// Run with: node --test character-sheet/tests
const test = require('node:test');
const assert = require('node:assert');
const S = require('../sheet.js');

const labels = (list) => list.map((x) => x.label);

test('a blank sheet has the default layout', () => {
  const s = S.blank('Bryn');
  assert.strictEqual(s.v, 5);
  assert.strictEqual(s.name, 'Bryn');
  assert.deepStrictEqual(labels(s.details), ['Hit Die', 'Level']);
  assert.deepStrictEqual(s.pairs.map((p) => [p.label, p.maxLabel, p.hp]), [['Current HP', 'Max HP', true]]);
  assert.deepStrictEqual(s.boxes.map((b) => [b.label, b.shield]), [['Temp HP', false], ['Armor', true], ['Initiative', false]]);
  assert.deepStrictEqual(labels(s.stats), ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
  assert.deepStrictEqual(s.stats[0], { id: s.stats[0].id, label: 'STR', value: '', mode: '' });
  assert.deepStrictEqual(labels(s.skills), ['Arcana', 'Examination', 'Influence', 'Insight', 'Perception', 'Stealth']);
  assert.strictEqual(s.wounds, 0);
  assert.deepStrictEqual(s.woundMarks, [false, false, false]);
  assert.deepStrictEqual(s.tabs.map((t) => t.name), ['Actions', 'Spells', 'Inventory']);
  assert.ok(s.tabs.every((t) => t.boxes.length === 1 && t.boxes[0].notes.length === 0));
  assert.strictEqual(s.tab, s.tabs[0].id);
  assert.strictEqual(s.updated, 0);
  const ids = [s.details, s.pairs, s.boxes, s.stats, s.skills, s.tabs].flat().map((x) => x.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'every box has its own id');
});

test('older saves open as a blank sheet that keeps its id, owner and last edit', () => {
  const s = S.normalize({ v: 4, id: 'old1', owner: 'me', updated: 500, name: 'Bryn', stats: { str: { val: 3 } } });
  assert.strictEqual(s.v, 5);
  assert.deepStrictEqual([s.id, s.owner, s.updated, s.name], ['old1', 'me', 500, '']);
  assert.deepStrictEqual(labels(s.stats), ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
  assert.strictEqual(s.stats[0].value, '');
  assert.strictEqual(S.normalize(null).v, 5);
  assert.strictEqual(S.normalize('x').v, 5);
});

test('normalize keeps a v5 sheet and cleans it up', () => {
  const s = S.blank('Bryn');
  s.stats[0].value = '+2';
  s.stats[0].mode = 'adv';
  s.pairs.push(S.newPair('Mana', 'Max Mana'));
  s.tabs[1].boxes[0].notes.push(S.newNote('Fireball\n1d10', true));
  s.wounds = 2;
  s.woundMarks[1] = true;
  assert.deepStrictEqual(S.normalize(JSON.parse(JSON.stringify(s))), s, 'a v5 sheet comes back the same');

  const odd = S.normalize({
    v: 5, name: 7, wounds: 99, woundMarks: [1, 0, 1, 1, 1],
    stats: Array.from({ length: 14 }, (_, i) => ({ label: 'S' + i, value: i, mode: 'weird' })),
    skills: [null, 'x', { label: 'Lore', value: 3 }],
    boxes: [],
    tabs: [{ id: 't1', name: 'A', boxes: [{ title: 'B', notes: [{ text: 'n', folded: 1 }, null] }] }], tab: 'gone',
  });
  assert.strictEqual(odd.name, '7');
  assert.strictEqual(odd.wounds, 6);
  assert.deepStrictEqual(odd.woundMarks, [true, false, true]);
  assert.strictEqual(odd.stats.length, 12, 'stats stop at the cap');
  assert.deepStrictEqual([odd.stats[0].value, odd.stats[0].mode], ['0', '']);
  assert.deepStrictEqual(odd.skills.map((k) => [k.label, k.value]), [['Lore', '3']]);
  assert.deepStrictEqual(odd.boxes, [], 'an emptied list stays empty');
  assert.deepStrictEqual(labels(odd.details), ['Hit Die', 'Level'], 'a missing list keeps the defaults');
  assert.strictEqual(odd.tab, 't1');
  assert.deepStrictEqual(odd.tabs[0].boxes[0].notes.map((n) => [n.text, n.folded]), [['n', true]]);
  assert.ok(odd.tabs[0].boxes[0].id && odd.tabs[0].boxes[0].notes[0].id, 'missing ids are made');
  assert.strictEqual(S.normalize({ v: 5, tabs: [] }).tab, '');
});

test('caps and even rows', () => {
  assert.deepStrictEqual(S.CAPS, { details: 6, pairs: 2, boxes: 6, stats: 12, skills: 18 });
  assert.deepStrictEqual(S.PER_ROW, { boxes: 3, stats: 6, skills: 6 });
  const s = S.blank();
  while (S.canAdd(s, 'stats')) s.stats.push(S.newStat());
  assert.strictEqual(s.stats.length, 12);
  assert.ok(S.canAdd(s, 'pairs'));
  s.pairs.push(S.newPair());
  assert.ok(!S.canAdd(s, 'pairs'));
  assert.deepStrictEqual([0, 1, 5, 6, 7, 8, 12, 13, 18].map((n) => S.columns(n, 6)), [1, 1, 5, 6, 4, 4, 6, 5, 6]);
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7].map((n) => S.columns(n, 3)), [1, 2, 3, 2, 3, 3, 3]);
});

test('a folded note shows its first line', () => {
  assert.strictEqual(S.noteTitle('Fireball\n1d10 ranged spell attack.\n120ft.'), 'Fireball.');
  assert.strictEqual(S.noteTitle('Shield.\nReaction'), 'Shield.');
  for (const t of ['Why?', 'Ready!', 'Spells:']) assert.strictEqual(S.noteTitle(t), t);
  assert.strictEqual(S.noteTitle('  Rope, 50 ft  '), 'Rope, 50 ft.');
  assert.strictEqual(S.noteTitle(''), 'Untitled');
  assert.strictEqual(S.noteTitle('\nsecond line'), 'Untitled');
});

test('notes move within a box and into other boxes', () => {
  const [a, b, c] = ['a', 'b', 'c'].map((t) => ({ ...S.newNote(t), id: t }));
  const boxes = [{ id: 'A', title: '', notes: [a, b, c] }, { id: 'B', title: '', notes: [] }];
  const ids = (bs) => bs.map((x) => x.notes.map((n) => n.id).join(''));
  assert.deepStrictEqual(ids(S.moveNote(boxes, 'A', 'a', 'A', 2)), ['bac', '']);
  assert.deepStrictEqual(ids(S.moveNote(boxes, 'A', 'c', 'A', 0)), ['cab', '']);
  assert.deepStrictEqual(ids(S.moveNote(boxes, 'A', 'a', 'A', 1)), ['abc', ''], 'dropped on the next note: stays put');
  assert.deepStrictEqual(ids(S.moveNote(boxes, 'A', 'a', 'A', null)), ['bca', '']);
  assert.deepStrictEqual(ids(S.moveNote(boxes, 'A', 'b', 'B', null)), ['ac', 'b']);
  assert.deepStrictEqual(ids(S.moveNote(boxes, 'A', 'zz', 'B', null)), ['abc', '']);
  assert.deepStrictEqual(ids(boxes), ['abc', ''], 'the original is untouched');
});

test('↑ / ↓ step whole numbers and leave other text alone', () => {
  assert.strictEqual(S.step('3', 1), '4');
  assert.strictEqual(S.step('+2', 1), '+3');
  assert.strictEqual(S.step('+1', -1), '0');
  assert.strictEqual(S.step('-1', -5), '-6');
  assert.strictEqual(S.step('−1', 1), '0');
  assert.strictEqual(S.step('', 1), '1');
  assert.strictEqual(S.step('d10', 1), 'd10');
  assert.strictEqual(S.step('13-4', 1), '13-4');
});

test('wounds and save pips', () => {
  assert.strictEqual(S.setWounds(0, 2), 3);
  assert.strictEqual(S.setWounds(3, 2), 2);
  assert.strictEqual(S.setWounds(3, 0), 1);
  assert.deepStrictEqual(['', 'adv', 'dis', 'x'].map(S.cycleSave), ['adv', 'dis', '', 'adv']);
});

test('reset starts the character again from the defaults', () => {
  const s = S.blank('Bryn');
  Object.assign(s, { id: 'c1', owner: 'me', updated: 900, stats: [], wounds: 4 });
  s.tabs[0].boxes[0].notes.push(S.newNote('x'));
  const r = S.reset(s);
  assert.deepStrictEqual([r.id, r.owner, r.updated, r.name, r.wounds], ['c1', 'me', 900, '', 0]);
  assert.deepStrictEqual(labels(r.stats), ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
  assert.strictEqual(r.tabs[0].boxes[0].notes.length, 0);
  assert.notStrictEqual(S.content(r), S.content(s));
});

test('undo brings back the layout but keeps what was typed since', () => {
  const before = S.blank();
  before.tabs[0].boxes[0].notes = [S.newNote('Bow'), S.newNote('Axe')];
  before.tabs[0].boxes.push(S.newNoteBox('Spare'));
  const now = JSON.parse(JSON.stringify(before));
  now.stats = now.stats.slice(1); // STR removed
  now.stats[0].value = '+1'; // then DEX typed in
  now.skills.push(S.newSkill('Lore')); // a skill added
  now.name = 'Bryn';
  now.tabs[0].name = 'Attacks';
  now.tabs[0].boxes = now.tabs[0].boxes.slice(0, 1); // Spare box removed
  now.tabs[0].boxes[0].notes = [{ ...now.tabs[0].boxes[0].notes[1], text: 'Axe\n1d8', folded: true }]; // Bow deleted, Axe typed
  now.tabs.splice(2, 1); // Inventory tab closed
  const u = S.undoLayout(before, now);
  assert.deepStrictEqual(labels(u.stats), ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
  assert.strictEqual(u.stats[1].value, '+1');
  assert.strictEqual(u.skills.length, 6);
  assert.strictEqual(u.name, 'Bryn');
  assert.deepStrictEqual(u.tabs.map((t) => t.name), ['Attacks', 'Spells', 'Inventory']);
  assert.deepStrictEqual(u.tabs[0].boxes.map((x) => x.title), ['', 'Spare']);
  assert.deepStrictEqual(u.tabs[0].boxes[0].notes.map((n) => [n.text, n.folded]), [['Bow', false], ['Axe\n1d8', true]]);
});

test('saving several characters; export and import', () => {
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
  const first = S.loadAll(storage);
  assert.strictEqual(Object.keys(first.chars).length, 1, 'starts with one blank character');
  const b = S.blank('Bryn');
  b.tabs[0].boxes[0].notes.push(S.newNote('Longbow\n+3'));
  first.chars[b.id] = b;
  first.current = b.id;
  assert.ok(S.saveAll(storage, first));
  const again = S.loadAll(storage);
  assert.strictEqual(again.current, b.id);
  assert.strictEqual(again.chars[b.id].name, 'Bryn');
  assert.strictEqual(again.chars[b.id].tabs[0].boxes[0].notes[0].text, 'Longbow\n+3');
  const copy = S.importJson(S.exportJson(b));
  assert.strictEqual(copy.name, 'Bryn');
  assert.strictEqual(copy.tabs[0].boxes[0].notes[0].text, 'Longbow\n+3');
  assert.notStrictEqual(copy.id, b.id, 'an import never overwrites');
  assert.throws(() => S.importJson('{"name":"x"}'));
  assert.throws(() => S.importJson('nope'));
  mem.set(S.STORE, '{broken');
  assert.strictEqual(Object.keys(S.loadAll(storage).chars).length, 1);
});

test('syncing with an account: newer edit wins, untouched blanks stay local, accounts never mix', () => {
  const mk = (id, name, updated, owner = '') => ({ ...S.blank(name), id, updated, owner });
  const local = { a: mk('a', 'Local newer', 200), b: mk('b', 'Local older', 100), c: mk('c', 'Only here', 50), d: mk('d', '', 0),
    e: mk('e', 'Gone', 70, 'me'), o: mk('o', 'Other account', 999, 'them'), q: mk('q', 'Queued delete', 80, 'me') };
  const remote = [
    { id: 'a', data: mk('a', 'Remote older', 150) },
    { id: 'b', data: mk('b', 'Remote newer', 300) },
    { id: 'f', data: mk('f', 'Only there', 10) },
    { id: 'q', data: mk('q', 'Queued delete', 80) },
    { id: 'x', data: null },
  ];
  const m = S.mergeChars(local, remote, ['e', 'q'], 'me', ['q']); // e: deleted on another device; q: deleted here, not sent yet
  assert.deepStrictEqual(Object.keys(m.chars).sort(), ['a', 'b', 'c', 'd', 'f', 'o']);
  assert.strictEqual(m.chars.a.name, 'Local newer');
  assert.strictEqual(m.chars.b.name, 'Remote newer');
  assert.strictEqual(m.chars.f.name, 'Only there');
  assert.deepStrictEqual(m.upload.sort(), ['a', 'c'], 'never-edited d and the other account\'s o are not uploaded');
  assert.strictEqual(m.chars.a.owner, 'me');
  assert.strictEqual(m.chars.f.owner, 'me');
  assert.strictEqual(m.chars.o.owner, 'them');
  assert.strictEqual(m.chars.d.owner, '', 'a blank stays this browser\'s');
  assert.strictEqual(S.normalize({ v: 3, updated: 'x' }).updated, 0);
  assert.strictEqual(S.normalize({ v: 3, name: 'Old save' }).updated, 1, 'saves from before syncing get uploaded');
  assert.strictEqual(S.blank().updated, 0);
  const s = S.blank('Same');
  assert.strictEqual(S.content(s), S.content({ ...s, updated: 999, owner: 'me' }), 'timestamp and owner are not content');
  const imported = S.importJson(S.exportJson({ ...s, owner: 'them' }));
  assert.strictEqual(imported.owner, '', 'an import is yours');
  assert.ok(imported.updated > 1, 'an import counts as an edit');
});

test('move', () => {
  assert.deepStrictEqual(S.move(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepStrictEqual(S.move(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepStrictEqual(S.move(['a', 'b'], 5, 0), ['a', 'b']);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test character-sheet/tests/sheet.test.js`
Expected: FAIL (e.g. `s.v` is 4, `S.columns is not a function`).

- [ ] **Step 3: Rewrite `character-sheet/sheet.js`** with:

```js
// Character Sheet: pure logic (no DOM), so it runs in the browser (window.Sheet) and under Node
// for tests (module.exports).
// v4 sheet, data version 5: a sheet you write on. Every box holds the text typed into it; nothing
// is worked out from anything else. The layout is lists of boxes with caps (the table's choice, for
// looks): details, current / max pairs, small boxes, wounds, stats (each with a save pip), skills,
// and tabs of note boxes holding notes. Derived (not from the GM Guide): the layout, the defaults
// and the caps.

(function (root) {
  const VERSION = 5;
  const STORE = 'chongkit.sheets'; // localStorage: { current, chars: { id: sheet } }

  const CAPS = { details: 6, pairs: 2, boxes: 6, stats: 12, skills: 18 };
  const PER_ROW = { boxes: 3, stats: 6, skills: 6 }; // the most boxes in one row (phones: 3)
  const WOUNDS = 6; // five circles and the skull
  const EXTRA_WOUNDS = 3; // the dashed circles after the skull
  const DEFAULTS = {
    details: ['Hit Die', 'Level'],
    stats: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
    skills: ['Arcana', 'Examination', 'Influence', 'Insight', 'Perception', 'Stealth'],
    tabs: ['Actions', 'Spells', 'Inventory'],
  };

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const int = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
  const str = (v) => (v == null ? '' : String(v));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const mode = (v) => (v === 'adv' || v === 'dis' ? v : '');

  const newDetail = (label = '') => ({ id: uid(), label, value: '' });
  const newPair = (label = '', maxLabel = '', hp = false) => ({ id: uid(), label, maxLabel, cur: '', max: '', hp });
  const newBox = (label = '', shield = false) => ({ id: uid(), label, value: '', shield });
  const newStat = (label = '') => ({ id: uid(), label, value: '', mode: '' });
  const newSkill = (label = '') => ({ id: uid(), label, value: '' });
  const newNote = (text = '', folded = false) => ({ id: uid(), text, folded });
  const newNoteBox = (title = '') => ({ id: uid(), title, notes: [] });
  const newTab = (name = '') => ({ id: uid(), name, boxes: [newNoteBox()] });

  function blank(name = '') {
    const s = {
      v: VERSION, id: uid(), name, updated: 0, owner: '',
      details: DEFAULTS.details.map((l) => newDetail(l)),
      pairs: [newPair('Current HP', 'Max HP', true)],
      boxes: [newBox('Temp HP'), newBox('Armor', true), newBox('Initiative')],
      wounds: 0, woundMarks: Array(EXTRA_WOUNDS).fill(false),
      stats: DEFAULTS.stats.map((l) => newStat(l)),
      skills: DEFAULTS.skills.map((l) => newSkill(l)),
      tabs: DEFAULTS.tabs.map((n) => newTab(n)), tab: '',
    };
    s.tab = s.tabs[0].id;
    return s;
  }

  // Anything loaded (saves, imports, the account) is filled out to the current shape. Older versions
  // aren't upgraded: they open as a blank sheet that keeps only their id, owner and last edit, so
  // syncing still matches them up.
  const objs = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : null);
  const keepId = (x) => str(x.id) || uid();
  const READ = {
    details: (d) => ({ id: keepId(d), label: str(d.label), value: str(d.value) }),
    pairs: (p) => ({ id: keepId(p), label: str(p.label), maxLabel: str(p.maxLabel), cur: str(p.cur), max: str(p.max), hp: !!p.hp }),
    boxes: (b) => ({ id: keepId(b), label: str(b.label), value: str(b.value), shield: !!b.shield }),
    stats: (x) => ({ id: keepId(x), label: str(x.label), value: str(x.value), mode: mode(x.mode) }),
    skills: (x) => ({ id: keepId(x), label: str(x.label), value: str(x.value) }),
  };
  const readNote = (n) => ({ id: keepId(n), text: str(n.text), folded: !!n.folded });
  const readNoteBox = (b) => ({ id: keepId(b), title: str(b.title), notes: (objs(b.notes) || []).map(readNote) });
  const readTab = (t) => ({ id: keepId(t), name: str(t.name), boxes: (objs(t.boxes) || []).map(readNoteBox) });

  function normalize(input) {
    if (!input || typeof input !== 'object') return blank();
    const s = blank();
    s.id = str(input.id) || s.id;
    // Last edit (ms), for syncing; 0 = never edited. Saves without one count as edited (so they're
    // uploaded on first sign-in) but older than anything in the account.
    s.updated = input.updated == null ? 1 : Math.max(0, int(input.updated));
    s.owner = str(input.owner); // the account it was synced to ('' = this browser only)
    if (int(input.v, 1) < VERSION) return s;
    s.name = str(input.name);
    for (const k of Object.keys(CAPS)) {
      const list = objs(input[k]);
      if (list) s[k] = list.slice(0, CAPS[k]).map(READ[k]); // a missing list keeps the defaults
    }
    s.wounds = clamp(int(input.wounds), 0, WOUNDS);
    const marks = Array.isArray(input.woundMarks) ? input.woundMarks : [];
    s.woundMarks = s.woundMarks.map((_, i) => !!marks[i]);
    const tabs = objs(input.tabs);
    if (tabs) s.tabs = tabs.map(readTab);
    s.tab = s.tabs.some((t) => t.id === input.tab) ? input.tab : (s.tabs[0] || {}).id || '';
    return s;
  }

  // Reset: the character starts again from the default layout, keeping who it is (id and owner).
  const reset = (s) => ({ ...blank(), id: s.id, owner: s.owner, updated: s.updated });

  const canAdd = (s, key) => s[key].length < CAPS[key];
  // Even rows: the fewest rows of at most `per` boxes, spread evenly, so no box sits alone on a row
  // (7 → 4 + 3, 12 → 6 + 6, 18 → 6 + 6 + 6). Returns the number of columns.
  function columns(n, per) {
    if (n < 1) return 1;
    return Math.ceil(n / Math.ceil(n / per));
  }

  // A folded note shows its first line as its name, ending in a full stop ("Fireball" → "Fireball.").
  function noteTitle(text) {
    const first = str(text).split('\n')[0].trim();
    if (!first) return 'Untitled';
    return /[.!?:]$/.test(first) ? first : first + '.';
  }

  // Move a note within its box or into another box of the same tab. `at` is the index in the target
  // box to go before (null: the end). Returns the tab's new boxes; the input is left as it was.
  function moveNote(boxes, fromBox, noteId, toBox, at = null) {
    const out = boxes.map((b) => ({ ...b, notes: b.notes.slice() }));
    const src = out.find((b) => b.id === fromBox);
    const dst = out.find((b) => b.id === toBox);
    if (!src || !dst) return out;
    const i = src.notes.findIndex((n) => n.id === noteId);
    if (i < 0) return out;
    const [n] = src.notes.splice(i, 1);
    let pos = at == null ? dst.notes.length : at;
    if (src === dst && at != null && i < at) pos -= 1;
    dst.notes.splice(clamp(pos, 0, dst.notes.length), 0, n);
    return out;
  }

  // ↑ / ↓ on a box: a whole number steps (a "+2" modifier keeps its sign: "+3"); other text is left alone.
  const signed = (n) => (n > 0 ? `+${n}` : String(n));
  function step(text, by) {
    const t = str(text).trim().replace(/−/g, '-');
    if (t === '') return String(by);
    if (!/^[+-]?\d+$/.test(t)) return str(text);
    const v = parseInt(t, 10) + by;
    return /^[+-]/.test(t) ? signed(v) : String(v);
  }

  // Click a wound circle: fill up to it, or clear it if it's the last one filled.
  const setWounds = (current, index) => (index + 1 === current ? index : index + 1);
  // A stat's save pip cycles none → ▲ advantage → ▼ disadvantage → none.
  const cycleSave = (current) => ({ '': 'adv', adv: 'dis', dis: '' })[mode(current)];

  // Undo a layout change (remove, add, move, tabs, note boxes, notes): bring back the earlier lists,
  // but keep everything typed since (boxes, notes and tabs that still exist keep their text).
  function undoLayout(prev, cur) {
    const pick = (before, now) => before.map((b) => now.find((c) => c.id === b.id) || b);
    const out = { ...cur };
    for (const k of Object.keys(CAPS)) out[k] = pick(prev[k] || [], cur[k] || []);
    out.tabs = (prev.tabs || []).map((t) => {
      const now = (cur.tabs || []).find((c) => c.id === t.id);
      if (!now) return t;
      const notesNow = new Map((now.boxes || []).flatMap((b) => b.notes).map((n) => [n.id, n]));
      return { ...now, boxes: (t.boxes || []).map((b) => {
        const nb = (now.boxes || []).find((c) => c.id === b.id) || b;
        return { ...nb, notes: b.notes.map((n) => notesNow.get(n.id) || n) };
      }) };
    });
    if (!out.tabs.some((t) => t.id === out.tab)) out.tab = prev.tab;
    return out;
  }

  // Move an item in a list to another position.
  function move(list, from, to) {
    const out = list.slice();
    if (from < 0 || from >= out.length) return out;
    const [x] = out.splice(from, 1);
    out.splice(clamp(to, 0, out.length), 0, x);
    return out;
  }

  // --- Saving ---------------------------------------------------------------------
  // All characters live under one localStorage key. `storage` is localStorage (or a stand-in).
  function loadAll(storage) {
    let data = null;
    try { data = JSON.parse(storage.getItem(STORE)); } catch {}
    const chars = {};
    if (data && data.chars && typeof data.chars === 'object') {
      for (const raw of Object.values(data.chars)) { const s = normalize(raw); chars[s.id] = s; }
    }
    if (!Object.keys(chars).length) { const s = blank(); chars[s.id] = s; }
    const current = data && chars[data.current] ? data.current : Object.keys(chars)[0];
    return { current, chars };
  }
  function saveAll(storage, all) {
    try { storage.setItem(STORE, JSON.stringify(all)); return true; } catch { return false; }
  }

  // --- Syncing with an account ---------------------------------------------------------
  // `remote` is the account's characters ([{ id, data }]); `synced` the ids this browser has seen
  // in this account before; `user` the account's id; `deletes` ids deleted here but not yet in the
  // account. Returns the merged characters and the ids to upload:
  // - in both: the newer edit wins (uploaded if it's the local one);
  // - only remote: downloaded (unless it's waiting to be deleted);
  // - only local: uploaded if it was ever edited, dropped if it was synced before (deleted on
  //   another device), and kept but never uploaded if it belongs to another account.
  // Every character that ends up in the account is marked with its `owner`.
  function mergeChars(local, remote, synced = [], user = '', deletes = []) {
    const chars = {};
    const upload = [];
    const seen = new Set(synced);
    const gone = new Set(deletes);
    const inRemote = new Set();
    for (const row of remote || []) {
      if (!row || !row.data || gone.has(row.id)) continue;
      const r = normalize({ ...row.data, id: row.id });
      inRemote.add(r.id);
      const l = local[r.id];
      if (l && l.updated > r.updated && (!l.owner || l.owner === user)) { chars[l.id] = { ...l, owner: user }; upload.push(l.id); }
      else chars[r.id] = { ...r, owner: user };
    }
    for (const l of Object.values(local)) {
      if (inRemote.has(l.id) || gone.has(l.id)) continue;
      if (l.owner && l.owner !== user) { chars[l.id] = l; continue; } // another account's: never upload
      if (seen.has(l.id)) continue; // deleted elsewhere
      if (l.updated) { chars[l.id] = { ...l, owner: user }; upload.push(l.id); } else chars[l.id] = l;
    }
    return { chars, upload };
  }
  // The character without its timestamp and owner: two copies with the same content compare equal.
  const content = (s) => JSON.stringify({ ...s, updated: 0, owner: '' });
  const exportJson = (s) => JSON.stringify({ chongkitSheet: VERSION, ...s }, null, 2);
  // An imported character always gets a new id, so it never overwrites one you have.
  function importJson(text) {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || !raw.chongkitSheet) throw new Error('Not a ChongKit character');
    return { ...normalize(raw), id: uid(), owner: '', updated: Date.now() }; // a new character of yours
  }

  const api = {
    VERSION, STORE, CAPS, PER_ROW, WOUNDS, EXTRA_WOUNDS, DEFAULTS, uid,
    blank, normalize, reset, newDetail, newPair, newBox, newStat, newSkill, newNote, newNoteBox, newTab,
    canAdd, columns, noteTitle, moveNote, step, signed, setWounds, cycleSave, undoLayout, move,
    loadAll, saveAll, exportJson, importJson, mergeChars, content,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Sheet = api;
})(this);
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test character-sheet/tests/sheet.test.js`
Expected: every test passes, `ℹ fail 0`.

- [ ] **Step 5: Commit** (the page is broken until Task 2: commit locally, don't push yet)

```bash
git add character-sheet/sheet.js character-sheet/tests/sheet.test.js
git commit -m "Character Sheet v4: data version 5 model (lists of boxes with caps, note boxes)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The page: notes.js, ui.js, index.html

**Goal:** The page draws the v5 sheet: the top section with Edit layout boxes, Reset, and the notes (tabs → note boxes → foldable notes, drag between boxes), with saving, sync, undo and sign-in working as before.

**Files:**
- Create: `character-sheet/notes.js`
- Modify: `character-sheet/ui.js` (top comment, state, `syncAll`, undo, `ICON`, the whole sheet-drawing block, `show`, Reset, Print — found by content in Steps 2–4)
- Modify: `character-sheet/index.html`

**Acceptance Criteria:**
- [ ] Opening `http://localhost:8000/character-sheet/` shows no console errors and draws: name + Hit Die + Level, the HP pair with the heart, Temp HP / Armor (shield) / Initiative, 6 wound dots + 3 dashed, 6 stats with pips, 6 skills, tabs Actions / Spells / Inventory.
- [ ] In Edit layout every box has a `.cs-x` and a `.cs-grip`; `+ Stat (6/12)` adds a stat; the button disappears at 12; same for skills (18), small boxes (6), pairs (2), details (6).
- [ ] Typing in any box saves (reload keeps it); ↑ on `+2` gives `+3`.
- [ ] Clicking a stat's pip cycles none → ▲ → ▼ → none.
- [ ] A note folds to `Fireball.` and unfolds; a box's header chevron folds/unfolds all its notes; + Note, + Box, × (with Undo) work; a note drags into another box.
- [ ] More → Reset character asks, resets to the defaults, and Undo brings everything back (name included).
- [ ] Sign-in, sync and import/export code is unchanged apart from the lines listed.

**Verify:** `npm test` → `ℹ fail 0`; then the browser checks in Step 6.

**Steps:**

- [ ] **Step 1: Create `character-sheet/notes.js`**

```js
// Character Sheet: the notes. Tabs (the same tab strip as before) of note boxes; a note is free
// text whose first line is its name, and it folds to that one line (Sheet.noteTitle). Notes drag
// within their box or into another box of the tab. ui.js hands over its helpers and draws this.
(function () {
  const S = window.Sheet;
  window.SheetNotes = function (ui) {
    const { h, icon, change, commit } = ui;
    let focusNote = null; // a new note's id: its text box gets the cursor after the redraw
    let dragging = null; // the note being dragged: { box, id }

    function grow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
    const redraw = () => { commit(); ui.render(); };

    // Drop on a note to go before it, on a box's empty space to go at its end.
    function moveTo(tab, toBox, at) {
      const from = dragging;
      dragging = null;
      if (from) change(null, () => { tab.boxes = S.moveNote(tab.boxes, from.box, from.id, toBox, at); });
    }
    function dropTarget(node, onDrop) {
      node.addEventListener('dragover', (ev) => { if (dragging) { ev.preventDefault(); ev.stopPropagation(); node.classList.add('drop'); } });
      node.addEventListener('dragleave', () => node.classList.remove('drop'));
      node.addEventListener('drop', (ev) => { if (!dragging) return; ev.preventDefault(); ev.stopPropagation(); node.classList.remove('drop'); onDrop(); });
    }

    function note(n, i, box, tab) {
      const title = S.noteTitle(n.text);
      const toggle = () => { n.folded = !n.folded; redraw(); };
      let body;
      if (ui.printing) body = h('div', { class: 'cs-nprint' }, n.text);
      else if (n.folded) body = h('button', { type: 'button', class: 'cs-nline', onclick: toggle }, title);
      else {
        body = h('textarea', { class: 'cs-ntext', value: n.text, rows: 1, 'aria-label': title, spellcheck: true,
          oninput: (ev) => { n.text = ev.target.value; commit(); grow(ev.target); } });
        setTimeout(() => grow(body), 0);
      }
      const grip = h('span', { class: 'cs-grip', title: 'Drag to move', draggable: 'true' }, icon('grip', 'cs-ic sm'));
      const node = h('div', { class: 'cs-note' + (n.folded && !ui.printing ? ' folded' : ''), 'data-note': n.id },
        grip,
        h('button', { type: 'button', class: 'cs-nfold', 'aria-expanded': String(!n.folded), 'aria-label': n.folded ? 'Unfold' : 'Fold', onclick: toggle },
          icon('chevron', 'cs-ic sm')),
        body,
        h('button', { type: 'button', class: 'cs-ndel', title: 'Delete', 'aria-label': `Delete ${title}`,
          onclick: () => change(`Deleted ${title}`, () => { box.notes = box.notes.filter((x) => x.id !== n.id); }) }, icon('close', 'cs-ic xs')));
      grip.addEventListener('dragstart', (ev) => {
        ev.dataTransfer.setData('text/plain', 'note');
        ev.dataTransfer.effectAllowed = 'move';
        dragging = { box: box.id, id: n.id };
        node.classList.add('dragging');
      });
      grip.addEventListener('dragend', () => { node.classList.remove('dragging'); dragging = null; });
      dropTarget(node, () => moveTo(tab, box.id, i));
      return node;
    }

    function noteBox(box, tab) {
      const anyOpen = box.notes.some((n) => !n.folded);
      const head = h('div', { class: 'cs-nhead' },
        h('button', { type: 'button', class: 'cs-nfold', 'aria-expanded': String(anyOpen), 'aria-label': anyOpen ? 'Fold all' : 'Unfold all',
          onclick: () => { box.notes.forEach((n) => { n.folded = anyOpen; }); redraw(); } }, icon('chevron', 'cs-ic sm')),
        h('input', { class: 'cs-ntitle', value: box.title, 'aria-label': 'Box title', spellcheck: false,
          oninput: (ev) => { box.title = ev.target.value; commit(); },
          onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } }),
        h('button', { type: 'button', class: 'cs-ndel', title: 'Remove box', 'aria-label': `Remove ${box.title || 'box'}`,
          onclick: () => change(`Removed ${box.title || 'box'}`, () => { tab.boxes = tab.boxes.filter((b) => b.id !== box.id); }) },
        icon('close', 'cs-ic xs')));
      const add = h('button', { type: 'button', class: 'cs-nadd', onclick: () => {
        const n = S.newNote();
        focusNote = n.id;
        change(null, () => { box.notes.push(n); });
      } }, '+ Note');
      const node = h('div', { class: 'cs-nbox' }, head, h('div', { class: 'cs-nlist' }, box.notes.map((n, i) => note(n, i, box, tab)), add));
      dropTarget(node, () => moveTo(tab, box.id, null));
      return node;
    }

    function render() {
      const count = (t) => t.boxes.reduce((sum, b) => sum + b.notes.length, 0);
      const { cur, strip } = ui.tabStrip('tabs', 'tab', () => S.newTab(''), count, 'New tab');
      const boxes = cur ? h('div', { class: 'cs-nboxes', role: 'tabpanel' },
        cur.boxes.map((b) => noteBox(b, cur)),
        h('button', { type: 'button', class: 'cs-nadd cs-addbox', onclick: () => change(null, () => { cur.boxes.push(S.newNoteBox()); }) }, '+ Box')) : null;
      if (focusNote) {
        const id = focusNote;
        focusNote = null;
        setTimeout(() => { const t = document.querySelector(`[data-note="${id}"] textarea`); if (t) t.focus(); }, 0);
      }
      return h('section', { class: 'cs-notes' }, strip, boxes);
    }
    return { render };
  };
})();
```

- [ ] **Step 2: Edit `character-sheet/ui.js` — header, state, sync, undo**

Replace lines 1–4 (the top comment) with:

```js
// Character Sheet: the page. Draws the sheet from the character (sheet.js has the rules, notes.js
// draws the notes) and saves every change to this browser's localStorage.
// Two modes: playing (fill it in) and Edit layout (every box gets a × and a grip, labels become
// fields, each list ends with a + button). Every removal can be undone (toast or Ctrl+Z).
```

Replace lines 16–18:

```js
  let editing = false; // Edit layout
  const openEntries = new Set();
  let derived = []; // redraws numbers that follow the stats (skills, Initiative)
```

with:

```js
  let editing = false; // Edit layout
  let printing = false; // drawing for Print: every note open, as plain text
```

Replace line 207:

```js
        if (s.id !== was) { history = []; openEntries.clear(); }
```

with:

```js
        if (s.id !== was) history = [];
```

Delete line 224:

```js
  const refresh = () => derived.forEach((f) => f());
```

Replace the undo block (lines 226–246, from `// --- Undo ---` through the end of `function undo() { … }`) with:

```js
  // --- Undo -------------------------------------------------------------------------
  // Structural changes (remove, delete, add, move, Reset) go through change(): one snapshot each.
  // A layout snapshot brings back the earlier layout and keeps typing done since; a full one
  // (Reset) brings back everything.
  let history = [];
  let toastTimer = null;
  function change(label, fn, full = false) {
    history.push({ json: JSON.stringify(s), full });
    if (history.length > 60) history.shift();
    fn();
    commit();
    render();
    if (label) toast(label);
  }
  function undo() {
    const prev = history.pop();
    if (!prev) return;
    const was = JSON.parse(prev.json);
    s = S.normalize(prev.full ? was : S.undoLayout(was, s));
    all.chars[s.id] = s;
    commit();
    render();
    hideToast();
  }
```

In `ICON` (lines 34–40), add a heart after `undo:`:

```js
    heart: 'M12 21s-7.5-4.6-9.8-9.3C.6 8.3 2.7 4.5 6.4 4.5c2.3 0 4 1.3 5.6 3.3 1.6-2 3.3-3.3 5.6-3.3 3.7 0 5.8 3.8 4.2 7.2C19.5 16.4 12 21 12 21z',
```

- [ ] **Step 3: Edit `character-sheet/ui.js` — replace the sheet drawing**

Line numbers shift as you edit, so go by content. First copy the current `let renaming = null;` and `function tabStrip(k, pick, make, count, label) { … }` (originally lines 611–655) somewhere safe. Then replace everything from the line `  // --- Inputs ---…` through the closing `}` of `function render() { … }` (the line just before `  document.addEventListener('keydown', (ev) => {` / `if (ev.key === 'Escape' && editing …`) with the block below, pasting the saved `tabStrip` where marked, unchanged.

```js
  // --- Inputs -----------------------------------------------------------------------
  // Every box holds the text typed into it. ↑ / ↓ step a whole number by 1 (Shift: 5).
  function stepper(inp, onStep) {
    inp.addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
      const v = S.step(inp.value, (ev.key === 'ArrowUp' ? 1 : -1) * (ev.shiftKey ? 5 : 1));
      if (v === inp.value) return;
      ev.preventDefault();
      inp.value = v;
      onStep(v);
    });
  }
  function field(obj, key, label, cls = '', opts = {}) {
    const inp = h('input', { class: 'cs-in ' + cls, value: obj[key], 'aria-label': label, spellcheck: false, inputMode: 'text',
      onkeydown: (ev) => { if (ev.key === 'Enter') inp.blur(); } });
    inp.addEventListener('input', () => { obj[key] = inp.value; commit(); if (opts.after) opts.after(); });
    if (opts.step) stepper(inp, (v) => { obj[key] = v; commit(); });
    return inp;
  }
  // A box's name: plain text when playing, typed in Edit layout.
  function label(obj, key, fallback, cls) {
    if (!editing) return h('span', { class: cls }, obj[key] || fallback);
    return h('input', { class: `${cls} cs-lbl-in`, value: obj[key], placeholder: fallback, 'aria-label': 'Name', spellcheck: false,
      oninput: (ev) => { obj[key] = ev.target.value; commit(); },
      onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } });
  }

  // --- Edit layout ----------------------------------------------------------------------
  // Drag to reorder: the grip starts it, items in the same list accept the drop.
  let dragKind = null;
  function draggable(grip, node, kind, i, onMove) {
    grip.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('text/plain', `${kind}|${i}`); ev.dataTransfer.effectAllowed = 'move'; node.classList.add('dragging'); dragKind = kind; });
    grip.addEventListener('dragend', () => { node.classList.remove('dragging'); dragKind = null; });
    node.addEventListener('dragover', (ev) => { if (dragKind === kind) { ev.preventDefault(); node.classList.add('drop'); } });
    node.addEventListener('dragleave', () => node.classList.remove('drop'));
    node.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const [k, n] = ev.dataTransfer.getData('text/plain').split('|');
      const from = parseInt(n, 10);
      if (k === kind && Number.isFinite(from) && from !== i) onMove(from, i);
      else render();
    });
  }
  // In Edit layout every box (defaults too) gets a × (with Undo) and a grip to drag it in its list.
  function editable(key, i, name, node) {
    node.classList.add('cs-box');
    node.dataset.box = s[key][i].id;
    if (!editing) return node;
    const grip = h('span', { class: 'cs-grip', title: 'Drag to move', draggable: 'true' }, icon('grip', 'cs-ic sm'));
    node.append(grip, h('button', { type: 'button', class: 'cs-x', title: 'Remove', 'aria-label': `Remove ${name}`,
      onclick: () => change(`Removed ${name}`, () => { s[key] = s[key].filter((_, j) => j !== i); }) }, icon('close', 'cs-ic xs')));
    draggable(grip, node, 'box-' + key, i, (from, to) => change(null, () => { s[key] = S.move(s[key], from, to); }));
    return node;
  }
  // Each list ends with a dashed + button in Edit layout while there's room: "+ Stat (6/12)".
  const ADD = { details: 'Detail', pairs: 'Current / Max', boxes: 'Box', stats: 'Stat', skills: 'Skill' };
  const MAKE = { details: S.newDetail, pairs: () => S.newPair(), boxes: () => S.newBox(), stats: S.newStat, skills: S.newSkill };
  const adding = (key) => editing && S.canAdd(s, key);
  function addButton(key, cls = '') {
    if (!adding(key)) return null;
    return h('button', { type: 'button', class: 'cs-add ' + cls, onclick: () => {
      const b = MAKE[key]('');
      change(null, () => { s[key].push(b); });
      setTimeout(() => { const n = document.querySelector(`[data-box="${b.id}"] .cs-lbl-in`); if (n) n.focus(); }, 0);
    } }, `+ ${ADD[key]} (${s[key].length}/${S.CAPS[key]})`);
  }
  // Even rows (Sheet.columns): the column counts ride on CSS variables; phones use --cols-sm.
  function grid(cls, key, kids) {
    const n = s[key].length + (adding(key) && key !== 'stats' ? 1 : 0);
    return h('div', { class: cls, style: `--cols: ${S.columns(n, S.PER_ROW[key])}; --cols-sm: ${S.columns(n, 3)}` }, kids);
  }

  // --- The top section ------------------------------------------------------------------
  // The name, with the details (Hit Die, Level…) beside it.
  function header() {
    const details = s.details.map((d, i) => editable('details', i, d.label || 'detail',
      h('label', { class: 'cs-detail' }, label(d, 'label', 'Detail', 'cs-dlab'), field(d, 'value', d.label || 'Detail', 'cs-dval', { step: true }))));
    return h('div', { class: 'cs-head' },
      field(s, 'name', 'Character name', 'cs-name', { after: names }),
      h('div', { class: 'cs-details' }, details, addButton('details', 'sm')));
  }
  // Current / Max: two numbers split by a slanted line. The HP pair has the heart.
  function pair(p, i) {
    const name = p.label || 'Current';
    return editable('pairs', i, name, h('div', { class: 'cs-pair' },
      h('div', { class: 'cs-split' }, field(p, 'cur', name, 'cs-num', { step: true }), field(p, 'max', p.maxLabel || 'Max', 'cs-num', { step: true })),
      h('div', { class: 'cs-labs' }, label(p, 'label', 'Current', 'cs-lab'), label(p, 'maxLabel', 'Max', 'cs-lab')),
      p.hp ? icon('heart', 'cs-heart') : null));
  }
  // A small box (Temp HP, Armor, Initiative…): one number. Armor sits in the shield.
  function small(b, i) {
    const name = b.label || 'Box';
    const num = field(b, 'value', name, 'cs-num', { step: true });
    return editable('boxes', i, name, h('div', { class: 'cs-small' + (b.shield ? ' armor' : '') },
      b.shield ? h('div', { class: 'cs-shield' }, shield(), num) : num,
      label(b, 'label', 'Box', 'cs-lab')));
  }
  // Wounds: five circles and the skull (click to fill up to there), then 3 dashed extras.
  function wounds() {
    const dots = [];
    for (let i = 0; i < S.WOUNDS; i++) {
      const on = i < s.wounds;
      const skull = i === S.WOUNDS - 1;
      dots.push(h('button', { type: 'button', class: 'cs-w' + (on ? ' on' : '') + (skull ? ' skull' : ''), 'aria-pressed': String(on),
        'aria-label': `Wound ${i + 1}`, onclick: () => { s.wounds = S.setWounds(s.wounds, i); commit(); render(); } },
      skull ? icon('skull', 'cs-ic') : null));
    }
    const extra = s.woundMarks.map((m, i) => h('button', { type: 'button', class: 'cs-w extra' + (m ? ' on' : ''), 'aria-pressed': String(m),
      'aria-label': `Extra wound ${i + 1}`, onclick: () => { s.woundMarks[i] = !m; commit(); render(); } }));
    return h('div', { class: 'cs-wounds', role: 'group', 'aria-label': 'Wounds' }, h('div', { class: 'cs-track' }, dots), h('div', { class: 'cs-extra' }, extra));
  }
  // The save pip: ▲ advantage and ▼ disadvantage side by side, the one in use filled.
  function tri(up, on) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    n.setAttribute('viewBox', '0 0 20 18');
    n.setAttribute('class', 'cs-tri' + (on ? ' on' : ''));
    n.setAttribute('aria-hidden', 'true');
    n.innerHTML = `<path d="${up ? 'M10 2 18 16H2z' : 'M2 2h16L10 16z'}"/>`;
    return n;
  }
  function pip(st, name) {
    const lab = st.mode === 'adv' ? 'advantage' : st.mode === 'dis' ? 'disadvantage' : 'normal';
    return h('button', { type: 'button', class: 'cs-pip', title: `Save: ${lab}`, 'aria-label': `${name} save: ${lab}`,
      onclick: () => { st.mode = S.cycleSave(st.mode); commit(); render(); } }, tri(true, st.mode === 'adv'), tri(false, st.mode === 'dis'));
  }
  function stat(st, i) {
    const name = st.label || 'Stat';
    return editable('stats', i, name, h('div', { class: 'cs-stat' },
      pip(st, name), field(st, 'value', name, 'cs-num', { step: true }), label(st, 'label', 'Stat', 'cs-lab')));
  }
  function skill(k, i) {
    const name = k.label || 'Skill';
    return editable('skills', i, name, h('div', { class: 'cs-skill' },
      field(k, 'value', name, 'cs-num', { step: true }), label(k, 'label', 'Skill', 'cs-lab')));
  }
  // Vitals on the left (pairs, small boxes, wounds); stats and skills on the right.
  function top() {
    return h('section', { class: 'cs-top' },
      header(),
      h('div', { class: 'cs-cols' },
        h('div', { class: 'cs-panel cs-vitals' },
          h('div', { class: 'cs-pairs' }, s.pairs.map(pair), addButton('pairs', 'sm')),
          grid('cs-smalls', 'boxes', [s.boxes.map(small), addButton('boxes')]),
          wounds()),
        h('div', { class: 'cs-panel cs-abilities' },
          s.stats.length ? grid('cs-stats', 'stats', s.stats.map(stat)) : null,
          addButton('stats', 'sm'),
          grid('cs-skills', 'skills', [s.skills.map(skill), addButton('skills')]))));
  }

  // --- Tabs -------------------------------------------------------------------------
  // >>> Paste the saved `let renaming = null;` and `function tabStrip(k, pick, make, count, label) { … }`
  // >>> here exactly as they were.

  // The notes (notes.js) draw with these helpers.
  const notes = window.SheetNotes({
    h, icon, change, commit, tabStrip, render: () => render(),
    get s() { return s; }, get printing() { return printing; },
  });

  function render() {
    const sheet = $('sheet');
    sheet.classList.toggle('editing', editing);
    sheet.replaceChildren(top(), notes.render());
  }
```

When pasting `tabStrip`, delete the `>>>` marker lines. Its comment should read:

```js
  // Tabs, like a browser's: click to switch, + adds one, double-click a name to rename it,
  // × closes it (with Undo), drag a tab to move it. `k` names the list (`tabs`) and `pick` the
  // current one (`tab`); `count` shows a number on each tab.
```

- [ ] **Step 4: Edit `character-sheet/ui.js` — toolbar**

In `show(c)` delete the line `    openEntries.clear();`.

After the `$('copy')` handler, add:

```js
  // Reset: clear this character and start again from the default layout (Undo brings it back).
  $('reset').addEventListener('click', () => {
    closeMenu();
    if (!confirm('Clear this character and start again?')) return;
    change('Reset character', () => { s = S.reset(s); all.chars[s.id] = s; }, true);
  });
```

Replace the print handler line:

```js
  $('print').addEventListener('click', () => { closeMenu(); if (editing) setEditing(false); else render(); window.print(); });
```

with:

```js
  $('print').addEventListener('click', () => {
    closeMenu();
    printing = true;
    if (editing) setEditing(false); else render();
    window.print();
    printing = false;
    render();
  });
```

Then search the file: `grep -n "refresh\|derived\|openEntries\|S\.SECTIONS\|S\.STATS\|S\.SAVES\|S\.SKILLS\|applyMath\|parseModifier\|bloodied\|woundExtra\|woundsMax\|noteTabs" character-sheet/ui.js` must print nothing.

- [ ] **Step 5: Edit `character-sheet/index.html`**

Change `<body class="cs-desk">` to `<body class="cs-flat">`.

In the More menu, add before the Delete button:

```html
        <button type="button" id="reset">Reset character</button>
```

Replace the scripts at the end with:

```html
<script src="sheet.js"></script>
<script src="cloud.js"></script>
<script src="notes.js"></script>
<script src="ui.js"></script>
```

- [ ] **Step 6: Check it in the browser**

Run `npm test` (expected `ℹ fail 0`). Start the `chongkit-pages` preview (`.claude/launch.json`), open `http://localhost:8000/character-sheet/`, and check with the browser tools (styles come in Task 3, so judge structure, not looks):
- `read_console_messages` with `onlyErrors: true` → none.
- `javascript_tool`: `[document.querySelectorAll('.cs-stat').length, document.querySelectorAll('.cs-skill').length, document.querySelectorAll('.cs-small').length, document.querySelectorAll('.cs-w').length, document.querySelectorAll('.cs-tabbtn').length]` → `[6, 6, 3, 9, 3]`.
- Click Edit layout; `document.querySelectorAll('.cs-x').length` → `18` (details 2 + pair 1 + small boxes 3 + stats 6 + skills 6). Click `+ Stat` six times → 12 stats and no `+ Stat` button.
- Type `+2` in STR, press ↑ → `+3`; reload → still `+3`.
- Add a note `Fireball\n1d10`, fold it → `.cs-nline` text `Fireball.`.
- More → Reset character (accept) → 6 stats, STR empty; click Undo in the toast → 12 stats and `+3` back.

- [ ] **Step 7: Commit** (still local)

```bash
git add character-sheet/notes.js character-sheet/ui.js character-sheet/index.html
git commit -m "Character Sheet v4: top section of configurable boxes, notes in note boxes, Reset

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The flat look (sheet.css)

**Goal:** The sheet looks like the agreed prototype: flat whitish boxes, grey bands, top section above full-width notes, even rows, phone and print layouts.

**Files:**
- Modify (full rewrite): `character-sheet/sheet.css`

**Acceptance Criteria:**
- [ ] No `#e9e1d0`/parchment colours on the sheet: fields are white, outlines `#4a4a4a`, bands `#6f6f6f` (check computed styles of `.cs-lab` and `.cs-stat`).
- [ ] At 1440 px wide: vitals panel on the left (≤ 400 px), stats + skills on the right; notes below spanning the width and at least 70% of the viewport tall.
- [ ] 7 stats lay out 4 + 3; 18 skills 6 + 6 + 6 (check `getComputedStyle(...).gridTemplateColumns`).
- [ ] At 375 px wide: no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`), stats and skills in rows of up to 3.
- [ ] Toolbar, More menu, toast and sign-in dialog still styled (grey/white).

**Verify:** browser checks in Step 2; `npm test` → `ℹ fail 0`.

**Steps:**

- [ ] **Step 1: Replace `character-sheet/sheet.css`** with:

```css
/* Character Sheet v4: flat, simple, whitish boxes (the table's choice; the rest of the site keeps the
   GM Guide look). White fields, thin grey outlines, flat grey label bands, near-square corners. The
   page overrides nimble.css's tokens so its notice, toolbar and buttons turn grey and white too. */
body.cs-flat {
  --parchment: #dcdcd8; --panel: #fbfbf9; --parchment-hi: #fff;
  --ink: #222; --ink-soft: #444; --muted: #777; --frame: #4a4a4a;
  --rule: #b5b5b0; --bar: #e6e6e2; --bar-dark: #d0d0cb;
  --band: #6f6f6f; --band-t: #fff; --well: #ededeb; --edge: #bdbdb8; --fill: #1c1c1c;
  background: var(--parchment); background-image: none;
}
html:has(body.cs-flat) { background: #dcdcd8; }
main.cs-page { max-width: 1760px; padding: 12px 20px 20px; }
.cs-page .notice { margin-bottom: 10px; padding: 5px 12px; font-size: .8rem; }
.cs-page .foot { margin-top: 14px; font-size: .78rem; }
.cs-tools .back { margin: 0 6px 0 0; }

/* Toolbar */
.cs-tools { position: relative; margin: 0 0 12px; align-items: center; }
.cs-tools select { min-width: 210px; }
.btn[aria-pressed="true"] { background: var(--ink); color: var(--parchment-hi); }
.cs-menu { position: relative; }
.cs-menu > summary { list-style: none; cursor: pointer; }
.cs-menu > summary::-webkit-details-marker { display: none; }
.cs-menu > summary::after { content: " ▾"; font-size: .8em; }
.cs-menu[open] > summary { background: var(--bar); }
.cs-menu-list {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 30; min-width: 190px; display: flex; flex-direction: column;
  background: var(--parchment-hi); border: 1.5px solid var(--ink); box-shadow: 0 8px 20px rgba(0, 0, 0, .18);
}
.cs-menu-list button { padding: 9px 14px; border: 0; border-bottom: 1px solid var(--bar-dark); background: transparent; text-align: left; font: 500 1rem var(--body); color: var(--ink); cursor: pointer; }
.cs-menu-list button:last-child { border-bottom: 0; }
.cs-menu-list button:hover { background: var(--bar); }
.cs-menu-list .danger { color: var(--blood); }
.cs-saved { margin-left: auto; font-style: italic; color: var(--muted); opacity: 0; transition: opacity .3s; }
.cs-saved.show { opacity: 1; }
.cs-saved.bad { color: var(--blood); opacity: 1; }

/* Undo toast */
.cs-toast {
  position: fixed; left: 50%; bottom: 22px; z-index: 50; transform: translateX(-50%); display: flex; align-items: center; gap: 14px;
  padding: 8px 8px 8px 16px; background: #2e2f31; color: #fff; font: 500 16px var(--body); box-shadow: 0 8px 24px rgba(0, 0, 0, .3);
}
.cs-toast[hidden] { display: none; }
.cs-undo {
  display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border: 1.5px solid rgba(255, 255, 255, .5);
  background: transparent; color: #fff; font: 700 15px var(--body); text-transform: uppercase; cursor: pointer;
}
.cs-undo:hover { background: rgba(255, 255, 255, .12); }

/* The sheet: the top section and the notes, each a white card */
.cs { display: flex; flex-direction: column; gap: 18px; color: var(--ink); font-family: var(--body); }
.cs-top, .cs-notes { background: var(--panel); border: 1px solid var(--edge); padding: 20px 22px 22px; box-shadow: 0 2px 8px rgba(0, 0, 0, .08); }
.cs-ic { width: 20px; height: 20px; flex: none; }
.cs-ic.sm { width: 16px; height: 16px; }
.cs-ic.xs { width: 13px; height: 13px; }

/* Fields */
.cs-in { min-width: 0; border: 0; background: transparent; color: var(--ink); font: inherit; }
.cs-in:focus, .cs-lbl-in:focus { outline: 2px solid var(--rule); outline-offset: -2px; }
.cs-num { flex: 1; width: 100%; min-height: 64px; padding: 0; text-align: center; font: 700 34px var(--body); }

/* Name and details */
.cs-head { display: flex; flex-wrap: wrap; align-items: end; gap: 8px 18px; margin-bottom: 12px; }
.cs-name { flex: 1 1 320px; padding: 2px 4px; border-bottom: 2px solid var(--frame); font: 800 26px var(--body); }
.cs-details { display: flex; flex-wrap: wrap; align-items: end; gap: 8px 18px; }
.cs-detail { position: relative; display: flex; align-items: end; gap: 6px; font: 800 15px var(--body); text-transform: uppercase; white-space: nowrap; }
.cs-dval { width: 64px; border-bottom: 1.5px solid var(--frame); text-align: center; font: 700 18px var(--body); text-transform: none; }
.cs-dlab.cs-lbl-in { width: 90px; border: 0; border-bottom: 1.5px dashed var(--rule); background: transparent; font: inherit; text-transform: uppercase; }
.cs-detail .cs-x, .cs-detail .cs-grip { position: static; }

/* Two panels: vitals on the left, stats and skills on the right */
.cs-cols { display: grid; grid-template-columns: minmax(330px, 400px) minmax(0, 1fr); gap: 14px; }
.cs-panel { display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: 14px; background: var(--well); border-radius: 4px; }

/* A box: a white field in a grey outline, its label on a band along the bottom */
.cs-pair, .cs-small, .cs-skill { position: relative; display: flex; flex-direction: column; min-width: 0; border: 2px solid var(--frame); border-radius: 3px; background: #fff; }
.cs-lab { display: block; padding: 3px 4px; background: var(--band); color: var(--band-t); font: 700 14px var(--body); letter-spacing: .04em; text-align: center; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
input.cs-lab { width: 100%; min-width: 0; border: 0; border-top: 1.5px dashed var(--band-t); }
input.cs-lab::placeholder { color: rgba(255, 255, 255, .6); }

/* Current / Max: two numbers split by a slanted line; the HP pair has the heart */
.cs-pairs { display: flex; flex-direction: column; gap: 10px; }
.cs-split { position: relative; flex: 1; display: grid; grid-template-columns: 1fr 1fr; min-height: 108px; }
.cs-split::after { content: ""; position: absolute; left: 50%; top: -2px; bottom: -2px; width: 3px; background: var(--frame); transform: skewX(-10deg); }
.cs-split .cs-num { font-size: 42px; }
.cs-labs { display: grid; grid-template-columns: 1fr 1fr; }
.cs-heart { position: absolute; z-index: 2; top: -13px; right: 12px; width: 30px; height: 30px; color: var(--frame); pointer-events: none; }

/* Even rows: the column count comes from the page (Sheet.columns) */
.cs-smalls, .cs-stats, .cs-skills { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 10px; }

/* Small boxes (Temp HP, Armor, Initiative…) */
.cs-small .cs-num { min-height: 70px; }
.cs-shield { position: relative; flex: 1; display: grid; place-items: center; min-height: 70px; }
.cs-shield svg { position: absolute; top: 6%; height: 88%; width: auto; color: var(--frame); }
.cs-shield .cs-num { position: relative; z-index: 1; min-height: 0; padding-bottom: 6px; font-size: 28px; }

/* Wounds: five circles and the skull on a band, then 3 dashed extras */
.cs-wounds { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; }
.cs-track { display: flex; gap: 12px; padding: 5px 16px; background: var(--band); border-radius: 4px; }
.cs-extra { display: flex; gap: 8px; }
.cs-w { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 2.5px solid var(--frame); border-radius: 50%; background: #fff; color: var(--frame); cursor: pointer; }
.cs-w .cs-ic { width: 18px; height: 18px; }
.cs-w.on { background: var(--fill); }
.cs-w.on .cs-ic { color: #fff; }
.cs-w.extra { border-style: dashed; border-color: var(--muted); background: transparent; }
.cs-w.extra.on { border-style: solid; border-color: var(--frame); background: var(--fill); }

/* Stats share one frame (the frame shows through the gaps as dividers); each has its save pip on top */
.cs-stats { gap: 2px; background: var(--frame); border: 2px solid var(--frame); border-radius: 3px; overflow: hidden; }
.cs-stat { position: relative; display: flex; flex-direction: column; min-width: 0; background: #fff; }
.cs-stat .cs-num { min-height: 62px; font-size: 36px; }
.cs-pip { display: flex; justify-content: center; gap: 2px; margin: 5px auto 0; padding: 0 2px; border: 0; background: transparent; color: var(--frame); cursor: pointer; }
.cs-tri { width: 20px; height: 18px; }
.cs-tri path { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linejoin: round; }
.cs-tri.on path { fill: currentColor; }
.cs-skill .cs-num { min-height: 52px; font-size: 28px; }
.cs-skill .cs-lab { font-size: 13px; }

/* Edit layout: × removes a box, the grip drags it, dashed buttons add more */
.cs-x, .cs-grip { position: absolute; top: 3px; z-index: 3; display: grid; place-items: center; width: 22px; height: 22px; padding: 0; }
.cs-x { right: 3px; border: 1.5px solid var(--frame); background: #fff; color: var(--frame); cursor: pointer; }
.cs-grip { left: 3px; color: var(--muted); cursor: grab; }
.cs-box.dragging, .cs-note.dragging, .cs-tab.dragging { opacity: .4; }
.cs-box.drop, .cs-tab.drop { outline: 2px dashed var(--frame); outline-offset: 2px; }
.cs-add { min-height: 60px; border: 2.5px dashed var(--muted); border-radius: 3px; background: transparent; color: var(--muted); font: 700 15px var(--body); text-transform: uppercase; cursor: pointer; }
.cs-add:hover { border-color: var(--frame); color: var(--frame); }
.cs-add.sm { min-height: 0; padding: 6px 10px; }

/* Notes: tabs over note boxes that fill as many columns as fit */
.cs-notes { display: flex; flex-direction: column; gap: 12px; min-height: 70vh; }
.cs-tabstrip { display: flex; flex-wrap: wrap; align-items: end; border-bottom: 3px solid var(--frame); }
.cs-tab { display: flex; align-items: center; margin-right: -2px; border: 2px solid var(--frame); border-bottom: 0; background: var(--well); }
.cs-tab.on { background: var(--frame); color: #fff; }
.cs-tabbtn { padding: 6px 4px 6px 14px; border: 0; background: transparent; color: inherit; font: 700 15px var(--body); text-transform: uppercase; cursor: pointer; }
.cs-tabn { margin-left: 6px; font-weight: 500; opacity: .7; }
.cs-tdel { display: grid; place-items: center; width: 26px; height: 30px; padding: 0; border: 0; background: transparent; color: inherit; opacity: .7; cursor: pointer; }
.cs-tdel:hover { opacity: 1; }
.cs-tname { margin: 4px 0 4px 8px; padding: 2px 4px; border: 1.5px solid var(--frame); font: 700 15px var(--body); text-transform: uppercase; }
.cs-tabadd { min-width: 38px; padding: 6px 12px; border: 2px dashed var(--frame); border-bottom: 0; background: transparent; font: 700 15px var(--body); cursor: pointer; }
.cs-nboxes { columns: 300px; column-gap: 14px; }
.cs-nbox { break-inside: avoid; margin-bottom: 14px; border: 2px solid var(--frame); border-radius: 3px; background: var(--well); overflow: hidden; }
.cs-nbox.drop { outline: 2px dashed var(--frame); outline-offset: -4px; }
.cs-nhead { display: grid; grid-template-columns: 34px minmax(0, 1fr) 34px; align-items: center; background: var(--band); color: var(--band-t); }
.cs-ntitle { min-width: 0; padding: 6px 2px; border: 0; background: transparent; color: var(--band-t); font: 800 16px var(--body); letter-spacing: .04em; text-transform: uppercase; }
.cs-ntitle:focus { outline: 1.5px dashed var(--band-t); }
.cs-nfold, .cs-ndel { display: grid; place-items: center; height: 32px; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; }
.cs-nfold .cs-ic { transition: transform .15s; }
.cs-nfold[aria-expanded="true"] .cs-ic { transform: rotate(90deg); }
.cs-nlist { display: flex; flex-direction: column; gap: 6px; padding: 8px; }
.cs-note { display: grid; grid-template-columns: 18px 24px minmax(0, 1fr) 26px; align-items: start; border: 2px solid var(--frame); border-radius: 3px; background: #fff; }
.cs-note.drop { box-shadow: 0 -3px 0 var(--frame); }
.cs-note .cs-grip { position: static; width: 18px; height: 32px; }
.cs-note .cs-nfold { color: var(--frame); }
.cs-note .cs-ndel { color: var(--muted); }
.cs-ntext { display: block; width: 100%; min-height: 32px; padding: 6px 2px; border: 0; background: transparent; resize: none; overflow: hidden; font: 500 16px/1.35 var(--body); color: var(--ink); }
.cs-ntext:focus { outline: none; }
.cs-nline { min-width: 0; padding: 6px 2px; border: 0; background: transparent; font: 700 16px/1.35 var(--body); color: var(--ink); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.cs-nprint { padding: 6px 2px; white-space: pre-wrap; font: 500 15px/1.35 var(--body); }
.cs-nadd { padding: 5px; border: 2px dashed var(--muted); border-radius: 3px; background: transparent; color: var(--muted); font: 700 14px var(--body); text-transform: uppercase; cursor: pointer; }
.cs-nadd:hover { border-color: var(--frame); color: var(--frame); }
.cs-addbox { width: 100%; min-height: 90px; break-inside: avoid; }

/* Narrow windows and phones */
@media (max-width: 900px) { .cs-cols { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 620px) {
  main.cs-page { padding: 10px 10px 16px; }
  .cs-top, .cs-notes { padding: 14px 10px; }
  .cs-stats, .cs-skills { grid-template-columns: repeat(var(--cols-sm), minmax(0, 1fr)); }
  .cs-track { gap: 6px; padding: 5px 10px; }
  .cs-nboxes { columns: 1; }
}

/* Sign-in dialog */
.cs-dialog {
  width: min(420px, calc(100vw - 32px)); padding: 26px 26px 22px; border: 1.5px solid var(--frame); border-radius: 4px;
  background: var(--panel); color: var(--ink); font-family: var(--body); box-shadow: 0 18px 50px rgba(0, 0, 0, .3);
}
.cs-dialog::backdrop { background: rgba(0, 0, 0, .4); }
.cs-dialog h2 { margin: 0 30px 16px 0; font-size: 1.6rem; overflow-wrap: anywhere; }
.cs-dlg-x { position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 34px; height: 34px; padding: 0; border: 0; background: transparent; color: var(--ink-soft); }
.cs-dlg-x:hover { background: var(--bar); }
.cs-discord { width: 100%; gap: 10px; display: inline-flex; align-items: center; justify-content: center; }
.cs-discord .cs-ic { width: 22px; height: 22px; }
.cs-or { display: flex; align-items: center; gap: 10px; margin: 16px 0 12px; color: var(--muted); font-style: italic; }
.cs-or::before, .cs-or::after { content: ""; flex: 1; height: 1px; background: var(--rule); }
.cs-auth-form { display: flex; flex-direction: column; gap: 12px; }
.cs-auth-form label { display: flex; flex-direction: column; gap: 3px; }
.cs-auth-in { height: 40px; padding: 0 10px; border: 1.5px solid var(--frame); border-radius: 0; background: var(--parchment-hi); font: 500 17px var(--body); color: var(--ink); }
.cs-auth-in:focus { outline: 2px solid var(--rule); outline-offset: 1px; }
.cs-auth-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.cs-auth-row .btn { flex: 1 1 auto; }
.cs-auth-sub { margin: -10px 0 14px; color: var(--muted); }
.cs-auth-msg { min-height: 1.4em; margin: 12px 0 0; color: var(--ink-soft); }
.cs-auth-msg.bad { color: var(--blood); font-weight: 600; }
.cs-check-row { display: flex; align-items: flex-start; gap: 8px; margin: 0 0 14px; cursor: pointer; }
.cs-check-row input { width: 18px; height: 18px; margin: 2px 0 0; flex: none; }
.cs-link { margin-top: 12px; padding: 0; border: 0; background: none; font: 600 15px var(--body); color: var(--ink-soft); text-decoration: underline; cursor: pointer; }
.cs-link.danger { color: var(--blood); }
#account { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Print: the top section on the first page, the open tab's notes after it, every note open */
@media print {
  .cs-tools, .notice, .cs-x, .cs-grip, .cs-add, .cs-toast, .cs-nadd, .cs-ndel, .cs-nfold, .cs-tabadd, .cs-tdel { display: none !important; }
  body.cs-flat, html:has(body.cs-flat) { background: #fff; }
  .cs-top, .cs-notes { min-height: 0; padding: 0; border: 0; box-shadow: none; }
  .cs-top { break-after: page; }
  .cs-note { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 2: Check it in the browser**

Reload `http://localhost:8000/character-sheet/` and check:
- `resize_window` 1440×1000, screenshot: vitals left, stats + skills right, notes below (compare with the prototype screenshots in the spec's conversation: flat white boxes, grey bands).
- `javascript_tool`: `[getComputedStyle(document.querySelector('.cs-lab')).backgroundColor, getComputedStyle(document.querySelector('.cs-stat')).backgroundColor, document.querySelector('.cs-notes').getBoundingClientRect().height >= innerHeight * 0.7]` → `['rgb(111, 111, 111)', 'rgb(255, 255, 255)', true]`.
- Edit layout, add one stat (7 stats): `getComputedStyle(document.querySelector('.cs-stats')).gridTemplateColumns.split(' ').length` → `4`.
- `resize_window` mobile (375): `document.documentElement.scrollWidth <= innerWidth` → `true`.
- Open More, open Sign in: styled, readable. Reset the viewport (`preset: desktop`).

- [ ] **Step 3: Commit** (still local)

```bash
git add character-sheet/sheet.css
git commit -m "Character Sheet v4: flat whitish look

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Docs, landing card, push

**Goal:** CLAUDE.md, README, TRACKER and the landing card describe Character Sheet v4; everything is pushed to `main`.

**Files:**
- Modify: `CLAUDE.md` (ground rule 4's "Easy on the eyes" bullet; Character Sheet rules 1–5; Layout)
- Modify: `README.md` (tools table row line 11; Character Sheet section lines 16–79)
- Modify: `TRACKER.md` (the 🚧 v4 entry)
- Modify: `index.html` (root: the Character Sheet card's `v3`)
- Modify: `docs/superpowers/specs/2026-10-09-character-sheet-v4-design.md` (Status line)

**Acceptance Criteria:**
- [ ] CLAUDE.md's Character Sheet rules describe the flat look, no automation, caps, Reset, notes and data v5 (no mention of parchment, `removed`, `extras`, saves section, calculator or Bloodied for the sheet).
- [ ] README's Character Sheet section describes v4 (no v1–v3 upgrade text, no calculator or skill-follows-stat text).
- [ ] The landing card and the README table say `v4`.
- [ ] TRACKER's v4 entry is ✅ with its items ticked.
- [ ] `git status` is clean except `.claude/launch.json`; `git log origin/main -1` is the docs commit.

**Verify:** `npm test` → `ℹ fail 0`; `git status -sb` → `## main...origin/main` (only ` M .claude/launch.json` if anything).

**Steps:**

- [ ] **Step 1: CLAUDE.md**

In ground rule 4, after the "Easy on the eyes" bullet's last sentence (`Red is for Bloodied and Deadly only.`) add: ` The Character Sheet has its own flat whitish look (see its section).`

Replace Character Sheet rules 1–5 (from `1. **The sheet is our table's sheet**` through the end of rule 5) with:

```markdown
1. **Its own flat look** (v4, the table's choice), not the GM Guide's parchment: simple whitish boxes.
   White fields, thin grey outlines (`#4a4a4a`), flat grey label bands with white caps text (`#6f6f6f`),
   near-square corners (3 px), a light grey page, no red on the sheet. `body.cs-flat` overrides
   `nimble.css`'s tokens; the notice and footer stay. The top section (name + details; Current / Max
   pairs, the HP pair with the ♥; small boxes, Armor in the shield; wounds = five circles + skull, then 3
   dashed extras; stats with ▲▽ save pips; skills) spans the width, and the notes span the width below it.
   Its own styles live in `character-sheet/sheet.css`.
2. **A sheet you write on.** It holds HP and Wounds on purpose, but nothing is automated: every box is the
   text typed into it. No dice, no calculator math, no Bloodied colour, nothing follows anything else.
   ↑/↓ step a whole number (`Sheet.step`).
3. **No GM Guide numbers:** the layout, the defaults and the caps are the table's choices; call them derived.
   Don't add class or ancestry data that isn't in the PDF.
4. **Configurable, with caps for looks:** details 6, Current / Max pairs 2, small boxes 6, stats 12, skills
   18 (`Sheet.CAPS`), laid out in even rows (`Sheet.columns`). In Edit layout every box (defaults too) gets
   a × and a grip, its label becomes a field, and each list ends with a dashed + button while there's room.
   More → Reset character brings back the defaults (`Sheet.reset`, undoable). Notes: tabs (`tabStrip`: +,
   double-click rename, ×, drag) → note boxes (CSS columns) → notes (free text; folded, a note shows its
   first line, `Sheet.noteTitle`; notes drag between boxes, `Sheet.moveNote`). Layout changes go through
   undo (`undoLayout` keeps typing done since).
5. Data version 5, saved in localStorage under `chongkit.sheets` (every character in one key). Older
   versions aren't upgraded: they open blank, keeping only id, owner and last edit. Logic lives in
   `sheet.js` (browser global `Sheet`, CommonJS for tests), covered by `tests/sheet.test.js`; the notes
   are drawn by `notes.js` (global `SheetNotes`, given `ui.js`'s helpers).
```

In Layout, under `character-sheet/`, change the `ui.js` line and add `notes.js`:

```
  ui.js                      Draws the top section and toolbar; saving, sync, undo; the sign-in dialog
  notes.js                   Draws the notes: tabs of note boxes holding foldable notes
```

and change the `sheet.js` line to `Pure logic: the v5 model, caps, even rows, notes, saving, import/export`.

- [ ] **Step 2: README.md**

Line 11 (tools table) becomes:

```markdown
| [Character Sheet](character-sheet/) | ✅ v4 | A character sheet in the browser: HP, small boxes, wounds, stats with save pips, skills, and tabs of note boxes; add, remove, rename and reorder any box; saves locally. |
```

Replace the Character Sheet section's text from `Characters saved by v1 move over…` (end of the first paragraph) through the end of the `**Derived, not from the GM Guide:**` paragraph so the section reads:

```markdown
**To use:** open the site and click **Character Sheet**, or open `character-sheet/index.html` in any
browser. Everything saves in this browser as you type (localStorage), so it's there next time;
**Export** saves a character as a `.json` file and **Import** loads one back (handy for moving to
another device). The list at the top switches between characters and **New** starts one; **More** has
Copy, Export, Import, Print, Reset and Delete. Number boxes step with the ↑ / ↓ keys (Shift: by 5).
Characters saved before v4 open as a blank sheet.

(the **Accounts (optional)** paragraph and its bullets stay as they are)

It's a sheet you write on: every box holds what you type, and nothing is worked out for you (no math,
no skills following stats).

- **Top:** the name, with Hit Die and Level beside it. On the left: Current HP / Max HP (the heart),
  Temp HP, Armor (in the shield) and Initiative, and the wounds. On the right: the stats (STR, DEX, CON,
  INT, WIS, CHA), each with a save pip that cycles ▲ advantage / ▼ disadvantage / none, and the skills
  (Arcana, Examination, Influence, Insight, Perception, Stealth).
- **Wounds:** click a circle to fill it (black) up to there; click the last filled one to clear it. The
  skull is the last wound; the three dashed circles after it are extra wounds (each clicks on and off).
- **Notes** (below, full width): tabs like a browser's (click to switch, **+** adds one, double-click to
  rename, × closes it with Undo, drag to move). Each tab holds note boxes that arrange themselves in
  columns; give a box a title, **+ Note** adds a note, the chevron on its title folds or opens all its
  notes, × removes it (Undo). A note is free text: its first line is its name, and folded it shows just
  that line ("Fireball."). Drag a note by its grip to reorder it or move it to another box.
- **Edit layout** (toolbar): every box gets a × to remove it and a grip to drag it, labels can be
  renamed, and each list ends with a + button: up to 6 details, 2 Current / Max pairs, 6 small boxes,
  12 stats and 18 skills. Rows stay even (7 stats sit 4 + 3). **Done** (or Esc) goes back. Removing
  anything shows **Undo** (Ctrl+Z works too).
- **Reset character** (More) clears the character and brings back the default layout (Undo brings it
  back).

**Derived, not from the GM Guide:** the sheet's layout, defaults, caps and the six-wound track are our
table's choices; the GM Guide has no character rules. Ancestry and Class data isn't in the GM Guide, so
there's nothing that fills a sheet in.
```

(Keep the existing Accounts paragraph and bullets in place where shown; delete the old `- **Details:** …` through `- **Notes:** …` bullets.)

- [ ] **Step 3: Root `index.html`** — in the Character Sheet card, change `<span class="lvl">v3</span>` to `<span class="lvl">v4</span>` and replace

```html
      <div class="line">Six stats, saves, skills, Hit Points, Wounds, tabs of entries and notes.
        Skills follow their stat, HP boxes do the math, and everything saves in your browser.</div>
```

with

```html
      <div class="line">Hit Points, Wounds, stats with save pips, skills, and tabs of note boxes.
        A sheet you write on: nothing is worked out for you, and everything saves in your browser.</div>
```

- [ ] **Step 4: TRACKER.md** — replace the 🚧 v4 entry with:

```markdown
### ✅ v4 — done (flat boxes on top, notes below; spec: `docs/superpowers/specs/2026-10-09-character-sheet-v4-design.md`)
- [x] Flat whitish look (white fields, grey outlines and bands, near-square corners)
- [x] Top section: details, Current / Max pairs (♥ on HP), small boxes (Armor shield), wounds + 3 extras, stats with save pips, skills
- [x] Caps for looks (details 6, pairs 2, small boxes 6, stats 12, skills 18), even rows, every box removable / renamable / draggable
- [x] Notes: tabs → note boxes (auto columns) → notes that fold to their first line; drag notes between boxes
- [x] Reset character (back to the defaults, undoable); no automation (no math, no Bloodied, nothing derived)
- [x] Data version 5; older saves open blank
- [x] Tests: defaults, normalize, caps, columns, noteTitle, moveNote, step, reset, undo, saving, sync
```

- [ ] **Step 5: Spec status** — in the spec's first lines change `Status: **draft, for review**` to `Status: **built** (v4)`.

- [ ] **Step 6: Clean up the prototype server entry** — stop the `sheet-prototype` preview if it is running, then restore the file: `git checkout .claude/launch.json`.

- [ ] **Step 7: Test, commit, push**

```bash
npm test
git add CLAUDE.md README.md TRACKER.md index.html docs/superpowers/specs/2026-10-09-character-sheet-v4-design.md
git commit -m "Character Sheet v4: docs, tracker, landing card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git pull --rebase origin main
git push origin main
```

Expected: tests pass (`ℹ fail 0`, Chong Die `196 passed`), push succeeds, `git status -sb` shows `## main...origin/main`.
