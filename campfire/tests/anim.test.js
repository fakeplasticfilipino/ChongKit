// Run with: node --test campfire/tests
const test = require('node:test');
const assert = require('node:assert');
const A = require('../anim.js');

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

test('rng is seeded, repeatable and in [0, 1)', () => {
  const a = A.rng(7), b = A.rng(7), c = A.rng(8);
  const xs = Array.from({ length: 500 }, () => a());
  assert.deepStrictEqual(xs, Array.from({ length: 500 }, () => b()));
  assert.notStrictEqual(xs[0], c());
  for (const x of xs) assert.ok(x >= 0 && x < 1);
});

test('noise is smooth and stays in [-1, 1]', () => {
  for (let x = 0; x < 50; x += 0.01) {
    const n = A.noise1(x, 3);
    assert.ok(n >= -1 && n <= 1, `noise ${n} at ${x}`);
    close(A.noise1(x + 0.001, 3), n, 0.02, `jump at ${x}`);
  }
  assert.notStrictEqual(A.noise1(1.5, 1), A.noise1(1.5, 2));
});

test('fire flicker stays between 0.7 and 1.3 and moves', () => {
  const vals = [];
  for (let t = 0; t < 30; t += 0.05) vals.push(A.flicker(t));
  for (const v of vals) assert.ok(v >= 0.7 && v <= 1.3, `flicker ${v}`);
  assert.ok(Math.max(...vals) - Math.min(...vals) > 0.2, 'flicker barely moves');
});

test('breathing is periodic and in [0, 1]', () => {
  for (let t = 0; t < 20; t += 0.1) {
    const b = A.breath(t, 4, 0.3);
    assert.ok(b >= 0 && b <= 1);
    close(A.breath(t + 4, 4, 0.3), b, 1e-9, 'period');
  }
});

test('idle envelope: 0 outside its window, 1 in the middle, smooth edges', () => {
  // every 10 s, starting at 3 s, lasting 4 s
  assert.strictEqual(A.envelope(1, 10, 3, 4), 0);
  assert.strictEqual(A.envelope(8, 10, 3, 4), 0);
  assert.strictEqual(A.envelope(5, 10, 3, 4), 1);
  assert.strictEqual(A.envelope(15, 10, 3, 4), 1);
  for (let t = 0; t < 30; t += 0.01) {
    const e = A.envelope(t, 10, 3, 4);
    assert.ok(e >= 0 && e <= 1);
    close(A.envelope(t + 0.01, 10, 3, 4), e, 0.05, `jump at ${t}`);
  }
});

test('dozing: creeps down slowly, snaps back fast, 0 outside its window', () => {
  // every 20 s, starting at 5 s, lasting 8 s
  assert.strictEqual(A.doze(2, 20, 5, 8), 0);
  assert.strictEqual(A.doze(14, 20, 5, 8), 0);
  assert.ok(A.doze(7, 20, 5, 8) < A.doze(10, 20, 5, 8), 'creeps up');
  assert.ok(A.doze(12, 20, 5, 8) > 0.95, 'nearly asleep');
  assert.ok(A.doze(12.95, 20, 5, 8) < 0.05, 'awake again');
  for (let t = 0; t < 40; t += 0.1) { const d = A.doze(t, 20, 5, 8); assert.ok(d >= 0 && d <= 1); }
});

test('embers rise and fade out by the end of their life', () => {
  const start = A.ember(5, 0, 3), mid = A.ember(5, 1.5, 3), end = A.ember(5, 3, 3);
  assert.ok(mid.y > start.y, 'rises');
  assert.ok(start.alpha > 0 && mid.alpha > 0);
  assert.strictEqual(end.alpha, 0);
  assert.strictEqual(A.ember(5, 9, 3).alpha, 0);
  assert.deepStrictEqual(A.ember(5, 1, 3), A.ember(5, 1, 3));
});

test('smoke rises, grows and thins out', () => {
  const a = A.smoke(2, 0.5, 6), b = A.smoke(2, 5, 6);
  assert.ok(b.y > a.y && b.scale > a.scale);
  assert.strictEqual(A.smoke(2, 6, 6).alpha, 0);
  assert.ok(a.alpha > 0 && a.alpha <= 1);
});

test('render size keeps the aspect at about 216 rows', () => {
  assert.deepStrictEqual(A.renderSize(1600, 900), { w: 384, h: 216 });
  assert.deepStrictEqual(A.renderSize(900, 1600), { w: 216, h: 384 });
  const s = A.renderSize(1, 1);
  assert.ok(s.w >= 1 && s.h >= 1);
  const t = A.renderSize(0, 0);
  assert.ok(t.w >= 1 && t.h >= 1);
});

test('palette: 48 or fewer colours (the shader holds 48), all valid', () => {
  assert.ok(A.PALETTE.length >= 8 && A.PALETTE.length <= 48);
  for (const c of A.PALETTE) assert.ok(Number.isInteger(c) && c >= 0 && c <= 0xffffff);
});

