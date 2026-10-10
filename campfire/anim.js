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
      alpha: 0.2 * Math.sin(Math.PI * u),
    };
  }

  // The pixel canvas: about `rows` pixels on the short side, same aspect as the window.
  function renderSize(w, h, rows) {
    rows = rows || 180;
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
  ];

  const CampAnim = { rng, noise1, flicker, breath, envelope, doze, ember, smoke, renderSize, PALETTE, smooth };
  if (typeof module !== 'undefined' && module.exports) module.exports = CampAnim;
  else root.CampAnim = CampAnim;
})(typeof window !== 'undefined' ? window : globalThis);
