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
  assert.deepStrictEqual(s.pairs.map((p) => [p.label, p.maxLabel]), [['Current HP', 'Max HP']]);
  assert.deepStrictEqual(labels(s.boxes), ['Temp HP', 'Armor', 'Initiative']);
  assert.deepStrictEqual(labels(s.stats), ['STR', 'DEX', 'INT', 'WIL']);
  assert.deepStrictEqual(s.stats[0], { id: s.stats[0].id, label: 'STR', value: '', mode: '' });
  assert.deepStrictEqual(labels(s.skills), ['Arcana', 'Examination', 'Finesse', 'Influence', 'Insight', 'Lore', 'Might', 'Naturecraft', 'Perception', 'Stealth']);
  assert.strictEqual(s.wounds, 0);
  assert.deepStrictEqual(s.woundMarks, [false, false, false]);
  assert.deepStrictEqual(s.tabs.map((t) => t.name), ['Actions']);
  assert.strictEqual(s.tabs[0].boxes.length, 4);
  assert.ok(s.tabs[0].boxes.every((b) => b.notes.length === 0));
  assert.strictEqual(S.newTab('Spells').boxes.length, 4, 'a new tab starts with four boxes');
  assert.strictEqual(s.tab, s.tabs[0].id);
  assert.strictEqual(s.updated, 0);
  const ids = [s.details, s.pairs, s.boxes, s.stats, s.skills, s.tabs].flat().map((x) => x.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'every box has its own id');
});

test('older saves open as a blank sheet that keeps its id, owner and last edit', () => {
  const s = S.normalize({ v: 4, id: 'old1', owner: 'me', updated: 500, name: 'Bryn', stats: { str: { val: 3 } } });
  assert.strictEqual(s.v, 5);
  assert.deepStrictEqual([s.id, s.owner, s.updated, s.name], ['old1', 'me', 500, '']);
  assert.deepStrictEqual(labels(s.stats), ['STR', 'DEX', 'INT', 'WIL']);
  assert.strictEqual(s.stats[0].value, '');
  assert.strictEqual(S.normalize(null).v, 5);
  assert.strictEqual(S.normalize('x').v, 5);
});