test('fire pops: repeatable, inside the range, split ranges agree, a few per second', () => {
  const all = A.pops(0, 60);
  assert.deepStrictEqual(all, A.pops(0, 60));
  assert.deepStrictEqual(all, [...A.pops(0, 23.3), ...A.pops(23.3, 60)]);
  for (const p of all) {
    assert.ok(p.time >= 0 && p.time < 60);
    assert.ok(p.strength >= 0.3 && p.strength <= 1);
  }
  const rate = all.length / 60;
  assert.ok(rate > 0.8 && rate < 5, `rate ${rate}`);
});

test('ember bursts come only from strong pops in the last second', () => {
  let seen = 0;
  for (let t = 1; t < 60; t += 0.25) {
    const b = A.bursts(t);
    const strong = A.pops(t - 1, t).filter((p) => p.strength >= 0.7).length;
    assert.strictEqual(b.length, strong * 3);
    for (const e of b) assert.ok(e.alpha >= 0 && e.alpha <= 1);
    seen += b.length;
  }
  assert.ok(seen > 0);
});

test('wind is smooth and in [0, 1]', () => {
  for (let t = 0; t < 200; t += 0.05) {
    const w = A.wind(t);
    assert.ok(w >= 0 && w <= 1);
    close(A.wind(t + 0.05), w, 0.02, `gust at ${t}`);
  }
});

test('owl hoots every 60–120 s', () => {
  const hoots = A.owls(0, 3600);
  assert.ok(hoots.length >= 30 && hoots.length <= 60);
  for (let i = 1; i < hoots.length; i++) {
    const gap = hoots[i] - hoots[i - 1];
    assert.ok(gap >= 60 && gap <= 120, `gap ${gap}`);
  }
  assert.deepStrictEqual(hoots, [...A.owls(0, 1000), ...A.owls(1000, 3600)]);
});

test('crickets take turns: each sings only in its window, never all silent for long', () => {
  const cs = A.chirps(0, 300);
  for (const c of cs) {
    const k = A.CRICKETS[c.cricket];
    assert.ok(A.envelope(c.time, k.period, k.offset, k.dur) > 0);
  }
  assert.deepStrictEqual(new Set(cs.map((c) => c.cricket)).size, 3);
  for (let i = 1; i < cs.length; i++) assert.ok(cs[i].time >= cs[i - 1].time);
  for (let i = 1; i < cs.length; i++) assert.ok(cs[i].time - cs[i - 1].time < 20, 'long silence');
});

test('orbit: speed eases off, yaw wraps, pitch stays in range', () => {
  let s = { yaw: 3, pitch: 0.2, vyaw: 2, vpitch: 5 };
  for (let i = 0; i < 300; i++) s = A.orbit(s, 1 / 60);
  assert.ok(Math.abs(s.vyaw) < 0.01 && Math.abs(s.vpitch) < 0.03);
  assert.ok(s.yaw > -Math.PI && s.yaw <= Math.PI);
  assert.strictEqual(s.pitch, A.PITCH_MAX);
  s = A.orbit({ yaw: 0, pitch: 0.2, vyaw: 0, vpitch: -100 }, 1);
  assert.strictEqual(s.pitch, A.PITCH_MIN);
  s = A.orbit({ yaw: 1, pitch: 0.2, vyaw: 0, vpitch: 0 }, 1);
  assert.deepStrictEqual(s, { yaw: 1, pitch: 0.2, vyaw: 0, vpitch: 0 });
});

test('noise2 is smooth and stays in [-1, 1]', () => {
  for (let x = 0; x < 6; x += 0.07) for (let y = 0; y < 6; y += 0.11) {
    const n = A.noise2(x, y, 4);
    assert.ok(n >= -1 && n <= 1);
    close(A.noise2(x + 0.001, y, 4), n, 0.02, 'jump');
  }
});

test('pixel fire: hot at the base, clear at the top and the sides, keeps moving', () => {
  for (let t = 0; t < 20; t += 0.37) {
    assert.ok(A.fireHeat(0, 0.03, t, 1) > A.FIRE_MAX * 0.8, 'hot core');
    for (let u = -0.5; u <= 0.5; u += 0.05) {
      assert.strictEqual(A.fireHeat(u, 0.99, t, 1) < 3, true, 'clear at the top');
      const h = A.fireHeat(u, 0.5, t, 1);
      assert.ok(h >= 0 && h <= A.FIRE_MAX);
    }
    assert.ok(A.fireHeat(-0.5, 0.2, t, 1) < 3 && A.fireHeat(0.5, 0.2, t, 1) < 3, 'clear at the sides');
  }
  let diff = 0;
  for (let u = -0.4; u <= 0.4; u += 0.05) for (let v = 0.1; v < 0.9; v += 0.05) diff += Math.abs(A.fireHeat(u, v, 1, 1) - A.fireHeat(u, v, 1.3, 1));
  assert.ok(diff > 50, 'flames move');
  assert.ok(A.fireHeat(0, 0.75, 2, 1.4) >= A.fireHeat(0, 0.75, 2, 1), 'grow makes it taller');
});

test('fire colours: clear when cold, a colour for every hotter heat', () => {
  assert.strictEqual(A.fireColor(0), null);
  assert.strictEqual(A.fireColor(2), null);
  for (let v = 3; v <= A.FIRE_MAX; v++) assert.ok(Number.isInteger(A.fireColor(v)));
  assert.strictEqual(A.fireColor(A.FIRE_MAX), 0xfff6d6);
});
