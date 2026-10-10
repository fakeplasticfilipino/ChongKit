// Campfire: pure timing math for the animation. No three.js here, so it runs in Node tests.
// Browser global `CampAnim`; CommonJS for tests.
(function (root) {
  'use strict';

  // Seeded random (mulberry32): the same seed always builds the same forest.
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A repeatable value in [-1, 1] for each whole number.
  function hash(i, seed) {
    let h = Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967295) * 2 - 1;
  }

  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

  // Smooth 1D value noise in [-1, 1].
  function noise1(x, seed) {
    const i = Math.floor(x), f = x - i;
    const a = hash(i, seed || 0), b = hash(i + 1, seed || 0);
    return a + (b - a) * smooth(f);
  }

  // Fire brightness multiplier, 0.74–1.26: a slow swell plus a quick crackle.
  function flicker(t) {
    return 1 + 0.18 * noise1(t * 3, 11) + 0.08 * noise1(t * 9.7, 12);
  }

  // Slow breathing, 0 (out) to 1 (in).
  function breath(t, period, phase) {
    return 0.5 - 0.5 * Math.cos(2 * Math.PI * (t / period + (phase || 0)));
  }

  // An idle moment: every `period` s, starting `offset` s in, lasting `dur` s.
  // 0 outside it, eases up to 1 and back down over a quarter of `dur` at each end.
  function envelope(t, period, offset, dur) {
    const local = (((t - offset) % period) + period) % period;
    if (local >= dur) return 0;
    const ramp = dur * 0.25;
    return Math.min(smooth(local / ramp), smooth((dur - local) / ramp));
  }

  // Nodding off: inside the window the value creeps up to 1, then snaps back to 0 (jerking awake).
  function doze(t, period, offset, dur) {
    const local = (((t - offset) % period) + period) % period;
    if (local >= dur) return 0;
    const fall = dur * 0.88;
    return local < fall ? smooth(local / fall) : 1 - smooth((local - fall) / (dur - fall));
  }

  // One ember `age` s into a `life` s flight, from the fire's centre (0, 0, 0).
  function ember(seed, age, life) {
    const r = rng(seed * 7919 + 1);
    const x0 = (r() - 0.5) * 0.5, z0 = (r() - 0.5) * 0.5, vy = 0.8 + r() * 0.7;
    if (age >= life) return { x: x0, y: 0, z: z0, alpha: 0 };
    const u = age / life;
    return {
      x: x0 + 0.5 * noise1(age * 0.9, seed) * u,
      y: 0.35 + vy * age,
      z: z0 + 0.5 * noise1(age * 0.9 + 50, seed) * u,
      alpha: 1 - u,
    };
  }

  // One puff of smoke: rises, spreads and thins out.
  function smoke(seed, age, life) {
    if (age >= life) return { x: 0, y: 0, z: 0, scale: 0, alpha: 0 };
    const u = age / life;
    return {
      x: 0.6 * noise1(age * 0.4, seed) * u,
      y: 0.9 + 0.45 * age,
      z: 0.6 * noise1(age * 0.4 + 30, seed) * u,
      scale: 0.12 + 0.09 * age,
      alpha: 0.14 * Math.sin(Math.PI * u),
    };
  }

  // ---- pixel fire: tongue shapes eaten away by noise that scrolls upward, so bits lick up and tear off ----
  const FIRE_MAX = 36;

  // Smooth 2D value noise in [-1, 1].
  function hash2(i, j, seed) {
    let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967295) * 2 - 1;
  }
  function noise2(x, y, seed) {
    const i = Math.floor(x), j = Math.floor(y), u = smooth(x - i), v = smooth(y - j);
    const a = hash2(i, j, seed), b = hash2(i + 1, j, seed), c = hash2(i, j + 1, seed), d = hash2(i + 1, j + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // Three tongues: [centre, width, height, seed].
  const TONGUES = [[0, 0.36, 0.85, 1], [-0.17, 0.24, 0.62, 2], [0.18, 0.26, 0.68, 3]]; // room at the top for the tips
  // Heat 0–FIRE_MAX at (u, v): u across (-0.5 … 0.5), v up (0 at the base … 1 at the top).
  // grow > 1 makes the fire taller (flicker, a log landing).
  function fireHeat(u, v, t, grow) {
    const n = noise2(u * 6, v * 5 - t * 6, 7) * 0.6 + noise2(u * 13, v * 10 - t * 9.5, 8) * 0.4;
    let best = 0;
    for (const [c, w, h, s] of TONGUES) {
      const vv = v / (h * (grow || 1));
      if (vv >= 1.2) continue;
      const width = w * Math.pow(Math.max(0, 1 - vv), 0.8);
      if (width < 0.004) continue; // above this tongue's tip
      const sway = 0.1 * noise1(vv * 2 - t * 1.3 + s * 10, s) * vv;
      const d = Math.abs(u - c - sway) / Math.max(width, 0.001);
      const heat = (1 - d) * (1.25 - vv) + 0.5 * n * (0.2 + vv);
      if (heat > best) best = heat;
    }
    return Math.min(1, best) * FIRE_MAX;
  }

  // Heat to colour: null (clear) when cold, then deep red → orange → yellow → white-hot.
  const FIRE_RAMP = [[3, null], [8, 0x6e2a1f], [13, 0x9b3a1c], [18, 0xc8561b], [24, 0xe8812c], [29, 0xf8b347], [33, 0xffe08a], [37, 0xfff6d6]];
  function fireColor(v) {
    for (const [below, c] of FIRE_RAMP) if (v < below) return c;
    return 0xfff6d6;
  }

  // ---- sound schedules (shared with the picture: pops throw embers, wind sways the trees) ----

  // Fire pops in [from, to): a chance every 1/12 s, more when the fire flares. Strength 0.3–1.
  const POP_SLOT = 1 / 12;
  function pops(from, to) {
    const out = [];
    for (let k = Math.floor(from / POP_SLOT); k * POP_SLOT < to; k++) {
      const r = rng(k * 7919 + 17);
      const flare = Math.max(0, flicker(k * POP_SLOT) - 1) / 0.26;
      if (r() >= 0.12 + 0.3 * flare) continue;
      const time = (k + r()) * POP_SLOT;
      if (time >= from && time < to) out.push({ time, strength: 0.3 + 0.7 * r(), id: k });
    }
    return out;
  }

  // Embers thrown up by the strong pops of the last second.
  function bursts(t) {
    const out = [];
    for (const p of pops(t - 1, t)) {
      if (p.strength < 0.7) continue;
      for (let j = 0; j < 3; j++) {
        const e = ember(p.id * 3 + j + 99991, t - p.time, 1);
        out.push({ x: e.x, y: e.y * 1.4 - 0.15, z: e.z, alpha: e.alpha });
      }
    }
    return out;
  }

  // Wind strength 0–1: slow gusts. The treetops sway with it and the wind sound follows it.
  function wind(t) {
    return 0.5 + 0.5 * noise1(t * 0.15, 900);
  }

  // Owl hoots in [from, to): one every 60–120 s.
  function owls(from, to) {
    const out = [];
    for (let k = Math.max(0, Math.floor(from / 90) - 1); k * 90 < to; k++) {
      const time = k * 90 + 30 + rng(k * 31 + 5)() * 30;
      if (time >= from && time < to) out.push(time);
    }
    return out;
  }

  // Cricket chirps in [from, to): three crickets taking turns, each chirping steadily while it sings.
  const CRICKETS = [
    { every: 0.85, period: 17, offset: 0, dur: 10 },
    { every: 1.1, period: 23, offset: 7, dur: 12 },
    { every: 0.7, period: 29, offset: 15, dur: 9 },
  ];
  function chirps(from, to) {
    const out = [];
    CRICKETS.forEach((c, i) => {
      for (let k = Math.floor(from / c.every); k * c.every < to; k++) {
        const time = k * c.every;
        if (time >= from && envelope(time, c.period, c.offset, c.dur) > 0) out.push({ time, cricket: i });
      }
    });
    return out.sort((a, b) => a.time - b.time);
  }

  // ---- little stories: each on its own cycle, spaced out so they stay special through a long session.
  // Periods are picked so one figure's stories never overlap (twig 62 = 2 × shift 31; pipe and reach
  // share 67; katana 74 = 2 × doze 37). ----
  const STORIES = {
    shift: { period: 31, offset: 13, dur: 3 }, // traveler shifts on the cane
    twig: { period: 62, offset: 28, dur: 4 }, // traveler tosses a twig on the fire
    reach: { period: 67, offset: 6, dur: 6 }, // wizard warms a hand
    pipe: { period: 67, offset: 30, dur: 11 }, // wizard smokes a pipe
    stir: { period: 67, offset: 50, dur: 6 }, // wizard stirs the stew with a flick of the hand (the ladle stirs itself)
    doze: { period: 37, offset: 9, dur: 9 }, // samurai nods off
    katana: { period: 74, offset: 20, dur: 12 }, // samurai checks the blade
  };
  // The samurai's dozing (0 awake … 1 asleep), on the doze story's schedule.
  const dozeAt = (t) => doze(t, STORIES.doze.period, STORIES.doze.offset, STORIES.doze.dur);
  // Seconds into the story's current run, or -1 when it isn't running.
  function story(name, t) {
    const s = STORIES[name];
    const local = (((t - s.offset) % s.period) + s.period) % s.period;
    return local < s.dur ? local : -1;
  }
  // 0 outside [a, b], easing to 1 over `ramp` seconds at each end. Feed it a story's local time.
  function win(local, a, b, ramp) {
    if (local < a || local > b) return 0;
    return Math.min(smooth((local - a) / ramp), smooth((b - local) / ramp));
  }
  // Seconds since the story last reached `at` seconds into its run (always 0 … period).
  function since(name, at, t) {
    const s = STORIES[name];
    return (((t - s.offset - at) % s.period) + s.period) % s.period;
  }
  // Poses between keyframes [[time, ...values], …], eased; before the first and after the last, held.
  function keyframes(local, keys) {
    if (local <= keys[0][0]) return keys[0].slice(1);
    for (let i = 1; i < keys.length; i++) {
      if (local > keys[i][0]) continue;
      const a = keys[i - 1], b = keys[i], u = smooth((local - a[0]) / (b[0] - a[0]));
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u);
    }
    return keys[keys.length - 1].slice(1);
  }
  // Moments inside the stories (seconds into the run).
  const TWIG_LAND = 2.3, PUFFS = [4.2, 7.6], DRAW = 1.6, SHEATHE = 10.4;
  const SNAP = STORIES.doze.dur * 0.88; // when doze() snaps back

  // Every moment in [from, to), sorted: a twig landing, logs settling, the samurai jerking awake, the katana
  // drawn and put away, the wizard's puffs, a wolf far off. The sound plays them; the picture shows them.
  function events(from, to) {
    const out = [];
    const each = (name, at, type) => {
      const s = STORIES[name];
      for (let k = Math.floor((from - s.offset - at) / s.period); k * s.period + s.offset + at < to; k++) {
        const time = k * s.period + s.offset + at;
        if (time >= from) out.push({ type, time });
      }
    };
    each('twig', TWIG_LAND, 'land');
    each('doze', SNAP, 'snap');
    each('katana', DRAW, 'draw');
    each('katana', SHEATHE, 'sheathe');
    PUFFS.forEach((p) => each('pipe', p, 'puff'));
    const slots = (len, type, base, spread, chance, salt) => {
      for (let k = Math.max(0, Math.floor(from / len) - 1); k * len < to; k++) {
        const r = rng(k * 131 + salt);
        const time = k * len + base + r() * spread;
        if (r() < chance && time >= from && time < to) out.push({ type, time });
      }
    };
    slots(37, 'settle', 4, 25, 0.65, 11); // logs shift and settle
    slots(150, 'wolf', 70, 60, 1, 23); // a wolf far off, every 2–3 minutes
    slots(60, 'star', 10, 40, 1, 37); // a shooting star
    slots(120, 'eyes', 50, 50, 1, 41); // eyes glinting in the forest
    for (const s of stokes(from, to)) out.push({ type: 'stoke', time: s });
    return out.sort((a, b) => a.time - b.time);
  }

  // The fire flares when a twig lands, the logs settle or the wizard stokes it: 0–1, fading over a second and a half.
  function flare(t) {
    let f = 0;
    for (const e of events(t - 2, t)) if (e.type === 'land' || e.type === 'settle' || e.type === 'stoke') f += Math.exp(-(t - e.time) / 0.5);
    return Math.min(1, f);
  }
  // Showers of sparks from the same moments.
  function showers(t) {
    const out = [];
    for (const e of events(t - 1.6, t)) {
      if (e.type !== 'land' && e.type !== 'settle' && e.type !== 'stoke') continue;
      for (let j = 0; j < 16; j++) {
        const p = ember(Math.floor(e.time * 100) * 16 + j + 7777, t - e.time, 1.6);
        out.push({ x: p.x * 2.2, y: p.y * 1.25 - 0.1, z: p.z * 2.2, alpha: p.alpha });
      }
    }
    return out;
  }

  // ---- the fire burns down over the evening; the wizard stokes it back with the staff ----
  const BURN = 900; // seconds from a full fire to a low one
  const STOKE_LEAD = 1.5, STOKE_DUR = 5; // the wizard raises the staff 1.5 s before the fire roars back
  // The k-th stoke: about every 15 minutes (the first at 10), moved later until the wizard is free.
  const stokeCache = new Map();
  function stokeTime(k) {
    if (stokeCache.has(k)) return stokeCache.get(k);
    const busy = (x) => story('reach', x) >= 0 || story('pipe', x) >= 0 || story('stir', x) >= 0;
    let t = 600 + k * BURN;
    for (let n = 0; n < 200; n++, t += 1) {
      let free = true;
      for (let x = t - STOKE_LEAD - 0.5; x <= t + STOKE_DUR; x += 0.5) if (busy(x)) { free = false; break; }
      if (free) break;
    }
    stokeCache.set(k, t);
    return t;
  }
  function stokes(from, to) {
    const out = [];
    for (let k = Math.max(0, Math.floor((from - 600) / BURN) - 1); 600 + k * BURN < to; k++) {
      const s = stokeTime(k);
      if (s >= from && s < to) out.push(s);
    }
    return out;
  }
  // How much the fire has to burn: 1 full … 0.35 low embers. It starts full when the page opens,
  // burns down, and jumps back up over 2 s at each stoke.
  const burn = (age) => 1 - 0.65 * Math.pow(Math.min(1, age / BURN), 1.3);
  function fuel(t) {
    let i = -1;
    for (let k = Math.max(0, Math.floor((t - 600) / BURN) - 1); stokeTime(k) <= t; k++) i = k;
    if (i < 0) return burn(t);
    const last = stokeTime(i), before = burn(last - (i > 0 ? stokeTime(i - 1) : 0));
    return before + (burn(t - last) - before) * smooth((t - last) / 2);
  }

  // ---- seasons, from the calendar (northern hemisphere) ----
  const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
  function season(month) { // 0 = January
    return month === 11 || month <= 1 ? 'winter' : month <= 4 ? 'spring' : month <= 7 ? 'summer' : 'autumn';
  }
  // A falling leaf, `age` s into a `life` s fall: tumbles down from the treetops, drifting with the wind.
  function leaf(seed, age, life) {
    const r = rng(seed * 4517 + 3);
    const a = r() * Math.PI * 2, rad = 1.2 + r() * 7, h = 4 + r() * 3, spin = 2 + r() * 3;
    if (age >= life) return { x: 0, y: 0, z: 0, spin: 0, alpha: 0 };
    const u = age / life;
    return {
      x: Math.cos(a) * rad + 0.8 * u + 0.25 * Math.sin(age * 1.7 + seed),
      y: h * (1 - u),
      z: Math.sin(a) * rad + 0.25 * Math.cos(age * 1.3 + seed),
      spin: age * spin,
      alpha: 1,
    };
  }
  // Snowflake i: falls through a 20 × 8.5 × 20 box around the fire, swaying.
  function snowflake(i, t) {
    const r = rng(i * 7349 + 11);
    const x0 = (r() - 0.5) * 20, z0 = (r() - 0.5) * 20, v = 0.45 + r() * 0.4, ph = r() * 8.5;
    return { x: x0 + 0.3 * Math.sin(t * 0.7 + i), y: 8 - ((t * v + ph) % 8.5), z: z0 + 0.3 * Math.cos(t * 0.6 + i * 1.3) };
  }

  // ---- turning around the fire ----
  const PITCH_MIN = 0.03, PITCH_MAX = 0.55;
  // One step of the view: yaw/pitch move by their speed, which eases off; yaw wraps, pitch stays in range.
  function orbit(s, dt) {
    const k = Math.exp(-3.5 * dt);
    let yaw = s.yaw + s.vyaw * dt;
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    const pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, s.pitch + s.vpitch * dt));
    return { yaw, pitch, vyaw: s.vyaw * k, vpitch: s.vpitch * k };
  }

  // The pixel canvas: about `rows` pixels on the short side, same aspect as the window.
  function renderSize(w, h, rows) {
    rows = rows || 216;
    if (!(w > 0 && h > 0)) return { w: Math.round(rows * 16 / 9), h: rows };
    const k = rows / Math.min(w, h);
    return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
  }

  // The palette every pixel snaps to, sampled from the art reference.
  const PALETTE = [
    0x05070c, 0x0a0f1a, 0x101828, 0x182338, 0x22304a, 0x31445e, 0x4a6280, 0x8fa6c4, 0xd6e0ec, // night, moon
    0x0d1612, 0x16241b, 0x213425, 0x2f4a30, // forest
    0x150e0b, 0x24170f, 0x3a2416, 0x55341d, 0x744726, 0x96603a, // wood, earth
    0x2c1a28, 0x45293e, // robe
    0x6e2a1f, 0x9b3a1c, 0xc8561b, 0xe8812c, 0xf8b347, 0xffe08a, 0xfff6d6, // fire, red cloth
    0x5e5650, 0x9a948c, 0xcfc8bb, // stone, beard
    0xb7d65a, // firefly
    0xb87a50, 0xd8a070, 0xe8e2d4, 0xb03a28, 0x3a3f4a, 0xc09040, 0x5e3a56, 0x4a2c18, // skin, shirt, red, hakama, gold, robe, hair
  ];

  const CampAnim = { rng, noise1, flicker, breath, envelope, doze, ember, smoke, renderSize, PALETTE, smooth,
    fireHeat, noise2, fireColor, FIRE_MAX, pops, bursts, wind, owls, chirps, CRICKETS, orbit, PITCH_MIN, PITCH_MAX,
    STORIES, story, dozeAt, since, keyframes, win, events, stokeTime, stokes, fuel, STOKE_LEAD, STOKE_DUR, BURN, flare, showers, SEASONS, season, leaf, snowflake, TWIG_LAND, PUFFS, DRAW, SHEATHE, SNAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = CampAnim;
  else root.CampAnim = CampAnim;
})(typeof window !== 'undefined' ? window : globalThis);
