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
  assert.deepStrictEqual([many.boxes[3].free, many.boxes[3].text, many.boxes[3].notes], [true, 'n4\n\nn5\n\nn6', []],
    'notes past the fourth box move into it, and the last box becomes the free one');
});

test('the free box: plain text, always last in a new tab, one per tab', () => {
  const t = S.newTab('Spells');
  assert.deepStrictEqual(t.boxes.map((b) => b.free), [false, false, false, true]);
  assert.deepStrictEqual([t.boxes[3].text, t.boxes[3].notes], ['', []]);
  const tab = (boxes) => S.normalize({ v: 5, tabs: [{ id: 't', name: 'A', boxes }] }).tabs[0];
  const noFree = tab([{}, {}, {}, { title: 'Gear', notes: [{ name: 'Rope', text: '50 ft' }, { name: 'Torch', text: '' }] }]);
  assert.deepStrictEqual([noFree.boxes[3].free, noFree.boxes[3].title, noFree.boxes[3].text], [true, 'Gear', 'Rope\n50 ft\n\nTorch'],
    'a tab saved before the free box turns its last box into one, its notes written out');
  const swapped = tab([{ free: true, text: 'Owe Mira 5 gp.' }, {}, {}, {}]);
  assert.deepStrictEqual(swapped.boxes.map((b) => b.free), [true, false, false, false], 'a free box keeps its place after a swap');
  assert.strictEqual(swapped.boxes[0].text, 'Owe Mira 5 gp.');
  const two = tab([{ free: true, text: 'one' }, { free: true, text: 'two' }, {}, {}]);
  assert.deepStrictEqual(two.boxes.map((b) => b.free), [true, false, false, false], 'only one free box');
  assert.deepStrictEqual(two.boxes[1].notes.map((n) => n.text), ['two'], 'the second one\'s text is kept as a note');
  const boxes = [{ id: 'A', free: false, notes: [{ ...S.newNote('a'), id: 'a' }] }, { id: 'F', free: true, notes: [], text: '' }];
  assert.deepStrictEqual(S.moveNote(boxes, 'A', 'a', 'F', null)[1].notes, [], 'notes can\'t be dropped into the free box');
});

