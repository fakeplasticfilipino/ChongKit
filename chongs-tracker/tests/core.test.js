// Run with: node --test chongs-tracker/tests
const test = require('node:test');
const assert = require('node:assert');
const C = require('../core.js');

test('arithmetic: + - * / and parentheses, nothing else', () => {
  assert.strictEqual(C.evalExpr('20-3'), 17);
  assert.strictEqual(C.evalExpr('2+3*4'), 14);
  assert.strictEqual(C.evalExpr('(2+3)*4'), 20);
  assert.strictEqual(C.evalExpr('15/2'), 7.5);
  assert.strictEqual(C.evalExpr('-3'), -3);
  assert.strictEqual(C.evalExpr(' 10 - 4 '), 6);
  for (const bad of ['', '2d6', 'abc', '3+', '(2', '1/0', 'alert(1)']) {
    assert.strictEqual(C.evalExpr(bad), null, bad);
  }
});

test('reading the HP box', () => {
  assert.deepStrictEqual(C.readInput('20-3', 20), { kind: 'delta', value: -3 });
  assert.deepStrictEqual(C.readInput('-3', 20), { kind: 'delta', value: -3 });
  assert.deepStrictEqual(C.readInput('+5', 20), { kind: 'delta', value: 5 });
  assert.deepStrictEqual(C.readInput('12', 20), { kind: 'set', value: 12 });
  assert.deepStrictEqual(C.readInput('20', 20), { kind: 'set', value: 20 });
  assert.deepStrictEqual(C.readInput('-15/2', 20), { kind: 'delta', value: -7 });
  assert.strictEqual(C.readInput('2d6', 20), null);
});

test('typing 20-3 into a 20 HP box gives 17', () => {
  const e = { hp: 20, max: 20, extra: 0 };
  assert.deepStrictEqual(C.applyHp(e, C.readInput('20-3', 20)), { hp: 17, extra: 0 });
});

test('damage uses up Extra HP first', () => {
  const e = { hp: 20, max: 20, extra: 5 };
  assert.deepStrictEqual(C.applyHp(e, { kind: 'delta', value: -3 }), { hp: 20, extra: 2 });
  assert.deepStrictEqual(C.applyHp(e, { kind: 'delta', value: -8 }), { hp: 17, extra: 0 });
});

test('with Max HP set, HP cannot go above it; HP can go below 0', () => {
  const e = { hp: 15, max: 20, extra: 0 };
  assert.strictEqual(C.applyHp(e, { kind: 'delta', value: 10 }).hp, 20);
  assert.strictEqual(C.applyHp(e, { kind: 'set', value: 99 }).hp, 20);
  assert.strictEqual(C.applyHp(e, { kind: 'delta', value: -30 }).hp, -15);
  const noMax = { hp: 15, max: null, extra: 0 };
  assert.strictEqual(C.applyHp(noMax, { kind: 'delta', value: 10 }).hp, 25);
  // HP already above max (set before max was lowered) isn't cut down by healing.
  assert.strictEqual(C.applyHp({ hp: 25, max: 20 }, { kind: 'delta', value: 3 }).hp, 25);
});

test('batch command lines', () => {
  const { rows, errors } = C.parseCommand('Goblin x4 15\nOgre 59 ac:M extra:5\nGoblin 2 12\nnonsense');
  assert.deepStrictEqual(errors, ['nonsense']);
  assert.deepStrictEqual(rows[0], { name: 'Goblin', count: 4, hp: 15, max: 15, extra: 0, ac: '' });
  assert.deepStrictEqual(rows[1], { name: 'Ogre', count: 1, hp: 59, max: 59, extra: 5, ac: 'M' });
  assert.deepStrictEqual(rows[2], { name: 'Goblin 2', count: 1, hp: 12, max: 12, extra: 0, ac: '' });
  const entries = C.rowsToEntries(rows, { tab: 't1' });
  assert.deepStrictEqual(entries.slice(0, 5).map((e) => e.name), ['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin 4', 'Ogre']);
  assert.ok(entries.every((e) => e.hidden), 'hidden by default');
  assert.ok(C.rowsToEntries(rows, { tab: C.PLAYERS_TAB }).every((e) => !e.hidden), 'Players tab is visible');
});

