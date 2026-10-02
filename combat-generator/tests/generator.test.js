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

test('bestiary entries are complete (p.33–41)', () => {
  const armors = ['none', 'medium', 'heavy'];
  for (const f of N.bestiary) {
    assert.ok(f.page >= 33 && f.page <= 41, f.name);
    for (const m of f.monsters) {
      assert.ok(m.name && m.level > 0 && m.hp > 0, `${f.name}: ${m.name}`);
      assert.ok(armors.includes(m.armor), `${m.name} armor ${m.armor}`);
      assert.ok(Array.isArray(m.attacks), m.name);
    }
  }
});

test('bestiary encounters land exactly in the difficulty bands, using only that family', () => {
  let built = 0;
  for (const f of N.bestiary) {
    for (const [key, d] of Object.entries(N.difficulties)) {
      for (const heroes of [2, 3, 4, 5, 6]) {
        for (const level of [1, 2, 3, 4, 5, 8, 12, 20]) {
          const opts = { heroes, level, difficulty: key, family: f.key };
          if (!G.familyFits(f.key, opts)) continue;
          const e = G.generate(opts);
          built++;
          const n = e.groups.reduce((s, g) => s + g.count, 0);
          assert.ok(n >= heroes && n <= heroes * 4, `${f.key} ${key} ${heroes}x${level}: ${n} monsters`);
          assert.ok(e.ratio >= d.min - 1e-9 && e.ratio <= d.max + 1e-9, `${f.key} ${key} ${heroes}x${level}: ratio ${e.ratio}`);
          for (const { monster: m } of e.groups) {
            assert.ok(f.monsters.some((x) => x.name === m.name), `${m.name} not in ${f.name}`);
            assert.strictEqual(m.dc, G.dcForLevel(m.level));
          }
        }
      }
    }
  }
  assert.ok(built > 500, `only ${built} feasible combos`);
});

test('families that cannot fill a fight are reported, not faked', () => {
  // Kobolds top out at level 1: 4 heroes at level 10 need 40 levels from at most 16 kobolds.
  assert.strictEqual(G.familyFits('kobolds', { heroes: 4, level: 10, difficulty: 'hard' }), false);
  assert.strictEqual(G.familyFits('kobolds', { heroes: 4, level: 1, difficulty: 'hard' }), true);
  // Underground starts at level 2: 4 level-1 heroes can't have an Easy fight with 4+ of them.
  assert.strictEqual(G.familyFits('underground', { heroes: 4, level: 1, difficulty: 'easy' }), false);
  assert.throws(() => G.generate({ heroes: 4, level: 10, difficulty: 'hard', family: 'kobolds' }));
});

test('derived bestiary Save DC follows the p.30 row', () => {
  assert.strictEqual(G.dcForLevel(1 / 3), 9);
  assert.strictEqual(G.dcForLevel(4), 12);
  assert.strictEqual(G.dcForLevel(21), 20);
});