test('when a character was last edited', () => {
  const now = Date.UTC(2026, 9, 9, 12);
  const ago = (ms) => S.edited(now - ms, now);
  assert.strictEqual(S.edited(0, now), 'Never edited');
  assert.strictEqual(S.edited(1, now), 'Never edited');
  assert.strictEqual(ago(20000), 'Edited just now');
  assert.strictEqual(ago(5 * 60000), 'Edited 5 min ago');
  assert.strictEqual(ago(3600000), 'Edited 1 hour ago');
  assert.strictEqual(ago(5 * 3600000), 'Edited 5 hours ago');
  assert.strictEqual(ago(30 * 3600000), 'Edited yesterday');
  assert.strictEqual(ago(4 * 86400000), 'Edited 4 days ago');
  assert.strictEqual(ago(60 * 86400000), 'Edited 2026-08-10');
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

test('campaign codes: six characters with no look-alikes, shown with a dash', () => {
  assert.strictEqual(S.formatCode('K7Q3MD'), 'K7Q-3MD');
  assert.strictEqual(S.parseCode('k7q-3md'), 'K7Q3MD');
  assert.strictEqual(S.parseCode(' K7Q 3MD '), 'K7Q3MD');
  assert.strictEqual(S.parseCode('K7Q3M'), null);
  assert.strictEqual(S.parseCode('K7Q3M0'), null, '0 is a look-alike');
  assert.strictEqual(S.parseCode(null), null);
});

test('REST paths: only your own characters; the campaign index; downloads by id', () => {
  assert.strictEqual(S.ownRowsPath('u-1'), 'character_sheets?select=id,data&user_id=eq.u-1');
  assert.strictEqual(S.CAMPAIGN_INDEX_PATH, 'character_sheets?select=id,user_id,campaign_id,updated_at&campaign_id=not.is.null');
  assert.strictEqual(S.campaignCharsPath(['u2/a', 'u3/b', 'u4/a']),
    'character_sheets?select=id,user_id,data&campaign_id=not.is.null&id=in.(a,b)');
  assert.strictEqual(S.campaignKey('u2', 'a'), 'u2/a');
});

const row = (user_id, id, campaign_id, updated_at) => ({ user_id, id, campaign_id, updated_at });
const cachedChars = () => ({
  'u2/a': { id: 'a', owner: 'u2', campaign: 'c1', updated: 't1', data: { name: 'Ilsa' } },
  'u3/b': { id: 'b', owner: 'u3', campaign: 'c1', updated: 't1', data: { name: 'Pockets' } },
  'u4/z': { id: 'z', owner: 'u4', campaign: 'c1', updated: 't1', data: { name: 'Gone' } },
});

test('campaign refresh: download only new or edited characters', () => {
  const cache = { campaigns: [], own: {}, chars: cachedChars() };
  const index = [row('me', 'm', 'c1', 't0'), row('u2', 'a', 'c1', 't1'), row('u3', 'b', 'c1', 't2'), row('u5', 'n', 'c2', 't1')];
  assert.deepStrictEqual(S.campaignDiff(cache, index, 'me'), { fetch: ['u3/b', 'u5/n'], gone: ['u4/z'] });
  assert.deepStrictEqual(S.campaignDiff(null, [row('u2', 'a', 'c1', 't1')], 'me'), { fetch: ['u2/a'], gone: [] });
});

test('campaign refresh: merge keeps unchanged copies, takes downloads, drops the gone, learns your own', () => {
  const cache = { campaigns: [], own: { old: 'c9' }, chars: cachedChars() };
  const campaigns = [{ id: 'c1', name: 'Iron Hills', code: 'K7Q3MD', campaign_members: [] }];
  const index = [row('me', 'm', 'c1', 't0'), row('u2', 'a', 'c2', 't1'), row('u3', 'b', 'c1', 't2'), row('u5', 'n', 'c2', 't1')];
  const fetched = [{ id: 'b', user_id: 'u3', data: { name: 'Pockets 2' } }, { id: 'n', user_id: 'u5', data: { name: 'New' } }];
  const m = S.campaignMerge(cache, campaigns, index, fetched, 'me');
  assert.strictEqual(m.campaigns, campaigns);
  assert.deepStrictEqual(m.own, { m: 'c1' });
  assert.deepStrictEqual(Object.keys(m.chars).sort(), ['u2/a', 'u3/b', 'u5/n']);
  assert.deepStrictEqual(m.chars['u2/a'], { id: 'a', owner: 'u2', campaign: 'c2', updated: 't1', data: { name: 'Ilsa' } }, 'moved campaign without an edit');
  assert.deepStrictEqual(m.chars['u3/b'], { id: 'b', owner: 'u3', campaign: 'c1', updated: 't2', data: { name: 'Pockets 2' } });
  assert.deepStrictEqual(m.chars['u5/n'], { id: 'n', owner: 'u5', campaign: 'c2', updated: 't1', data: { name: 'New' } });
  const missing = S.campaignMerge(null, [], [row('u6', 'q', 'c1', 't1')], [], 'me');
  assert.deepStrictEqual(missing.chars, {}, 'not downloaded yet: left for the next refresh');
});

test('campaign sections: by name; your cards first (this browser\'s copy), then friends by last edit', () => {
  const brakka = { ...S.blank('Brakka'), id: 'm', owner: 'me' };
  const local = { m: brakka, w: { ...S.blank('Wren'), id: 'w', owner: 'me' }, x: { ...S.blank('Theirs'), id: 'x', owner: 'other' } };
  const cache = {
    campaigns: [
      { id: 'c2', name: 'Saltmarsh', code: 'ABCDEF', campaign_members: [{ user_id: 'me', name: 'Sam' }] },
      { id: 'c1', name: 'Iron Hills', code: 'K7Q3MD', campaign_members: [{ user_id: 'me', name: 'Sam' }, { user_id: 'u2', name: 'Jo' }, { user_id: 'u3', name: 'Alex' }] },
    ],
    own: { m: 'c1', x: 'c1' },
    chars: {
      'u2/a': { id: 'a', owner: 'u2', campaign: 'c1', updated: 't1', data: { ...S.blank('Ilsa'), updated: 100 } },
      'u3/b': { id: 'b', owner: 'u3', campaign: 'c1', updated: 't2', data: { ...S.blank('Pockets'), updated: 200 } },
    },
  };
  const v = S.campaignView(cache, local, 'me');
  assert.deepStrictEqual(v.map((x) => x.name), ['Iron Hills', 'Saltmarsh']);
  const [iron, salt] = v;
  assert.deepStrictEqual([iron.id, iron.code, iron.players], ['c1', 'K7Q3MD', 3]);
  assert.deepStrictEqual(iron.cards.map((k) => [k.key, k.mine, k.player, k.char.name]),
    [['me/m', true, '', 'Brakka'], ['u3/b', false, 'Alex', 'Pockets'], ['u2/a', false, 'Jo', 'Ilsa']]);
  assert.strictEqual(iron.cards[0].char, brakka, 'your own card is your local copy');
  assert.strictEqual(iron.cards[1].char.id, 'b', 'a friend\'s character keeps its id');
  assert.strictEqual(iron.cards[1].updated, 't2');
  assert.deepStrictEqual(salt.cards, []);
  assert.deepStrictEqual(S.campaignView(null, local, 'me'), []);
});
