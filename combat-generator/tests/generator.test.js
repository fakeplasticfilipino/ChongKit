// Run with: node --test combat-generator/tests
const test = require('node:test');
const assert = require('node:assert');
const G = require('../generator.js');
const N = require('../nimble-data.js');

test('every random damage expression averages exactly the guide value (p.30)', () => {
  for (const row of N.monsterBuilder) {
    for (let i = 0; i < 200; i++) {
      const e = G.randomDice(row.dpr);
      const total = e.attacks * G.exprAvg(e);
      if (e.exact) assert.strictEqual(total, row.dpr, `${row.label}: ${e.text}`);
      else assert.ok(Math.abs(total - row.dpr) <= 0.5, `${row.label}: ${e.text}`);
    }
  }
});

test('only level 1/4 (3 dmg) lacks an exact dice option', () => {
  for (const row of N.monsterBuilder) {
    const exact = G.dicePool(row.dpr).length > 0;
    assert.strictEqual(exact, row.label !== '1/4', row.label);
  }
});

test('dice actually vary between generations', () => {
  const seen = new Set();
  for (let i = 0; i < 100; i++) seen.add(G.randomDice(21).text);
  assert.ok(seen.size > 5, `only saw ${[...seen]}`);
});

test('die flavor is respected when possible', () => {
  for (const die of [4, 6, 8, 10, 12, 20]) {
    const e = G.randomDice(26, { dice: [die] });
    assert.strictEqual(e.die, die);
  }
});

test('legendary attacks average exactly the guide values (p.44)', () => {
  for (const row of N.legendary) {
    for (const k of ['small', 'big']) {
      const e = G.randomDice(row[k], { attackOptions: [1] });
      assert.strictEqual(G.exprAvg(e), row[k]);
    }
  }
});

test('encounters land in the guide difficulty bands (p.26)', () => {
  for (const [key, d] of Object.entries(N.difficulties)) {
    for (const heroes of [2, 3, 4, 5, 6]) {
      for (const level of [1, 2, 3, 5, 8, 12, 20]) {
        const e = G.generate({ heroes, level, difficulty: key });
        const nMonsters = e.groups.reduce((s, g) => s + g.count, 0);
        assert.ok(nMonsters >= heroes && nMonsters <= heroes * 4, `${key} ${heroes}x${level}: ${nMonsters} monsters`);
        // Tiny budgets can't hit bands exactly with 1/4-level steps; allow a 1/4-level slack.
        const slack = 0.25 / e.partyLevels;
        assert.ok(e.ratio >= d.min - slack && e.ratio <= d.max + slack, `${key} ${heroes}x${level}: ratio ${e.ratio}`);
        if (key === 'easy') assert.ok(e.ratio < 0.5, `easy must stay under half: ${e.ratio}`);
      }
    }
  }
});

test('monster HP matches the p.30 table for its level and armor', () => {
  for (let i = 0; i < 50; i++) {
    const e = G.generate({ heroes: 4, level: 6, difficulty: 'hard' });
    for (const { monster: m } of e.groups) {
      const row = N.monsterBuilder[G.rowIndexForLevel(m.level)];
      assert.strictEqual(m.hp, row.hp[m.armor.hpIndex]);
      assert.strictEqual(m.dpr, row.dpr);
    }
  }
});

test('gold reward scales from the p.22 table', () => {
  const r = G.rewardFor({ heroes: 4, level: 1, weight: 1, patron: 'standard' });
  assert.strictEqual(r.goldPerLevel, 25);
  const rich = G.rewardFor({ heroes: 4, level: 1, weight: 1, patron: 'lavish' });
  assert.strictEqual(rich.goldPerLevel, 80); // level 3 row
  assert.ok(rich.perHero > r.perHero);
});

test('rollAttack: primary die 1 misses, max crits and explodes', () => {
  for (let i = 0; i < 2000; i++) {
    const r = G.rollAttack({ count: 2, die: 6, mod: 3 });
    if (r.rolls[0] === 1) assert.ok(r.miss && r.total === 0);
    if (r.rolls[0] === 6) assert.ok(r.crit && r.rolls.length >= 3);
    const m = G.rollAttack({ count: 1, die: 4, mod: 0 }, { canCrit: false });
    assert.ok(!m.crit);
  }
});
