// Run with: node --test character-sheet/tests
const test = require('node:test');
const assert = require('node:assert');
const S = require('../sheet.js');

test('a blank sheet has the official layout', () => {
  const s = S.blank();
  assert.deepStrictEqual(Object.keys(s.stats), ['str', 'dex', 'int', 'wil']);
  assert.strictEqual(S.SKILLS.length, 10);
  assert.strictEqual(s.woundsMax, 6);
  assert.deepStrictEqual(s.removed, []);
  assert.deepStrictEqual(s.extras.defense.map((b) => b.label), ['Mana', 'Gold', 'Inventory'], 'extras wait behind the +');
});

test('skills and Initiative follow their stat', () => {
  const s = S.blank();
  s.stats.int.val = 2;
  s.stats.dex.val = 2;
  assert.strictEqual(S.skillTotal(s, 'arcana'), 2);
  assert.strictEqual(S.skillTotal(s, 'might'), 0);
  s.skills.arcana = S.pointsFor(3, S.statVal(s, 'int')); // type 3 into Arcana
  assert.strictEqual(s.skills.arcana, 1);
  s.stats.int.val = 3;
  assert.strictEqual(S.skillTotal(s, 'arcana'), 4, 'the point stays when INT goes up');
  assert.strictEqual(S.initiative(s), 2);
  s.initBonus = S.pointsFor(5, S.statVal(s, 'dex'));
  assert.strictEqual(S.initiative(s), 5);
  const box = S.newBox('skills', 'skill', { stat: 'wil', points: 2 });
  s.stats.wil.val = -1;
  assert.strictEqual(S.boxSkillTotal(s, box), 1);
});

test('wounds, saves, Bloodied', () => {
  assert.strictEqual(S.setWounds(0, 2), 3);
  assert.strictEqual(S.setWounds(3, 2), 2, 'clicking the last filled one clears it');
  assert.strictEqual(S.setWounds(3, 0), 1);
  assert.strictEqual(S.toggleSave('', 'adv'), 'adv');
  assert.strictEqual(S.toggleSave('adv', 'dis'), 'dis');
  assert.strictEqual(S.toggleSave('dis', 'dis'), '');
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

test('normalize fills old or odd saves', () => {
  const s = S.normalize({ name: 'Shroudstone', stats: { int: { val: '2', key: 1, save: 'adv' }, wil: { save: 'nope' } },
    skills: { lore: '1' }, wounds: 99, removed: ['skills:lore', 'bogus:x'], extras: { stats: [{ type: 'pair', label: 'Luck', value: 3 }, null] },
    entries: [{ title: 'Reflective Aura', body: 'When you Defend…' }, 'junk'] });
  assert.strictEqual(s.name, 'Shroudstone');
  assert.deepStrictEqual(s.stats.int, { val: 2, key: true, save: 'adv' });
  assert.deepStrictEqual(s.stats.wil, { val: 0, key: false, save: '' });
  assert.strictEqual(s.skills.lore, 1);
  assert.strictEqual(s.wounds, 6);
  assert.deepStrictEqual(s.removed, ['skills:lore']);
  assert.deepStrictEqual(s.extras.stats.map((b) => [b.type, b.label, b.value, b.max]), [['pair', 'Luck', '3', '']]);
  assert.deepStrictEqual(s.extras.defense, [], 'deleted extras stay deleted');
  assert.strictEqual(s.entries.length, 1);
  assert.ok(s.entries[0].id);
});

test('saving several characters; export and import', () => {
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
  const first = S.loadAll(storage);
  assert.strictEqual(Object.keys(first.chars).length, 1, 'starts with one blank character');
  const b = S.blank('Bryn');
  first.chars[b.id] = b;
  first.current = b.id;
  assert.ok(S.saveAll(storage, first));
  const again = S.loadAll(storage);
  assert.strictEqual(again.current, b.id);
  assert.strictEqual(again.chars[b.id].name, 'Bryn');
  const copy = S.importJson(S.exportJson(b));
  assert.strictEqual(copy.name, 'Bryn');
  assert.notStrictEqual(copy.id, b.id, 'an import never overwrites');
  assert.throws(() => S.importJson('{"name":"x"}'));
  assert.throws(() => S.importJson('nope'));
  mem.set(S.STORE, '{broken');
  assert.strictEqual(Object.keys(S.loadAll(storage).chars).length, 1);
});

test('move', () => {
  assert.deepStrictEqual(S.move(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepStrictEqual(S.move(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepStrictEqual(S.move(['a', 'b'], 5, 0), ['a', 'b']);
});
