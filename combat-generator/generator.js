// Encounter generation logic. Pure functions, no DOM, so it runs in the
// browser (loaded after nimble-data.js) and under Node for tests.

(function (root) {
  const NIMBLE = typeof module !== 'undefined' ? require('./nimble-data.js') : root.NIMBLE;

  const ALL_DICE = [4, 6, 8, 10, 12, 20];

  // --- Randomness ---------------------------------------------------------
  // crypto.getRandomValues when available (browser + Node 19+), else Math.random.
  function rand() {
    const c = typeof globalThis !== 'undefined' && globalThis.crypto;
    if (c && c.getRandomValues) {
      const buf = new Uint32Array(1);
      c.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }
  const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  function weightedPick(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = rand() * total;
    for (const i of items) if ((r -= i.weight) < 0) return i;
    return items[items.length - 1];
  }

  // --- Dice ---------------------------------------------------------------
  const dieAvg = (x) => (x + 1) / 2;

  // Average of one attack's expression (ignoring misses/crits, like the guide's table).
  const exprAvg = (e) => e.count * dieAvg(e.die) + e.mod;

  function formatExpr(e) {
    const base = `${e.count}d${e.die}${e.mod > 0 ? '+' + e.mod : ''}`;
    return e.attacks > 1 ? `(${e.attacks}×) ${base}` : base;
  }

  // Avrae Version: in each damage expression the first die (Nimble's primary die) is split off
  // and written exploding, Avrae style: 4d8+2 → 1d8!+3d8+2. Same dice, so the same table
  // average (the guide's averages ignore crits and misses, p.30). Notation only: derived.
  const EXPR = /(?<![\w!])(\d*)d(\d+)(!?)((?:[+-](?:\d*d\d+!?|\d+))*)/g;
  function nimbleDice(text) {
    return text.replace(EXPR, (all, count, die, bang, rest) => {
      const n = count === '' ? 1 : Number(count);
      if (bang || n < 1) return all;
      return `1d${die}!${n > 1 ? `+${n - 1}d${die}` : ''}${rest}`;
    });
  }

  // Every dice expression whose TOTAL average (all attacks) equals `target` exactly.
  // attacks × (count × (die+1)/2 + mod) = target, with integer mod ≥ 0.
  // Keeps dice doing a real share of the damage so it isn't "1d4+40".
  function dicePool(target, { dice = ALL_DICE, attackOptions = [1, 2], maxCount = 10, minDiceShare = 0.35, tolerance = 0 } = {}) {
    const out = [];
    for (const attacks of attackOptions) {
      const perAttack = target / attacks;
      for (const die of dice) {
        for (let count = 1; count <= maxCount; count++) {
          const diceAvg = count * dieAvg(die);
          if (diceAvg < perAttack * minDiceShare) continue;
          const mod = Math.round(perAttack - diceAvg);
          if (mod < 0) continue;
          const total = attacks * (diceAvg + mod);
          if (Math.abs(total - target) <= tolerance) {
            out.push({ attacks, count, die, mod, average: total, exact: total === target });
          }
        }
      }
    }
    return out;
  }

  // Random dice expression averaging `target`. Prefers the requested die sizes, then any die,
  // then (only for tiny targets like 3, where no exact combo exists) the closest within 0.5.
  function randomDice(target, opts = {}) {
    const tries = [
      opts,
      { ...opts, dice: ALL_DICE },
      { ...opts, dice: ALL_DICE, minDiceShare: 0 },
      { ...opts, dice: ALL_DICE, minDiceShare: 0, tolerance: 0.5 },
    ];
    for (const t of tries) {
      const pool = dicePool(target, t);
      if (pool.length) {
        const e = pick(pool);
        return { ...e, text: formatExpr(e) };
      }
    }
    throw new Error(`No dice expression for average ${target}`);
  }

  // --- Encounter building -------------------------------------------------
  const ROWS = NIMBLE.monsterBuilder;
  const rowIndexForLevel = (lvl) => ROWS.findIndex((r) => Math.abs(r.level - lvl) < 1e-9);

  // Split `budget` monster levels across `n` monsters, each a level from the p.30 table.
  function splitBudget(budget, n) {
    const idx = [];
    const ideal = budget / n;
    for (let i = 0; i < n; i++) {
      const wobble = ideal * (0.6 + rand() * 0.8);
      let best = 0;
      ROWS.forEach((r, j) => { if (Math.abs(r.level - wobble) < Math.abs(ROWS[best].level - wobble)) best = j; });
      idx.push(best);
    }
    const sum = () => idx.reduce((s, j) => s + ROWS[j].level, 0);
    // Nudge single monsters up/down one row until the total is as close as it gets.
    for (let guard = 0; guard < 500; guard++) {
      const diff = budget - sum();
      let bestMove = null;
      for (let k = 0; k < n; k++) {
        for (const step of [1, -1]) {
          const j = idx[k] + step;
          if (j < 0 || j >= ROWS.length) continue;
          const nd = Math.abs(diff - (ROWS[j].level - ROWS[idx[k]].level));
          if (nd < Math.abs(diff) - 1e-9 && (!bestMove || nd < bestMove.nd || (nd === bestMove.nd && rand() < 0.5))) {
            bestMove = { k, j, nd };
          }
        }
      }
      if (!bestMove) break;
      idx[bestMove.k] = bestMove.j;
    }
    return idx;
  }

  // Rounding to table levels can overshoot a band (e.g. Easy must stay *under* half).
  // Step monsters down/up one row (or drop one) until the total sits inside [lo, hi].
  function enforceBand(idx, lo, hi, minCount) {
    const sum = () => idx.reduce((s, j) => s + ROWS[j].level, 0);
    for (let guard = 0; guard < 500 && sum() > hi + 1e-9; guard++) {
      const down = idx.map((j, k) => k).filter((k) => idx[k] > 0);
      if (down.length) idx[pick(down)] -= 1;
      else if (idx.length > minCount) idx.pop();
      else break;
    }
    for (let guard = 0; guard < 500 && sum() < lo - 1e-9; guard++) {
      const up = idx.map((j, k) => k).filter((k) => idx[k] < ROWS.length - 1 && sum() + ROWS[idx[k] + 1].level - ROWS[idx[k]].level <= hi + 1e-9);
      if (!up.length) break;
      idx[pick(up)] += 1;
    }
  }

  // p.30 glass cannon: damage from n rows higher, HP from n rows lower (n = 1–5). Tank: the mirror.
  // Returns the row shift for damage (+n glass, −n tank), or 0 when the table has no room.
  function shapeShift(shape, rowIdx, hpStep) {
    const { min, max } = NIMBLE.shapeShift;
    const room = shape === 'glass'
      ? Math.min(max, ROWS.length - 1 - rowIdx, rowIdx - hpStep)
      : shape === 'tank' ? Math.min(max, rowIdx, ROWS.length - 1 - rowIdx + hpStep) : 0;
    if (room < min) return 0;
    const n = randInt(min, room);
    return shape === 'glass' ? n : -n;
  }

  function buildMonster(rowIdx, { armor, useAbility, dieChoice, shape = 'normal' }) {
    const row = ROWS[rowIdx];
    const armorInfo = armor === 'random'
      ? weightedPick(NIMBLE.armorMix)
      : NIMBLE.armorMix.find((a) => a.key === armor) || NIMBLE.armorMix[0];
    // p.30: each special ability lowers HP one step (use the row below).
    const ability = useAbility && rowIdx > 0 ? pick(NIMBLE.abilities) : null;
    const hpStep = ability ? 1 : 0;
    if (shape === 'mixed') shape = pick(['normal', 'glass', 'tank']);
    const shift = shapeShift(shape, rowIdx, hpStep);
    const dmgRow = ROWS[rowIdx + shift];
    const hpRow = ROWS[rowIdx - shift - hpStep];
    const dice = dieChoice === 'any' ? ALL_DICE : [Number(dieChoice)];
    const attack = randomDice(dmgRow.dpr, { dice });
    return {
      level: row.level,
      label: row.label,
      hp: hpRow.hp[armorInfo.hpIndex],
      armor: armorInfo,
      dpr: dmgRow.dpr,
      shape: shift > 0 ? 'glass' : shift < 0 ? 'tank' : 'normal',
      shift,
      attack,
      dc: row.dc,
      cr: row.cr,
      sample: row.sample,
      ability,
    };
  }

  function minionDieFor(level) {
    const opts = NIMBLE.minionDie.filter((m) => level >= m.from && level <= m.to);
    return pick(opts).die; // the guide's ranges overlap at 3, 5, 10, 13, 17 — either is by the book
  }

  // Share of a level's gold this encounter should pay out (see README "Rewards").
  function rewardFor({ heroes, level, weight, patron }) {
    const p = NIMBLE.patrons.find((x) => x.key === patron) || NIMBLE.patrons[2];
    const goldLevel = Math.min(20, Math.max(1, level + p.offset));
    const goldPerLevel = NIMBLE.goldPerHeroPerLevel[goldLevel];
    const d = NIMBLE.difficulties, s = NIMBLE.typicalSession;
    const weightPerSession = s.easy * d.easy.target + s.medium * d.medium.target + s.hard * d.hard.target;
    const sessions = NIMBLE.sessionsPerLevel(level);
    const perHero = goldPerLevel * weight / (sessions * weightPerSession);
    const round = (g) => (g >= 100 ? Math.round(g / 5) * 5 : Math.max(1, Math.round(g)));
    return {
      perHero: round(perHero),
      party: round(perHero) * heroes,
      goldLevel,
      goldPerLevel,
      sessions,
      weightPerSession,
      weight,
      patron: p,
    };
  }

  // --- Bestiary (p.33–41) --------------------------------------------------
  const familyByKey = (key) => NIMBLE.bestiary.find((f) => f.key === key) || null;
  // Save DC isn't printed in the bestiary: DERIVED from the p.30 row for the monster's level
  // (levels above 20, i.e. the Mummy Lord, use the level-20 row).
  const dcForLevel = (lvl) => ROWS.reduce((best, r) => (r.level <= lvl + 1e-9 ? r : best), ROWS[0]).dc;

  // Pick monster levels for n in [nMin, nMax] monsters whose total lands in [lo, hi], as close
  // to `target` as possible. Exact search in twelfths of a level (1/4, 1/3 and 1/2 are all whole
  // twelfths). `levels` are the preferred levels (a family's); `fill` levels (the p.30 rows) are
  // only used where the preferred ones can't reach the band, and at least one preferred level is
  // always included. Returns null when no combination fits.
  function pickLevels(levels, { nMin, nMax, lo, hi, target, fill = [] }) {
    const toU = (ls) => [...new Set(ls.map((l) => Math.round(l * 12)))];
    const pref = toU(levels);
    const units = toU([...levels, ...fill]);
    const loU = Math.ceil(lo * 12 - 1e-9), hiU = Math.floor(hi * 12 + 1e-9);
    if (hiU < 0) return null;
    // reach[c][s] = 1 when some c monsters total exactly s twelfths.
    const reach = [new Uint8Array(hiU + 1)];
    reach[0][0] = 1;
    for (let c = 1; c <= nMax; c++) {
      reach[c] = new Uint8Array(hiU + 1);
      for (let s = 0; s <= hiU; s++) if (reach[c - 1][s]) for (const u of units) if (s + u <= hiU) reach[c][s + u] = 1;
    }
    // Valid end states: c monsters totalling s in the band, with at least one preferred level.
    const valid = (c) => {
      const r = [];
      for (let s = Math.max(0, loU); s <= hiU; s++) {
        if (reach[c][s] && pref.some((u) => s - u >= 0 && reach[c - 1][s - u])) r.push(s);
      }
      return r;
    };
    const counts = [];
    for (let c = Math.max(1, nMin); c <= nMax; c++) if (valid(c).length) counts.push(c);
    if (!counts.length) return null;
    // Bias toward fewer, meatier monsters (roll twice, keep the lower count). When filling,
    // bias the other way so as many family monsters as possible fit.
    const c = fill.length ? Math.max(pick(counts), pick(counts)) : Math.min(pick(counts), pick(counts));
    const sums = valid(c);
    const best = Math.min(...sums.map((s) => Math.abs(s - target * 12)));
    let cur = pick(sums.filter((s) => Math.abs(s - target * 12) === best));
    // Walk back down: preferred levels first, then levels already used, so the fight has few
    // distinct stat blocks.
    const out = [];
    for (let k = c; k >= 1; k--) {
      const ok = units.filter((u) => cur - u >= 0 && reach[k - 1][cur - u]);
      const okPref = ok.filter((u) => pref.includes(u));
      const from = okPref.length ? okPref : ok;
      const reuse = from.filter((u) => out.includes(u));
      const u = reuse.length && rand() < 0.8 ? pick(reuse) : pick(from);
      out.push(u);
      cur -= u;
    }
    return out.map((u) => u / 12);
  }

  // Family monsters only if they can fill the fight alone; otherwise generic p.30 monsters fill the gap.
  function familyPlan(family, { heroes, level, difficulty }) {
    const diff = NIMBLE.difficulties[difficulty];
    const partyLevels = heroes * level;
    const band = {
      nMin: heroes * NIMBLE.monstersPerHero.min,
      nMax: heroes * NIMBLE.monstersPerHero.max,
      lo: partyLevels * diff.min, hi: partyLevels * diff.max, target: partyLevels * diff.target,
    };
    const levels = family.monsters.map((m) => m.level);
    return pickLevels(levels, band) || pickLevels(levels, { ...band, fill: ROWS.map((r) => r.level) });
  }

  // Can at least one of this family's monsters be in the fight (inside the p.26 band, 1–4 per hero)?
  const familyFits = (key, opts) => !!familyPlan(familyByKey(key), opts);

  function buildFamilyGroups(family, levels) {
    const counts = new Map();
    levels.forEach((l) => counts.set(l, (counts.get(l) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([lvl, count]) => {
        const options = family.monsters.filter((x) => Math.abs(x.level - lvl) < 1e-9);
        if (!options.length) {
          // A generic filler (p.30 row), default settings.
          return { count, monster: buildMonster(rowIndexForLevel(lvl), { armor: 'random', useAbility: false, dieChoice: 'any' }) };
        }
        const m = pick(options);
        return { count, monster: { ...m, bestiary: true, abilities: m.abilities || [], dc: dcForLevel(m.level), dcDerived: true } };
      });
  }

  // Optional p.28–29 Unique Encounter twist on top of any fight.
  function generate(opts) {
    const e = buildFight(opts);
    e.twist = opts.twist ? pick(NIMBLE.twists) : null;
    return e;
  }

  function buildFight(opts) {
    const {
      heroes = 4, level = 1, difficulty = 'hard', mode = 'standard',
      armor = 'random', die = 'any', abilities = false, minionsPerHero = 0, patron = 'standard',
      family: familyKey = 'generic', shape = 'normal',
    } = opts;
    const diff = NIMBLE.difficulties[difficulty];
    const partyLevels = heroes * level;
    const family = mode === 'standard' ? familyByKey(familyKey) : null;

    if (family) {
      const levels = familyPlan(family, { heroes, level, difficulty });
      if (!levels) throw new Error(`No ${family.name} fit a ${diff.name} fight for ${heroes} heroes at level ${level}`);
      const monsterLevels = levels.reduce((s, l) => s + l, 0);
      const ratio = monsterLevels / partyLevels;
      const minions = minionsPerHero > 0
        ? { count: minionsPerHero * heroes, die: minionDieFor(level), named: family.minion }
        : null;
      return {
        mode, heroes, level, difficulty: diff, partyLevels, family,
        groups: buildFamilyGroups(family, levels), monsterLevels, ratio, minions,
        reward: rewardFor({ heroes, level, weight: ratio, patron }),
      };
    }

    if (mode === 'legendary') {
      const lvl = Math.min(20, Math.max(1, level + diff.legendaryOffset));
      const row = NIMBLE.legendary[lvl - 1];
      const heavy = armor === 'heavy' || (armor === 'random' && rand() < 0.25);
      const dice = die === 'any' ? ALL_DICE : [Number(die)];
      const hp = row.hp[heavy ? 1 : 0];
      return {
        mode, heroes, level, difficulty: diff, partyLevels,
        legendary: {
          statLevel: lvl,
          hp,
          bloodied: Math.floor(hp / 2),
          lastStand: row.lastStand,
          armor: heavy ? 'Heavy Armor' : 'Medium Armor',
          dc: row.dc,
          small: { avg: row.small, attack: randomDice(row.small, { dice, attackOptions: [1] }) },
          big: { avg: row.big, attack: randomDice(row.big, { dice, attackOptions: [1] }) },
        },
        reward: rewardFor({ heroes, level, weight: diff.target, patron }),
      };
    }

    const budget = partyLevels * diff.target;
    const minN = Math.max(1, heroes * NIMBLE.monstersPerHero.min);
    const maxN = heroes * NIMBLE.monstersPerHero.max;
    // Never ask for more monsters than the budget can pay for at level 1/4 each,
    // nor fewer than needed to stay under the level-20 cap.
    const lo = Math.max(minN, Math.ceil(budget / 20));
    const hi = Math.max(lo, Math.min(maxN, Math.floor(budget / 0.25)));
    let n = randInt(lo, hi);
    // Bias toward fewer, meatier monsters: roll twice, keep the lower count.
    n = Math.min(n, randInt(lo, hi));

    const idx = splitBudget(budget, n);
    enforceBand(idx, partyLevels * diff.min, partyLevels * diff.max, minN);
    // Group identical levels into one stat block; each block gets its own random dice.
    const counts = new Map();
    idx.forEach((j) => counts.set(j, (counts.get(j) || 0) + 1));
    const groups = [...counts.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([j, count]) => ({ count, monster: buildMonster(j, { armor, useAbility: abilities, dieChoice: die, shape }) }));

    const monsterLevels = idx.reduce((s, j) => s + ROWS[j].level, 0);
    const ratio = monsterLevels / partyLevels;

    const minions = minionsPerHero > 0
      ? { count: minionsPerHero * heroes, die: minionDieFor(level), note: NIMBLE.minionWaves[minionsPerHero].effect }
      : null;

    return {
      mode, heroes, level, difficulty: diff, partyLevels, budget,
      groups, monsterLevels, ratio, minions,
      reward: rewardFor({ heroes, level, weight: ratio, patron }),
    };
  }

  const api = { buildMonster, ALL_DICE, dieAvg, exprAvg, formatExpr, nimbleDice, dicePool, randomDice, splitBudget, rewardFor, generate, rowIndexForLevel, pickLevels, familyFits, dcForLevel };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Gen = api;
})(this);
