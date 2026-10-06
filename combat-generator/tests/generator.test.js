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

test('bestiary encounters land exactly in the difficulty bands', () => {
  let built = 0, filled = 0;
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
          const named = e.groups.filter((g) => g.monster.bestiary);
          assert.ok(named.length >= 1, `${f.key} ${key} ${heroes}x${level}: no family monster`);
          for (const { monster: m } of named) {
            assert.ok(f.monsters.some((x) => x.name === m.name), `${m.name} not in ${f.name}`);
            assert.strictEqual(m.dc, G.dcForLevel(m.level));
          }
          if (named.length < e.groups.length) filled++;
        }
      }
    }
  }
  assert.ok(built > 1000, `only ${built} feasible combos`);
  assert.ok(filled > 0, 'fill-in never used');
});

test('a family uses only its own monsters when it can fill the fight alone', () => {
  for (let i = 0; i < 50; i++) {
    const e = G.generate({ heroes: 4, level: 1, difficulty: 'hard', family: 'kobolds' });
    assert.ok(e.groups.every((g) => g.monster.bestiary));
  }
});

test('generic monsters fill in when a family cannot reach the budget', () => {
  // Kobolds top out at level 1: 4 heroes at level 10 need 40 levels from at most 16 monsters.
  for (let i = 0; i < 50; i++) {
    const e = G.generate({ heroes: 4, level: 10, difficulty: 'hard', family: 'kobolds' });
    assert.ok(e.groups.some((g) => g.monster.bestiary), 'no kobolds');
    assert.ok(e.groups.some((g) => !g.monster.bestiary), 'no filler');
    assert.ok(e.ratio >= 0.95 && e.ratio <= 1.05, `ratio ${e.ratio}`);
  }
  // Underground starts at level 2: 4 level-1 heroes can't fit even one into an Easy fight.
  assert.strictEqual(G.familyFits('underground', { heroes: 4, level: 1, difficulty: 'easy' }), false);
  assert.throws(() => G.generate({ heroes: 4, level: 1, difficulty: 'easy', family: 'underground' }));
});

test('glass cannon / tank shift damage and HP by the same 1–5 rows (p.30)', () => {
  const R = N.monsterBuilder;
  const seen = { glass: 0, tank: 0 };
  for (let idx = 0; idx < R.length; idx++) {
    for (const shape of ['glass', 'tank', 'mixed']) {
      for (let i = 0; i < 20; i++) {
        const m = G.buildMonster(idx, { armor: 'none', useAbility: false, dieChoice: 'any', shape });
        const n = m.shift;
        assert.ok(Math.abs(n) <= 5, `shift ${n}`);
        if (shape === 'glass') assert.ok(n >= 0);
        if (shape === 'tank') assert.ok(n <= 0);
        assert.strictEqual(m.dpr, R[idx + n].dpr);
        assert.strictEqual(m.hp, R[idx - n].hp[0]);
        assert.strictEqual(m.level, R[idx].level); // budget level is unchanged
        if (m.attack.exact) assert.strictEqual(m.attack.attacks * G.exprAvg(m.attack), m.dpr);
        if (n > 0) seen.glass++; if (n < 0) seen.tank++;
      }
    }
  }
  // The guide's own example: a level 5 glass-cannon mage with 34 HP deals 26 damage (3 rows).
  const lvl5 = G.rowIndexForLevel(5);
  assert.strictEqual(R[lvl5 + 3].dpr, 26);
  assert.strictEqual(R[lvl5 - 3].hp[0], 34);
  assert.ok(seen.glass > 0 && seen.tank > 0);
});

test('twists come from the p.28–29 list, only when asked', () => {
  assert.strictEqual(N.twists.length, 37);
  assert.strictEqual(G.generate({ heroes: 4, level: 3 }).twist, null);
  const t = G.generate({ heroes: 4, level: 3, twist: true }).twist;
  assert.ok(N.twists.includes(t));
  assert.ok(N.twists.includes(G.generate({ heroes: 4, level: 3, mode: 'legendary', twist: true }).twist));
});

test('derived bestiary Save DC follows the p.30 row', () => {
  assert.strictEqual(G.dcForLevel(1 / 3), 9);
  assert.strictEqual(G.dcForLevel(4), 12);
  assert.strictEqual(G.dcForLevel(21), 20);
});

test('Avrae Version splits off an exploding primary die', () => {
  assert.strictEqual(G.nimbleDice('4d8+2'), '1d8!+3d8+2');
  assert.strictEqual(G.nimbleDice('1d6+2'), '1d6!+2');
  assert.strictEqual(G.nimbleDice('2d6'), '1d6!+1d6');
  assert.strictEqual(G.nimbleDice('(2×) 2d6+3'), '(2×) 1d6!+1d6+3');
  assert.strictEqual(G.nimbleDice('Stab (2×). 1d4+2 (or Sling, Range 8).'), 'Stab (2×). 1d4!+2 (or Sling, Range 8).');
  assert.strictEqual(G.nimbleDice('Cleave. 2d6+4. OR:'), 'Cleave. 1d6!+1d6+4. OR:');
  assert.strictEqual(G.nimbleDice('3d8 (Range 12)'), '1d8!+2d8 (Range 12)');
  assert.strictEqual(G.nimbleDice('Get in here! Call a goblin minion.'), 'Get in here! Call a goblin minion.');
  assert.strictEqual(G.nimbleDice('1d8!+3d8+2'), '1d8!+3d8+2'); // already split: unchanged
});

test('Avrae Version keeps the same dice (same average)', () => {
  const dice = (t) => t.match(/\d+d\d+/g).reduce((s, x) => {
    const [n, d] = x.split('d').map(Number);
    return s + n * (d + 1) / 2;
  }, 0);
  for (let i = 0; i < 200; i++) {
    const e = G.randomDice(14);
    assert.strictEqual(dice(G.nimbleDice(e.text)), dice(e.text), e.text);
  }
});
