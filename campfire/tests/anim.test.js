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

test('stories: one figure never runs two at once', () => {
  const pairs = [['shift', 'twig'], ['reach', 'pipe'], ['reach', 'stir'], ['pipe', 'stir'], ['doze', 'katana']];
  for (let t = 0; t < 2000; t += 0.25) {
    for (const [a, b] of pairs) assert.ok(A.story(a, t) < 0 || A.story(b, t) < 0, `${a} and ${b} at ${t}`);
  }
  assert.strictEqual(A.story('twig', 28.5), 0.5);
  assert.strictEqual(A.story('twig', 27), -1);
});

test('win eases in and out inside its range only', () => {
  assert.strictEqual(A.win(0.5, 1, 5, 0.5), 0);
  assert.strictEqual(A.win(3, 1, 5, 0.5), 1);
  assert.strictEqual(A.win(6, 1, 5, 0.5), 0);
  assert.ok(A.win(1.25, 1, 5, 0.5) > 0 && A.win(1.25, 1, 5, 0.5) < 1);
});

test('events: sorted, in range, split ranges agree, each where its story says', () => {
  const all = A.events(0, 1200);
  assert.deepStrictEqual(all, [...A.events(0, 444.4), ...A.events(444.4, 1200)]);
  for (let i = 1; i < all.length; i++) assert.ok(all[i].time >= all[i - 1].time);
  const at = (type) => all.filter((e) => e.type === type).map((e) => e.time);
  for (const t of at('land')) close(A.story('twig', t), A.TWIG_LAND, 1e-6, 'land');
  for (const t of at('draw')) close(A.story('katana', t), A.DRAW, 1e-6, 'draw');
  for (const t of at('sheathe')) close(A.story('katana', t), A.SHEATHE, 1e-6, 'sheathe');
  for (const t of at('snap')) assert.ok(A.dozeAt(t - 0.05) > 0.9 && A.dozeAt(t + 1.1) < 0.1, 'snap');
  for (const t of at('puff')) assert.ok(A.story('pipe', t) >= 0, 'puff');
  for (const type of ['land', 'settle', 'snap', 'draw', 'sheathe', 'puff', 'wolf', 'star', 'eyes', 'stoke']) assert.ok(at(type).length > 0, type);
  const wolves = at('wolf');
  for (let i = 1; i < wolves.length; i++) assert.ok(wolves[i] - wolves[i - 1] >= 90 && wolves[i] - wolves[i - 1] <= 210);
});

test('flare and sparks follow landings and settles', () => {
  const land = A.events(0, 200).find((e) => e.type === 'land').time;
  assert.ok(A.flare(land + 0.05) > 0.8);
  assert.ok(A.showers(land + 0.3).length >= 16);
  assert.strictEqual(A.flare(land - 0.01) <= A.flare(land + 0.01), true);
  for (let t = 0; t < 300; t += 0.5) { const f = A.flare(t); assert.ok(f >= 0 && f <= 1); }
});

test('keyframes hold before and after, ease between, hit every key', () => {
  const keys = [[0, 1, 10], [2, 3, 20], [5, -1, 0]];
  assert.deepStrictEqual(A.keyframes(-1, keys), [1, 10]);
  assert.deepStrictEqual(A.keyframes(2, keys), [3, 20]);
  assert.deepStrictEqual(A.keyframes(9, keys), [-1, 0]);
  const mid = A.keyframes(1, keys);
  assert.ok(mid[0] > 1 && mid[0] < 3);
});

test('since counts up from each moment and wraps with the story', () => {
  close(A.since('twig', A.TWIG_LAND, 28 + A.TWIG_LAND + 1.5), 1.5, 1e-9, 'after landing');
  close(A.since('twig', 0, 28 + A.STORIES.twig.period * 3 + 0.25), 0.25, 1e-9, 'later runs');
  for (let t = 0; t < 300; t += 1.3) { const s = A.since('pipe', 4.2, t); assert.ok(s >= 0 && s < A.STORIES.pipe.period); }
});

test('stories are spaced out: each runs at most about once a minute', () => {
  for (const name of Object.keys(A.STORIES)) assert.ok(A.STORIES[name].period >= 30, name);
});

test('the fire burns down, and the wizard stokes it back when free', () => {
  close(A.fuel(0), 1, 1e-9, 'full at the start');
  assert.ok(A.fuel(500) < A.fuel(100), 'burns down');
  const s0 = A.stokeTime(0);
  assert.ok(s0 >= 600 && s0 < 800);
  assert.ok(A.fuel(s0 - 0.01) < 0.75, 'low before the stoke');
  assert.ok(A.fuel(s0 + 2.5) > 0.98, 'full after the stoke');
  for (let k = 0; k < 6; k++) {
    const s = A.stokeTime(k);
    for (let x = s - A.STOKE_LEAD; x <= s + A.STOKE_DUR; x += 0.25) assert.ok(A.story('reach', x) < 0 && A.story('pipe', x) < 0 && A.story('stir', x) < 0, 'wizard busy at ' + x);
    if (k) assert.ok(s - A.stokeTime(k - 1) > 700);
  }
  let prev = A.fuel(0);
  for (let t = 0; t < 4000; t += 0.5) {
    const f = A.fuel(t);
    assert.ok(f >= 0.34 && f <= 1.0000001, 'fuel ' + f);
    assert.ok(Math.abs(f - prev) < 0.4, 'no jumps at ' + t);
    prev = f;
  }
  assert.deepStrictEqual(A.events(0, 3000).filter((e) => e.type === 'stoke').map((e) => e.time), A.stokes(0, 3000));
});

test('seasons follow the calendar', () => {
  assert.deepStrictEqual([0, 1, 2, 4, 5, 7, 8, 10, 11].map(A.season), ['winter', 'winter', 'spring', 'spring', 'summer', 'summer', 'autumn', 'autumn', 'winter']);
});

test('leaves fall from the treetops to the ground; snow stays in its box', () => {
  for (let seed = 0; seed < 50; seed++) {
    const a = A.leaf(seed, 0.5, 10), b = A.leaf(seed, 9.5, 10);
    assert.ok(a.y > b.y && b.y >= 0 && a.y <= 7);
    assert.ok(Math.hypot(a.x, a.z) < 10);
    assert.strictEqual(A.leaf(seed, 10, 10).alpha, 0);
  }
  for (let i = 0; i < 200; i++) for (let t = 0; t < 30; t += 3.7) {
    const f = A.snowflake(i, t);
    assert.ok(f.y > -0.6 && f.y <= 8 && Math.abs(f.x) < 10.5 && Math.abs(f.z) < 10.5);
  }
});