test('normalize keeps a v5 sheet and cleans it up', () => {
  const s = S.blank('Bryn');
  s.stats[0].value = '+2';
  s.stats[0].mode = 'adv';
  s.pairs.push(S.newPair('Mana', 'Max Mana'));
  s.tabs[0].boxes[2].notes.push(S.newNote('Fireball', '1d10', true));
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
  assert.deepStrictEqual(odd.tabs[0].boxes[0].notes.map((n) => [n.name, n.text, n.folded]), [['n', '', true]]);
  assert.strictEqual(odd.tabs[0].boxes.length, 4, 'missing boxes are added');
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

test('notes: a name and a description; four boxes per tab', () => {
  const n = S.newNote('Fireball', '1d10 ranged spell attack.\n120ft.');
  assert.deepStrictEqual([n.name, n.text, n.folded], ['Fireball', '1d10 ranged spell attack.\n120ft.', false]);
  const tab = (boxes) => S.normalize({ v: 5, tabs: [{ id: 't', name: 'A', boxes }] }).tabs[0];
  const old = tab([{ notes: [{ text: '  Fireball \n1d10\n120ft.' }, { text: '' }] }]);
  assert.deepStrictEqual(old.boxes[0].notes.map((x) => [x.name, x.text]), [['Fireball', '1d10\n120ft.'], ['', '']], 'older notes: first line is the name');
  const many = tab([1, 2, 3, 4, 5, 6].map((i) => ({ title: 'B' + i, notes: [{ name: 'n' + i, text: '' }] })));
  assert.deepStrictEqual(many.boxes.map((x) => x.title), ['B1', 'B2', 'B3', 'B4']);
  assert.deepStrictEqual(many.boxes[3].notes.map((x) => x.name), ['n4', 'n5', 'n6'], 'notes past the fourth box move into it');
});

test('note boxes swap places', () => {
  const boxes = ['A', 'B', 'C', 'D'].map((id) => ({ id, title: id, notes: [] }));
  const ids = (bs) => bs.map((x) => x.id).join('');
  assert.strictEqual(ids(S.swapBoxes(boxes, 0, 3)), 'DBCA');
  assert.strictEqual(ids(S.swapBoxes(boxes, 1, 1)), 'ABCD');
  assert.strictEqual(ids(S.swapBoxes(boxes, 0, 9)), 'ABCD');
  assert.strictEqual(ids(boxes), 'ABCD', 'the original is untouched');
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
  s.tabs.push(S.newTab('Spells'));
  const r = S.reset(s);
  assert.deepStrictEqual([r.id, r.owner, r.updated, r.name, r.wounds], ['c1', 'me', 900, '', 0]);
  assert.deepStrictEqual(labels(r.stats), ['STR', 'DEX', 'INT', 'WIL']);
  assert.deepStrictEqual(r.tabs.map((t) => t.name), ['Actions']);
  assert.strictEqual(r.tabs[0].boxes[0].notes.length, 0);
  assert.strictEqual(r.skills.length, 10, 'Nimble\'s skills come back');
  assert.notStrictEqual(S.content(r), S.content(s));
});

test('undo brings back the layout but keeps what was typed since', () => {
  const before = S.blank();
  before.tabs[0].boxes[0].notes = [S.newNote('Bow'), S.newNote('Axe')];
  before.tabs[0].boxes[3].title = 'Spare';
  before.tabs.push(S.newTab('Spells'), S.newTab('Inventory'));
  const now = JSON.parse(JSON.stringify(before));
  now.stats = now.stats.slice(1); // STR removed
  now.stats[0].value = '+1'; // then DEX typed in
  now.skills.push(S.newSkill('Lore')); // a skill added
  now.name = 'Bryn';
  now.tabs[0].name = 'Attacks';
  now.tabs[0].boxes = S.swapBoxes(now.tabs[0].boxes, 0, 3); // boxes swapped
  now.tabs[0].boxes[3].notes = [{ ...now.tabs[0].boxes[3].notes[1], text: '1d8', folded: true }]; // Bow deleted, Axe typed
  now.tabs.splice(2, 1); // Inventory tab closed
  const u = S.undoLayout(before, now);
  assert.deepStrictEqual(labels(u.stats), ['STR', 'DEX', 'INT', 'WIL']);
  assert.strictEqual(u.stats[1].value, '+1');
  assert.strictEqual(u.skills.length, 10);
  assert.strictEqual(u.name, 'Bryn');
  assert.deepStrictEqual(u.tabs.map((t) => t.name), ['Attacks', 'Spells', 'Inventory']);
  assert.deepStrictEqual(u.tabs[0].boxes.map((x) => x.title), ['', '', '', 'Spare'], 'the swap is undone');
  assert.deepStrictEqual(u.tabs[0].boxes[0].notes.map((n) => [n.name, n.text, n.folded]), [['Bow', '', false], ['Axe', '1d8', true]]);
});

test('saving several characters; export and import', () => {
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
  const first = S.loadAll(storage);
  assert.strictEqual(Object.keys(first.chars).length, 1, 'starts with one blank character');
  const b = S.blank('Bryn');
  b.tabs[0].boxes[0].notes.push(S.newNote('Longbow', '+3'));
  first.chars[b.id] = b;
  first.current = b.id;
  assert.ok(S.saveAll(storage, first));
  const again = S.loadAll(storage);
  assert.strictEqual(again.current, b.id);
  assert.strictEqual(again.chars[b.id].name, 'Bryn');
  assert.strictEqual(again.chars[b.id].tabs[0].boxes[0].notes[0].text, '+3');
  const copy = S.importJson(S.exportJson(b));
  assert.strictEqual(copy.name, 'Bryn');
  assert.strictEqual(copy.tabs[0].boxes[0].notes[0].name, 'Longbow');
  assert.notStrictEqual(copy.id, b.id, 'an import never overwrites');
  assert.throws(() => S.importJson('{"name":"x"}'));
  assert.throws(() => S.importJson('nope'));
  assert.throws(() => S.importJson(JSON.stringify({ chongkitSheet: 4, v: 4, name: 'Old' })), /before Character Sheet v4/);
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
