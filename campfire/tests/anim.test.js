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

test('render size keeps the aspect at about 180 rows', () => {
  assert.deepStrictEqual(A.renderSize(1600, 900), { w: 320, h: 180 });
  assert.deepStrictEqual(A.renderSize(900, 1600), { w: 180, h: 320 });
  const s = A.renderSize(1, 1);
  assert.ok(s.w >= 1 && s.h >= 1);
  const t = A.renderSize(0, 0);
  assert.ok(t.w >= 1 && t.h >= 1);
});

test('palette: 32 or fewer colours, all valid', () => {
  assert.ok(A.PALETTE.length >= 8 && A.PALETTE.length <= 32);
  for (const c of A.PALETTE) assert.ok(Number.isInteger(c) && c >= 0 && c <= 0xffffff);
});