test('pasting the combat generator text', () => {
  const text = `Hard Fight · 4 heroes, level 5

Twist: Defend the Fort. Heroes must defend a location.

Kobolds
Nooooo! When an ally within 2 spaces dies, attack once for free.

Monster A x1 (level 12)
HP: 119
Armor: Medium
Damage: (2×) 3d10+1
Save DC: 16

Kobold Sneak x2
HP: 15
Armor: None
Damage: Stab. 1d4+2 (or Sling, Range 8).
Save DC: 10 (by level)

Kobold Minion x3
HP: Minion (any damage kills)
Damage: Stab. 1d4 (no crits, miss on a 1)

Loot: 40 gp each (160 gp for the party)`;
  const { rows, note } = C.parseCommand(text);
  assert.deepStrictEqual(rows, [
    { name: 'Monster A', count: 1, hp: 119, max: 119, extra: 0, ac: 'M', note: 'Damage: (2×) 3d10+1\nSave DC: 16' },
    { name: 'Kobold Sneak', count: 2, hp: 15, max: 15, extra: 0, ac: '', note: 'Damage: Stab. 1d4+2 (or Sling, Range 8).\nSave DC: 10 (by level)' },
    { name: 'Kobold Minion', count: 1, hp: 3, max: 3, extra: 0, ac: '', group: true, note: 'Damage: Stab. 1d4 (no crits, miss on a 1)' },
  ]);
  assert.strictEqual(note, 'Hard Fight · 4 heroes, level 5\n\nTwist: Defend the Fort. Heroes must defend a location.\n\n'
    + 'Kobolds\nNooooo! When an ally within 2 spaces dies, attack once for free.\n\nLoot: 40 gp each (160 gp for the party)');
  const entries = C.rowsToEntries(rows, { tab: 't' });
  assert.deepStrictEqual(entries.map((e) => e.note), [rows[0].note, rows[1].note, rows[1].note, rows[2].note], 'every copy keeps the note');
  const boss = C.parseCommand('The Boss (Legendary, level 3)\nHP: 100\nArmor: Heavy\nSave DC: 15').rows;
  assert.deepStrictEqual(boss, [{ name: 'The Boss', count: 1, hp: 100, max: 100, extra: 0, ac: 'H', note: 'Save DC: 15' }]);
  assert.strictEqual(C.parseCommand('Wolf x2\nHP: 9').note, undefined, 'no general note without one');
  assert.strictEqual(C.newEntry({ name: 'Plain' }).note, undefined);
});

test('armor keeps its first letter (None: no AC); tab notes add up', () => {
  assert.deepStrictEqual(['None', 'medium', 'Heavy', '15', ''].map(C.acFrom), ['', 'M', 'H', '15', '']);
  assert.strictEqual(C.parseCommand('Rat 3 ac:none').rows[0].ac, '', 'None gives no AC');
  assert.strictEqual(C.parseCommand('Ogre 59 ac:Medium').rows[0].ac, 'M');
  assert.strictEqual(C.addNote('', 'Fight'), 'Fight');
  assert.strictEqual(C.addNote('Fight', 'Loot'), 'Fight\n\nLoot');
  assert.strictEqual(C.addNote('Fight\n\nLoot', 'Loot'), 'Fight\n\nLoot', 'pasting twice adds nothing');
});

test('tab notes are saved, the Players tab too', () => {
  const md = { ...C.tabPatch({ id: 'x', name: 'Fight', order: 1, note: 'Loot: 40 gp' }), ...C.tabPatch({ id: C.PLAYERS_TAB, name: 'Players', note: 'Party gold' }) };
  const s = C.readState(md);
  assert.deepStrictEqual(s.tabs.map((t) => t.note), ['Party gold', 'Loot: 40 gp']);
  assert.ok(!s.tabs[0].room, 'a scene note does not mark the Players tab as a room tab');
  const back = C.moveTabPatches({ id: C.PLAYERS_TAB, name: 'Players', note: 'Party gold' }, [], false);
  assert.strictEqual(C.readState(back.to, back.from).tabs[0].note, 'Party gold', 'the note comes back to the scene');
  assert.strictEqual(C.readState({}, { ...C.tabPatch({ id: C.PLAYERS_TAB, name: 'Players', note: 'Room' }) }).tabs[0].note, 'Room');
});

