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
    whet: { period: 74, offset: 60, dur: 8 }, // samurai sharpens the blade on a whetstone
    guitar: { period: 186, offset: 173, dur: 24 }, // traveler plays the guitar (186 = 6 × shift, 3 × twig)
  };
  // Whose stories are whose (a figure never runs two at once; talks wait until both are free).
  const BUSY = { traveler: ['shift', 'twig', 'guitar'], wizard: ['reach', 'pipe', 'stir'], samurai: ['doze', 'katana', 'whet'] };
  // The samurai's dozing (0 awake … 1 asleep), on the doze story's schedule.
  const dozeAt = (t) => doze(t, STORIES.doze.period, STORIES.doze.offset, STORIES.doze.dur);
  // Seconds into the story's current run, or -1 when it isn't running.
  function scheduled(name, t) {
    const s = STORIES[name];
    const local = (((t - s.offset) % s.period) + s.period) % s.period;
    return local < s.dur ? local : -1;
  }
  // ---- clicks start a story right now, on top of the schedule ----
  const manual = []; // { name, start }; name can also be 'stoke' (the wizard raises the staff now)
  function trigger(name, t) {
    manual.push({ name, start: t });
    if (manual.length > 40) manual.shift();
  }
  function clearTriggers() { manual.length = 0; }
  function story(name, t) {
    for (let i = manual.length - 1; i >= 0; i--) {
      const m = manual[i];
      if (m.name === name && t >= m.start && t < m.start + STORIES[name].dur) return t - m.start;
    }
    return scheduled(name, t);
  }
  // 0 outside [a, b], easing to 1 over `ramp` seconds at each end. Feed it a story's local time.
  function win(local, a, b, ramp) {
    if (local < a || local > b) return 0;
    return Math.min(smooth((local - a) / ramp), smooth((b - local) / ramp));
  }
  // Seconds since the story last reached `at` seconds into its run (always 0 … period).
  function since(name, at, t) {
    const s = STORIES[name];
    let best = (((t - s.offset - at) % s.period) + s.period) % s.period;
    for (const m of manual) if (m.name === name && t - m.start - at >= 0) best = Math.min(best, t - m.start - at);
    return best;
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
  const RASPS = [1.5, 2.4, 3.3, 4.2, 5.1, 6.0]; // whetstone strokes
  // The guitar: Creep's chords, G – B – C – Cm, a bar each, twice through, strummed down, down-up, up-down-up,
  // then a last G. The same for every run. [{ at, chord, dir (1 down, -1 up), beat, first, last }]
  const BEAT = 60 / 92; // about the song's tempo
  const CHORDS = [
    { name: 'G', notes: [98.0, 123.47, 146.83, 196.0, 246.94, 392.0] }, // 320003
    { name: 'B', notes: [123.47, 185.0, 246.94, 311.13, 369.99] }, // x24442
    { name: 'C', notes: [130.81, 164.81, 196.0, 261.63, 329.63] }, // x32010
    { name: 'Cm', notes: [130.81, 196.0, 261.63, 311.13, 392.0] }, // x35543
  ];
  const PATTERN = [[0, 1], [1, 1], [1.5, -1], [2.5, -1], [3, 1], [3.5, -1]]; // [beat, direction]
  const GUITAR_IN = 1.5; // seconds to settle the guitar on the lap
  function strums() {
    const out = [];
    for (let bar = 0; bar < 8; bar++) {
      for (const [b, dir] of PATTERN) out.push({ at: GUITAR_IN + (bar * 4 + b) * BEAT, chord: bar % 4, dir, beat: b, first: b === 0, last: false });
    }
    out.push({ at: GUITAR_IN + 32 * BEAT, chord: 0, dir: 1, beat: 0, first: true, last: true }); // end on G, let it ring
    return out;
  }

  // ---- campfire talk: two of them murmur (wordless), the other nods; sometimes they all laugh ----
  const TALK = { period: 53, offset: 15, dur: 9 };
  const PAIRS = [['wizard', 'traveler'], ['traveler', 'samurai'], ['samurai', 'wizard'], ['traveler', 'wizard'], ['wizard', 'samurai'], ['samurai', 'traveler']];
  const talkCache = new Map();
  // Is this pair free for a talk starting at `start`? (Their scheduled stories, and no stoke.)
  function freeFor(speaker, listener, start) {
    for (let x = start - 1; x <= start + TALK.dur + 1; x += 0.5) {
      for (const n of BUSY[speaker].concat(BUSY[listener])) if (n !== 'shift' && scheduled(n, x) >= 0) return false;
    }
    if (speaker === 'wizard' || listener === 'wizard') {
      const k0 = Math.floor((start - 600) / BURN);
      for (let i = Math.max(0, k0 - 1); i <= k0 + 1; i++) {
        const st = stokeTime(i);
        if (st > start - STOKE_DUR - 1 && st < start + TALK.dur + STOKE_LEAD + 1) return false;
      }
    }
    return true;
  }
  // The k-th talk: the first moment in its slot when some pair is free (or null): who speaks, who
  // listens, and its sounds.
  function talk(k) {
    if (talkCache.has(k)) return talkCache.get(k);
    let start = -1, speaker, listener;
    for (let d = 0; k >= 0 && start < 0 && d <= 30; d += 1) {
      for (let p = 0; p < PAIRS.length; p++) {
        const pair = PAIRS[(k + p) % PAIRS.length], at = k * TALK.period + TALK.offset + d;
        if (freeFor(pair[0], pair[1], at)) { start = at; speaker = pair[0]; listener = pair[1]; break; }
      }
    }
    const ok = start >= 0;
    let out = null;
    if (ok) {
      const r = rng(k * 271 + 13), syl = [];
      let at = 0.6;
      while (at < TALK.dur - 2) { // phrases of a few syllables, with pauses the listener fills
        const n = 2 + ((r() * 4) | 0);
        for (let i = 0; i < n; i++) { syl.push({ who: speaker, at, rise: r() - 0.5 }); at += 0.17 + r() * 0.12; }
        at += 0.25;
        if (r() < 0.6) {
          syl.push({ who: listener, at, rise: 0.3, reply: true });
          syl.push({ who: listener, at: at + 0.2, rise: -0.3, reply: true });
          at += 0.4;
        }
        at += 0.35 + r() * 0.6;
      }
      out = { k, start, speaker, listener, syl, laugh: r() < 0.4 };
    }
    talkCache.set(k, out);
    return out;
  }
  // The talk going on at t: { speaker, listener, local, laugh, ... } or null.
  function talkAt(t) {
    const k = Math.floor((t - TALK.offset) / TALK.period);
    for (const j of [k, k - 1]) {
      const c = j >= 0 && talk(j);
      if (c && t >= c.start && t - c.start < TALK.dur) return Object.assign({ local: t - c.start }, c);
    }
    return null;
  }

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
      for (const m of manual) if (m.name === name && m.start + at >= from && m.start + at < to) out.push({ type, time: m.start + at });
    };
    each('twig', TWIG_LAND, 'land');
    each('doze', SNAP, 'snap');
    each('katana', DRAW, 'draw');
    each('katana', SHEATHE, 'sheathe');
    PUFFS.forEach((p) => each('pipe', p, 'puff'));
    RASPS.forEach((p) => each('whet', p, 'rasp'));
    const gs = STORIES.guitar, song = strums(); // the guitar's strums
    const strumEv = (start) => {
      for (const n of song) {
        const time = start + n.at;
        if (time >= from && time < to) out.push({ type: 'strum', time, chord: n.chord, dir: n.dir, beat: n.beat, first: n.first, last: n.last });
      }
    };
    for (let k = Math.floor((from - gs.offset - gs.dur) / gs.period); k * gs.period + gs.offset < to; k++) strumEv(k * gs.period + gs.offset);
    for (const m of manual) if (m.name === 'guitar') strumEv(m.start);
    for (let k = Math.max(0, Math.floor((from - TALK.offset) / TALK.period) - 1); k * TALK.period + TALK.offset < to; k++) {
      const c = talk(k);
      if (!c) continue;
      for (const y of c.syl) {
        const time = c.start + y.at;
        if (time >= from && time < to) out.push({ type: 'syl', time, who: y.who, rise: y.rise, reply: !!y.reply });
      }
      const lt = c.start + TALK.dur - 1.6;
      if (c.laugh && lt >= from && lt < to) out.push({ type: 'laugh', time: lt });
    }
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
    for (const th of thunders(from, to)) out.push({ type: 'thunder', time: th });
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
    const busy = (x) => scheduled('reach', x) >= 0 || scheduled('pipe', x) >= 0 || scheduled('stir', x) >= 0;
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
    for (const m of manual) if (m.name === 'stoke' && m.start + STOKE_LEAD >= from && m.start + STOKE_LEAD < to) out.push(m.start + STOKE_LEAD);
    return out.sort((a, b) => a - b);
  }
  // How much the fire has to burn: 1 full … 0.35 low embers. It starts full when the page opens,
  // burns down, and jumps back up over 2 s at each stoke.
  const burn = (age) => 1 - 0.65 * Math.pow(Math.min(1, age / BURN), 1.3);
  function fuel(t) {
    let last = -1;
    for (let k = Math.max(0, Math.floor((t - 600) / BURN) - 1); stokeTime(k) <= t; k++) last = stokeTime(k);
    for (const m of manual) if (m.name === 'stoke' && m.start + STOKE_LEAD <= t) last = Math.max(last, m.start + STOKE_LEAD);
    if (last < 0) return burn(t);
    const before = fuel(last - 1e-3); // how low it was when stoked
    return before + (burn(t - last) - before) * smooth((t - last) / 2);
  }

  // ---- forest visitors ----
  // When the k-th visit of a kind starts: one per slot, somewhere inside it.
  const visitStart = (k, len, base, spread, salt) => k * len + base + rng(k * 977 + salt)() * spread;
  function visitAt(t, len, base, spread, dur, salt) {
    const k = Math.floor((t - base) / len);
    for (const j of [k, k - 1]) {
      if (j < 0) continue;
      const s = visitStart(j, len, base, spread, salt);
      if (t >= s && t < s + dur) return { local: t - s, k: j };
    }
    return null;
  }
  // The fox: trots out of the trees behind the wizard, sits and watches the fire, trots back off.
  // { x, z, yaw (facing), walk (gait 0–1), sit 0–1 } or null when it's away.
  const FOX_DIR = -1.95, FOX_SIT = 4.6;
  function foxAt(t) {
    const v = visitAt(t, 330, 40, 200, 34, 3);
    if (!v) return null;
    const L = v.local, ca = Math.cos(FOX_DIR), sa = Math.sin(FOX_DIR);
    let r, out = false, walk = 0, sit = 0;
    if (L < 9) { r = 10 - (10 - FOX_SIT) * (L / 9); walk = 1; }
    else if (L < 25) { r = FOX_SIT; sit = Math.min(smooth((L - 9) / 1.5), smooth((25 - L) / 1.2)); }
    else if (L < 26.5) { r = FOX_SIT; out = L > 25.75; }
    else { r = FOX_SIT + (10.5 - FOX_SIT) * ((L - 26.5) / 7.5); walk = 1; out = true; }
    const x = ca * r, z = sa * r;
    const yaw = Math.atan2(-x, -z) + (out ? Math.PI : 0);
    return { x, z, yaw, walk, sit, local: L };
  }
  // The deer: steps out between the far trees, pauses and listens, startles and bounds away.
  // { x, z, yaw, walk, bound (0–1 leaping), alert (head up) } or null.
  function deerAt(t) {
    const v = visitAt(t, 420, 200, 150, 22, 5);
    if (!v) return null;
    const L = v.local, a0 = -1.45 + (rng(v.k * 31 + 9)() - 0.5) * 0.1; // the gap between the wizard and the lantern post
    let a = a0, r = 8.2, walk = 0, bound = 0, alert = 0, yaw;
    if (L < 4) { a = a0 - 0.12 * (1 - L / 4); walk = 1; yaw = -a; } // stepping out sideways, along the circle
    else if (L < 15) { alert = L > 12 ? 1 : 0.3 + 0.2 * Math.sin(L); yaw = Math.atan2(-Math.cos(a) * r, -Math.sin(a) * r); } // facing the fire
    else { const u = (L - 15) / 7; r = 8.2 + 6 * u; bound = 1; yaw = Math.atan2(Math.cos(a), Math.sin(a)); } // away
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, yaw, walk, bound, alert, local: L };
  }

  // ---- showers: one chance every 12 minutes; most bring 60–100 s of rain (snow in winter) ----
  function shower(k) {
    const r = rng(k * 53 + 17);
    const start = k * 720 + 150 + r() * 400, dur = 60 + r() * 40, happens = r() < 0.75, second = r() < 0.5;
    return { start, dur, happens, thunder: happens ? [start + dur * 0.3].concat(second ? [start + dur * 0.68] : []) : [] };
  }
  // How hard it's raining, 0–1: eases in over 10 s and out over 12 s.
  function rainAt(t) {
    const k = Math.floor((t - 150) / 720);
    for (const j of [k, k - 1]) {
      if (j < 0) continue;
      const w = shower(j);
      if (w.happens && t >= w.start && t < w.start + w.dur) return Math.min(smooth((t - w.start) / 10), smooth((w.start + w.dur - t) / 12));
    }
    return 0;
  }
  function thunders(from, to) {
    const out = [];
    for (let k = Math.max(0, Math.floor((from - 150) / 720) - 1); k * 720 + 150 < to; k++) for (const th of shower(k).thunder) if (th >= from && th < to) out.push(th);
    return out;
  }
  // Sheet lightning, 0–1: a double flicker, then a fading glow.
  function flash(t) {
    let f = 0;
    for (const th of thunders(t - 1, t)) {
      const a = t - th;
      f = Math.max(f, a < 0.06 ? 1 : a < 0.12 ? 0.2 : a < 0.2 ? 0.8 : 0.4 * Math.exp(-(a - 0.2) / 0.12));
    }
    return f;
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

  // Whose moment an event is (so the walker's own sounds can pause), or null for everyone's.
  const EVENT_OWNER = { land: 'traveler', strum: 'traveler', puff: 'wizard', snap: 'samurai', draw: 'samurai', sheathe: 'samurai', rasp: 'samurai' };
  const eventOwner = (e) => e.who || EVENT_OWNER[e.type] || null;

  // ---- walking around the camp ----
  // Push a walker (a circle at x, z with radius r) out of obstacles [[cx, cz, cr], …] and keep it inside
  // the treeline (distance maxR from the fire). Returns [x, z].
  function collide(x, z, r, circles, maxR) {
    for (let pass = 0; pass < 3; pass++) {
      for (const [cx, cz, cr] of circles) {
        const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz), min = r + cr;
        if (d >= min) continue;
        if (d < 1e-6) { x = cx + min; continue; }
        x = cx + (dx / d) * min;
        z = cz + (dz / d) * min;
      }
      const d0 = Math.hypot(x, z), lim = maxR - r;
      if (d0 > lim) { x *= lim / d0; z *= lim / d0; }
    }
    return [x, z];
  }
  // A walking step: phase in radians (one stride = 2π). For each leg [left, right]: hip swing, knee bend;
  // arms swing against the legs. Swings scale with speed (0 standing … 1 walking … 1.6 running).
  function gait(phase, speed) {
    const k = Math.min(1.6, speed);
    const leg = (off) => ({ hip: 0.5 * k * Math.sin(phase + off), knee: -0.8 * k * Math.max(0, Math.sin(phase + off + Math.PI / 2)) });
    return { legs: [leg(0), leg(Math.PI)], arms: [0.4 * k * Math.sin(phase + Math.PI), 0.4 * k * Math.sin(phase)] };
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
    fireHeat, noise2, fireColor, FIRE_MAX, pops, bursts, wind, owls, chirps, CRICKETS, orbit, PITCH_MIN, PITCH_MAX, collide, gait, eventOwner,
    STORIES, BUSY, story, trigger, talk, talkAt, TALK, strums, CHORDS, BEAT, RASPS, clearTriggers, dozeAt, since, keyframes, win, events, stokeTime, stokes, fuel, STOKE_LEAD, STOKE_DUR, BURN, flare, showers, rainAt, thunders, flash, foxAt, deerAt, FOX_DIR, FOX_SIT, SEASONS, season, leaf, snowflake, TWIG_LAND, PUFFS, DRAW, SHEATHE, SNAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = CampAnim;
  else root.CampAnim = CampAnim;
})(typeof window !== 'undefined' ? window : globalThis);
