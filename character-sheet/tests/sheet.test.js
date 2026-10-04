// Run with: node --test character-sheet/tests
const test = require('node:test');
const assert = require('node:assert');
const S = require('../sheet.js');

test('a blank sheet has the default layout', () => {
  const s = S.blank();
  assert.deepStrictEqual(Object.keys(s.stats), ['str', 'dex', 'con', 'int', 'wis', 'cha']);
  assert.deepStrictEqual(s.stats.con, { val: 0, slot: '', key: false });
  assert.deepStrictEqual(Object.keys(s.saves), ['str', 'dex', 'wil']);
  assert.strictEqual(S.SKILLS.length, 10);
  assert.strictEqual(s.woundsMax, 6);
  assert.deepStrictEqual(s.removed, []);
  assert.deepStrictEqual(s.tabs.map((t) => t.name), ['Actions', 'Abilities', 'Inventory']);
  assert.strictEqual(s.tab, s.tabs[0].id);
  assert.deepStrictEqual(Object.values(s.extras).flat(), [], 'no added boxes to start');
  assert.strictEqual(s.woundExtra, false);
  assert.deepStrictEqual(s.woundMarks, [false, false, false, false, false]);
  assert.ok(!('entries' in s), 'notes are plain text');
});

test('skills and Initiative follow their stat', () => {
  const s = S.blank();
  s.stats.int.val = 2;
  s.stats.dex.val = 2;
  assert.strictEqual(S.skillTotal(s, 'arcana'), 2);
  assert.strictEqual(S.skillTotal(s, 'intimidation'), 0);
  s.skills.arcana = S.pointsFor(3, S.statVal(s, 'int')); // type 3 into Arcana
  assert.strictEqual(s.skills.arcana, 1);
  s.stats.int.val = 3;
  assert.strictEqual(S.skillTotal(s, 'arcana'), 4, 'the point stays when INT goes up');
  assert.strictEqual(S.initiative(s), 2);
  s.initBonus = S.pointsFor(5, S.statVal(s, 'dex'));
  assert.strictEqual(S.initiative(s), 5);
  const box = S.newBox('skills', 'skill', { stat: 'cha', points: 2 });
  s.stats.cha.val = -1;
  assert.strictEqual(S.boxSkillTotal(s, box), 1);
  const luck = S.newBox('stats', 'stat', { label: 'LCK', value: 3 });
  s.extras.stats.push(luck);
  assert.deepStrictEqual(S.statList(s).map((x) => x.name), ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA', 'LCK']);
  box.stat = luck.id;
  assert.strictEqual(S.boxSkillTotal(s, box), 5, 'a skill can follow an added stat');
});

test('wounds, saves, Bloodied', () => {
  assert.strictEqual(S.setWounds(0, 2), 3);
  assert.strictEqual(S.setWounds(3, 2), 2, 'clicking the last filled one clears it');
  assert.strictEqual(S.setWounds(3, 0), 1);
  assert.strictEqual(S.cycleSave(''), 'adv');
  assert.strictEqual(S.cycleSave('adv'), 'dis');
  assert.strictEqual(S.cycleSave('dis'), '');
  assert.strictEqual(S.cycleSave('junk'), 'adv');
  assert.ok(S.bloodied({ cur: '6', max: '13' }));
  assert.ok(!S.bloodied({ cur: '7', max: '13' }));
  assert.ok(!S.bloodied({ cur: '', max: '13' }));
});

test('calculator boxes', () => {
  assert.strictEqual(S.applyMath('-4', '13'), '9');
  assert.strictEqual(S.applyMath('+3', '9'), '12');
  assert.strictEqual(S.applyMath('13-4', '2'), '9');
  assert.strictEqual(S.applyMath('10', '2'), '10');
  assert.strictEqual(S.applyMath('-4', ''), '-4');
  assert.strictEqual(S.applyMath('', '5'), '');
  assert.strictEqual(S.applyMath('1d8', '5'), null, 'not math: kept as typed');
});

test('removing and restoring default boxes', () => {
  let s = S.blank();
  s = S.setRemoved(s, 'skills', 'lore', true);
  assert.ok(S.isRemoved(s, 'skills', 'lore'));
  s = S.setRemoved(s, 'skills', 'lore', true);
  assert.strictEqual(s.removed.length, 1);
  s = S.setRemoved(s, 'skills', 'lore', false);
  assert.ok(!S.isRemoved(s, 'skills', 'lore'));
});

test('normalize fills odd saves', () => {
  const s = S.normalize({ v: 3, name: 'Shroudstone', woundExtra: 1, woundMarks: [1, 0, 'x'], stats: { int: { val: '2', key: 1, slot: 14 } },
    saves: { dex: { val: 3, mode: 'adv' }, wil: { mode: 'nope' } },
    skills: { lore: '1' }, wounds: 99, removed: ['skills:lore', 'bogus:x'], extras: { stats: [{ type: 'pair', label: 'Luck', value: 3 }, null] },
    tabs: [{ name: 'Spells', entries: [{ title: 'Light', sum: 'cantrip' }, 7] }, 'junk'], tab: 'missing',
  });
  assert.strictEqual(s.name, 'Shroudstone');
  assert.strictEqual(s.woundExtra, true);
  assert.deepStrictEqual(s.woundMarks, [true, false, true, false, false]);
  assert.deepStrictEqual(s.stats.int, { val: 2, slot: '14', key: true });
  assert.deepStrictEqual(s.saves.dex, { val: '3', mode: 'adv' });
  assert.deepStrictEqual(s.saves.wil, { val: '', mode: '' });
  assert.strictEqual(s.skills.lore, 1);
  assert.strictEqual(s.wounds, 6);
  assert.deepStrictEqual(s.removed, ['skills:lore']);
  assert.deepStrictEqual(s.extras.stats.map((b) => [b.type, b.label, b.value, b.max]), [['pair', 'Luck', '3', '']]);
  assert.deepStrictEqual(s.extras.combat, [], 'deleted extras stay deleted');
  assert.deepStrictEqual(s.tabs.map((t) => [t.name, t.entries.map((e) => [e.title, e.sum])]), [['Spells', [['Light', 'cantrip']]]]);
  assert.strictEqual(s.tab, s.tabs[0].id, 'a missing tab falls back to the first');
  assert.deepStrictEqual(S.normalize({ v: 3, tabs: [] }).tabs, [], 'all tabs deleted stays deleted');
  const odd = S.normalize({ v: 3, extras: { stats: [{ type: 'stat', label: 'LCK', value: '2', slot: 4, key: 1 }], skills: [{ type: 'skill', stat: 'gone' }], saves: [{ type: 'save', mode: 'dis', value: 1 }] } });
  assert.deepStrictEqual([odd.extras.stats[0].value, odd.extras.stats[0].slot, odd.extras.stats[0].key], [2, '4', true]);
  assert.strictEqual(odd.extras.skills[0].stat, 'str', 'an unknown stat falls back to STR');
  assert.deepStrictEqual([odd.extras.saves[0].value, odd.extras.saves[0].mode], ['1', 'dis']);
});

test('version 1 sheets move to the new layout', () => {
  const s = S.normalize({ v: 1, name: 'Old', cls: 'Hunter', level: '3', ancestry: 'Human', size: 'Medium', speed: '6',
    stats: { str: { val: 1, save: 'dis' }, dex: { val: 2, key: true }, wil: { val: 3, save: 'adv' } },
    skills: { arcana: 1, finesse: 2, might: 0 }, removed: ['header:origin', 'defense:armor', 'stats:wil', 'skills:might'],
    extras: { defense: [{ type: 'num', label: 'Gold', value: '12' }], skills: [{ type: 'skill', label: 'Ride', stat: 'wil', points: 1 }] },
    entries: [{ title: 'Note', body: 'x' }] });
  assert.strictEqual(s.cls, 'Hunter 3');
  assert.strictEqual(s.speed, '6');
  assert.strictEqual(s.stats.wis.val, 3, 'WIL becomes WIS');
  assert.strictEqual(s.stats.dex.key, true);
  assert.strictEqual(s.saves.str.mode, 'dis');
  assert.strictEqual(s.saves.wil.mode, 'adv');
  assert.strictEqual(s.skills.arcana, 1);
  assert.deepStrictEqual(s.extras.skills.map((b) => [b.label, b.stat, b.points]), [['Ride', 'wis', 1], ['Finesse', 'dex', 2]]);
  assert.deepStrictEqual(s.extras.combat.map((b) => [b.label, b.value]), [['Gold', '12']]);
  assert.deepStrictEqual(s.extras.header.map((b) => [b.label, b.value]), [['Size', 'Medium']]);
  assert.deepStrictEqual(s.removed.sort(), ['combat:armor', 'header:ancestry', 'header:cls', 'stats:wis']);
  assert.deepStrictEqual(s.tabs.map((t) => t.name), ['Actions', 'Abilities', 'Inventory', 'Notes'], 'old note entries become a Notes tab');
  assert.strictEqual(s.tabs[3].entries[0].title, 'Note');
  assert.strictEqual(s.v, 3);
});

test('version 2 sheets: starter boxes go unless used, entries become a Notes tab', () => {
  const s = S.normalize({ v: 2, extras: { combat: [{ type: 'pair', label: 'Mana', value: '', max: '' }, { type: 'num', label: 'Gold', value: '30' },
    { type: 'pair', label: 'Inventory', value: '', max: '10' }, { type: 'num', label: 'Luck', value: '' }] },
  tabs: [{ name: 'Actions', entries: [] }], entries: [{ title: 'Aura', body: 'x' }] });
  assert.deepStrictEqual(s.extras.combat.map((b) => b.label), ['Gold', 'Luck']);
  assert.deepStrictEqual(s.tabs.map((t) => [t.name, t.entries.length]), [['Actions', 0], ['Notes', 1]]);
  assert.strictEqual(S.normalize({ v: 2 }).tabs.length, 3, 'no entries: no Notes tab');
});

test('saving several characters; export and import', () => {
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
  const first = S.loadAll(storage);
  assert.strictEqual(Object.keys(first.chars).length, 1, 'starts with one blank character');
  const b = S.blank('Bryn');
  b.tabs[0].entries.push(S.newEntry({ title: 'Longbow', sum: '+3' }));
  first.chars[b.id] = b;
  first.current = b.id;
  assert.ok(S.saveAll(storage, first));
  const again = S.loadAll(storage);
  assert.strictEqual(again.current, b.id);
  assert.strictEqual(again.chars[b.id].name, 'Bryn');
  assert.strictEqual(again.chars[b.id].tabs[0].entries[0].sum, '+3');
  const copy = S.importJson(S.exportJson(b));
  assert.strictEqual(copy.name, 'Bryn');
  assert.strictEqual(copy.tabs[0].entries[0].title, 'Longbow');
  assert.notStrictEqual(copy.id, b.id, 'an import never overwrites');
  assert.throws(() => S.importJson('{"name":"x"}'));
  assert.throws(() => S.importJson('nope'));
  mem.set(S.STORE, '{broken');
  assert.strictEqual(Object.keys(S.loadAll(storage).chars).length, 1);
});

test('undo brings back the layout but keeps what was typed since', () => {
  const before = S.blank();
  before.extras.combat = [S.newBox('combat', 'pair', { label: 'Mana' }), S.newBox('combat', 'num', { label: 'Gold' }), S.newBox('combat', 'pair', { label: 'Inventory' })];
  before.tabs[0].entries = [{ id: 'x', title: 'Bow', sum: '', body: '' }, { id: 'y', title: 'Axe', sum: '', body: '' }];
  const now = JSON.parse(JSON.stringify(before));
  now.woundExtra = true;
  now.removed = ['skills:lore'];
  now.hp.cur = '9';
  now.extras.combat = now.extras.combat.slice(1);
  now.extras.combat[0].value = '30';
  now.tabs[0].entries = [{ id: 'y', title: 'Axe', sum: 'typed', body: '' }];
  now.tabs[0].name = 'Attacks';
  now.tabs.splice(2, 1); // Inventory tab deleted
  const u = S.undoLayout(before, now);
  assert.strictEqual(u.woundExtra, false);
  assert.deepStrictEqual(u.removed, []);
  assert.strictEqual(u.hp.cur, '9');
  assert.deepStrictEqual(u.extras.combat.map((b) => [b.label, b.value]), [['Mana', ''], ['Gold', '30'], ['Inventory', '']]);
  assert.deepStrictEqual(u.tabs.map((t) => t.name), ['Attacks', 'Abilities', 'Inventory']);
  assert.deepStrictEqual(u.tabs[0].entries.map((e) => [e.title, e.sum]), [['Bow', ''], ['Axe', 'typed']]);
});

test('syncing with an account: newer edit wins, untouched blanks stay local', () => {
  const mk = (id, name, updated) => ({ ...S.blank(name), id, updated });
  const local = { a: mk('a', 'Local newer', 200), b: mk('b', 'Local older', 100), c: mk('c', 'Only here', 50), d: mk('d', '', 0), e: mk('e', 'Gone', 70) };
  const remote = [
    { id: 'a', data: mk('a', 'Remote older', 150) },
    { id: 'b', data: mk('b', 'Remote newer', 300) },
    { id: 'f', data: mk('f', 'Only there', 10) },
    { id: 'x', data: null },
  ];
  const m = S.mergeChars(local, remote, ['e']); // e was in the account before: deleted on another device
  assert.deepStrictEqual(Object.keys(m.chars).sort(), ['a', 'b', 'c', 'd', 'f']);
  assert.strictEqual(m.chars.a.name, 'Local newer');
  assert.strictEqual(m.chars.b.name, 'Remote newer');
  assert.strictEqual(m.chars.f.name, 'Only there');
  assert.deepStrictEqual(m.upload.sort(), ['a', 'c'], 'never-edited d is not uploaded');
  assert.strictEqual(S.normalize({ v: 3, updated: 'x' }).updated, 0);
  assert.strictEqual(S.normalize({ v: 3, name: 'Old save' }).updated, 1, 'saves from before syncing get uploaded');
  assert.strictEqual(S.blank().updated, 0);
  const s = S.blank('Same');
  assert.strictEqual(S.content(s), S.content({ ...s, updated: 999 }), 'the timestamp is not content');
});

test('move', () => {
  assert.deepStrictEqual(S.move(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepStrictEqual(S.move(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepStrictEqual(S.move(['a', 'b'], 5, 0), ['a', 'b']);
});