test('scene metadata round trip: Players tab always exists, deleted entries vanish', () => {
  const a = C.newEntry({ name: 'A', tab: 'x', order: 1 });
  const b = C.newEntry({ name: 'B', tab: 'x', order: 0 });
  const md = { ...C.tabPatch({ id: 'x', name: 'Fight', order: 1 }), ...C.tabDeletePatch('old'), ...C.entryPatch(a), ...C.entryPatch(b), ...C.deletePatch('gone'), other: 1 };
  const s = C.readState(md);
  assert.deepStrictEqual(s.tabs.map((t) => t.id), ['players', 'x']);
  assert.deepStrictEqual(s.entries.map((e) => e.name), ['B', 'A']);
  assert.deepStrictEqual(C.readState({}).tabs.map((t) => t.id), ['players']);
});

test('tabs: one key each, old single key migrates', () => {
  const md = { [C.KEYS.tabs]: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], ...C.tabDeletePatch('b'), ...C.tabPatch({ id: 'c', name: 'C', order: 9, players: true }) };
  assert.deepStrictEqual(C.readState(md).tabs.map((t) => t.id), ['players', 'a', 'c']);
  const patch = C.migrateTabsPatch(md);
  assert.strictEqual(patch[C.KEYS.tabs], null);
  assert.deepStrictEqual(Object.keys(patch).filter((k) => k.startsWith(C.KEYS.tabPrefix)), [C.KEYS.tabPrefix + 'a']);
  assert.deepStrictEqual(C.readState({ ...md, ...patch }).tabs.map((t) => t.id), ['players', 'a', 'c']);
  assert.strictEqual(C.migrateTabsPatch({ ...md, ...patch }), null);
});

test('tabs saved to the room: read from both, moved both ways', () => {
  const a = C.newEntry({ name: 'A', tab: 'r' });
  const b = C.newEntry({ name: 'B', tab: 's' });
  const hero = C.newEntry({ name: 'Hero', tab: C.PLAYERS_TAB });
  const scene = { ...C.tabPatch({ id: 's', name: 'Scene', order: 1 }), ...C.entryPatch(b) };
  const room = { ...C.tabPatch({ id: 'r', name: 'Room', order: 2, room: true }), ...C.tabPatch({ id: C.PLAYERS_TAB, name: 'Players' }), ...C.entryPatch(a), ...C.entryPatch(hero), ...C.tabDeletePatch('s') };
  assert.ok(!('room' in room[C.KEYS.tabPrefix + 'r']), 'room flag is not saved');
  const s = C.readState(scene, room);
  assert.deepStrictEqual(s.tabs.map((t) => [t.id, !!t.room]), [['players', true], ['s', false], ['r', true]], 'a deleted room key leaves the scene tab');
  assert.deepStrictEqual(s.entries.map((e) => e.name).sort(), ['A', 'B', 'Hero']);
  assert.ok(!C.readState(scene).tabs[0].room);

  // Mid-move an entry can be in both: keep the copy where its tab is saved.
  const both = C.readState({ ...scene, ...C.entryPatch({ ...a, name: 'old' }) }, room);
  assert.deepStrictEqual(both.entries.filter((e) => e.id === a.id).map((e) => e.name), ['A']);

  const { to, from } = C.moveTabPatches({ id: 's', name: 'Scene', room: true }, s.entries, true);
  assert.deepStrictEqual(Object.keys(to).sort(), [C.KEYS.tabPrefix + 's', C.entryKey(b.id)].sort());
  assert.ok(Object.values(from).every((v) => v === null) && C.entryKey(b.id) in from);
  const moved = C.readState({ ...scene, ...from }, { ...room, ...to });
  assert.ok(moved.tabs.find((t) => t.id === 's').room);
  assert.strictEqual(moved.entries.length, 3);
  // The Players tab back to the scene: only the room's marker is cleared.
  const back = C.moveTabPatches({ id: C.PLAYERS_TAB, name: 'Players' }, s.entries, false);
  assert.deepStrictEqual(Object.keys(back.to), [C.entryKey(hero.id)]);
  assert.ok(!C.readState({ ...scene, ...back.to }, { ...room, ...back.from }).tabs[0].room);
  assert.strictEqual(C.metadataSize({ a: 'é' }), 10, 'bytes, not characters');
});

test('several tokens per entry; minion rows are groups', () => {
  assert.deepStrictEqual(C.tokensOf({ token: 't1' }), ['t1']);
  assert.deepStrictEqual(C.tokensOf({ token: null }), []);
  const e = C.withTokens({ id: 'e' }, ['t1', 't2', 't1']);
  assert.deepStrictEqual([e.token, e.tokens], ['t1', ['t1', 't2']]);
  assert.strictEqual(C.withTokens(e, []).token, null);
  assert.ok(C.rowsToEntries(C.parseCommand('Kobold Minion x5').rows, { tab: 'x' })[0].group);
  assert.ok(!C.rowsToEntries(C.parseCommand('Goblin 7').rows, { tab: 'x' })[0].group);
});

test('reorder', () => {
  assert.deepStrictEqual(C.reorder(['a', 'b', 'c'], 'a', 'c', true), ['b', 'c', 'a']);
  assert.deepStrictEqual(C.reorder(['a', 'b', 'c'], 'c', 'a', false), ['c', 'a', 'b']);
  assert.deepStrictEqual(C.reorder(['a', 'b', 'c'], 'b', 'b', false), ['a', 'b', 'c']);
});

test('hidden stats and permissions', () => {
  const tabs = [{ id: C.PLAYERS_TAB, name: 'Players' }, { id: 'x', name: 'Fight' }, { id: 'p', name: 'Pets', players: true }];
  const monster = C.newEntry({ tab: 'x' });
  const hero = C.newEntry({ tab: C.PLAYERS_TAB });
  const pet = C.newEntry({ tab: 'p', hidden: false });
  assert.ok(monster.hidden && !hero.hidden, 'GM tabs start with stats hidden');
  assert.ok(C.masked(monster, 'PLAYER') && !C.masked(monster, 'GM'));
  assert.ok(!C.masked({ ...monster, hidden: false }, 'PLAYER'));
  assert.ok(C.canEdit(hero, 'PLAYER', tabs) && C.canEdit(pet, 'PLAYER', tabs));
  assert.ok(!C.canEdit({ ...monster, hidden: false }, 'PLAYER', tabs));
  assert.ok(C.canEdit(monster, 'GM', tabs));
});

test('H or B for hidden stats', () => {
  assert.strictEqual(C.hpStatus({ hp: 11, max: 20 }), 'H');
  assert.strictEqual(C.hpStatus({ hp: 10, max: 20 }), 'B');
  assert.strictEqual(C.hpStatus({ hp: 0, max: null }), 'B');
  assert.strictEqual(C.hpStatus({ hp: 5, max: null }), 'H');
});

test('minions share one entry', () => {
  assert.deepStrictEqual(C.parseCommand('Kobold Minion x10').rows, [{ name: 'Kobold Minion', count: 1, hp: 10, max: 10, extra: 0, ac: '', group: true }]);
  assert.deepStrictEqual(C.parseCommand('Rat minions x6 ac:M').rows[0], { name: 'Rat minions', count: 1, hp: 6, max: 6, extra: 0, ac: 'M', group: true });
  assert.strictEqual(C.parseCommand('Kobold Minion 4').rows[0].hp, 4);
});

test('/clear command', () => {
  assert.deepStrictEqual(C.parseClear('/clear'), { match: '' });
  assert.deepStrictEqual(C.parseClear('/clear Goblin'), { match: 'Goblin' });
  assert.strictEqual(C.parseClear('Clear 5'), null);
  assert.ok(C.clearMatches({ name: 'Goblin 3' }, { match: 'goblin' }));
  assert.ok(!C.clearMatches({ name: 'Ogre' }, { match: 'goblin' }));
  assert.ok(C.clearMatches({ name: 'Ogre' }, { match: '' }));
});

test('HP bar fill', () => {
  assert.strictEqual(C.hpFraction({ hp: 10, max: 20 }), 0.5);
  assert.strictEqual(C.hpFraction({ hp: 25, max: 20 }), 1);
  assert.strictEqual(C.hpFraction({ hp: -5, max: 20 }), 0);
  assert.strictEqual(C.hpFraction({ hp: 7, max: null }), 1);
});
