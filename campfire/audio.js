// Campfire: the sound, made in the browser with Web Audio (no sound files).
// Fire roar and pops, wind, crickets, an owl. The timing comes from anim.js, so the pops match the
// embers you see and the wind matches the swaying trees. Browsers only allow sound after the first
// click, tap or key, so `start()` is called then. Browser global `CampAudio`.
(function () {
  'use strict';
  const A = window.CampAnim;
  let ctx, master, noise, roar, hiss, windGain, windFilter, echo, rustle;
  let offset = null, scheduled = 0;

  function loop(dest) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    s.loopStart = 0;
    s.start(0, Math.random() * 2);
    s.connect(dest);
    return s;
  }
  function filter(type, freq, q) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q) f.Q.value = q;
    return f;
  }
  function gain(v, dest) {
    const g = ctx.createGain();
    g.gain.value = v;
    if (dest) g.connect(dest);
    return g;
  }
  function pan(p, dest) {
    if (!ctx.createStereoPanner) return dest;
    const n = ctx.createStereoPanner();
    n.pan.value = p;
    n.connect(dest);
    return n;
  }

  function start() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    master = gain(0.9, comp);

    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // fire: a low roar and a faint hiss
    roar = gain(0.1, master);
    const lp = filter('lowpass', 320, 0.7);
    loop(lp); lp.connect(roar);
    hiss = gain(0.006, master);
    const hp = filter('highpass', 4000);
    loop(hp); hp.connect(hiss);

    // wind through the trees
    windGain = gain(0, master);
    windFilter = filter('bandpass', 450, 0.8);
    windFilter.connect(windGain);
    loop(windFilter);

    // leaves rustling in strong gusts
    rustle = gain(0, master);
    const leaves = filter('highpass', 2600);
    leaves.connect(rustle);
    loop(leaves);

    // a soft echo for faraway sounds (owl, wolf)
    echo = ctx.createDelay(1);
    echo.delayTime.value = 0.23;
    const fb = gain(0.32, echo);
    echo.connect(fb);
    echo.connect(gain(0.5, master));
  }

  // one snap or pop from the fire
  function pop(at, strength) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = filter('bandpass', 900 + Math.random() * 3200, 1.2);
    const g = gain(0);
    src.connect(bp); bp.connect(g); g.connect(pan((Math.random() - 0.5) * 0.4, master));
    const len = 0.012 + 0.05 * strength * Math.random();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.55 * strength, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0005, at + len);
    src.start(at, Math.random() * 1.8, len + 0.02);
  }

  // one chirp: three quick pulses of a high tone
  const CRICKET_PAN = [-0.6, 0.55, 0.1], CRICKET_FREQ = [4300, 4700, 4050];
  function chirp(at, i) {
    const o = ctx.createOscillator();
    o.frequency.value = CRICKET_FREQ[i];
    const g = gain(0);
    o.connect(g); g.connect(pan(CRICKET_PAN[i], master));
    for (let p = 0; p < 3; p++) {
      const s = at + p * 0.045;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.012, s + 0.006);
      g.gain.linearRampToValueAtTime(0, s + 0.028);
    }
    o.start(at);
    o.stop(at + 0.2);
  }

  // a distant owl: "hoo ... hoo-hoo"
  function owl(at) {
    const out = pan(-0.45, master);
    const lp = filter('lowpass', 900);
    lp.connect(out); lp.connect(echo);
    [[0, 0.42], [0.75, 0.22], [1.02, 0.34]].forEach(([dt, len]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const s = at + dt;
      o.frequency.setValueAtTime(400, s);
      o.frequency.linearRampToValueAtTime(355, s + len);
      const g = gain(0);
      o.connect(g); g.connect(lp);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.06, s + 0.06);
      g.gain.setValueAtTime(0.06, s + len - 0.08);
      g.gain.linearRampToValueAtTime(0, s + len);
      o.start(s);
      o.stop(s + len + 0.05);
    });
  }

  // ---- the moments from anim.js's events ----
  function noiseHit(at, type, freq, q, len, vol, dest) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = filter(type, freq, q);
    const g = gain(0);
    src.connect(f); f.connect(g); g.connect(dest || master);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + Math.min(0.02, len * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0005, at + len);
    src.start(at, Math.random() * 1.5, len + 0.05);
    return f;
  }
  function thump(at, freq, len, vol) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(freq * 0.55, at + len);
    const g = gain(0, master);
    o.connect(g);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0005, at + len);
    o.start(at);
    o.stop(at + len + 0.05);
  }
  function crackle(at, n, spread) {
    for (let i = 0; i < n; i++) pop(at + Math.random() * spread, 0.4 + Math.random() * 0.6);
  }
  function swoosh(at, f0, f1, len, vol) {
    const f = noiseHit(at, 'bandpass', f0, 2, len, vol);
    f.frequency.setValueAtTime(f0, at);
    f.frequency.exponentialRampToValueAtTime(f1, at + len);
  }
  function ring(at, freqs, len, vol) {
    const out = pan(0.45, master);
    freqs.forEach((fr, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = fr;
      const g = gain(0, out);
      o.connect(g);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol / (i + 1), at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0003, at + len / (1 + i * 0.4));
      o.start(at);
      o.stop(at + len + 0.05);
    });
  }
  function creak(at) {
    const out = pan(0.45, master);
    const f = noiseHit(at, 'bandpass', 650, 9, 0.35, 0.25, out);
    f.frequency.setValueAtTime(650, at);
    f.frequency.linearRampToValueAtTime(820, at + 0.3);
    for (let i = 0; i < 2; i++) noiseHit(at + 0.05 + i * 0.09, 'bandpass', 1800, 3, 0.04, 0.12, out); // plates clacking
  }
  function howl(at) {
    const out = pan(0.55, master);
    const lp = filter('lowpass', 1400);
    lp.connect(out); lp.connect(echo);
    [1, 2].forEach((h) => {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(280 * h, at);
      o.frequency.linearRampToValueAtTime(520 * h, at + 0.7);
      o.frequency.linearRampToValueAtTime(480 * h, at + 2.0);
      o.frequency.linearRampToValueAtTime(360 * h, at + 3.0);
      const vib = ctx.createOscillator(), vg = gain(6 * h);
      vib.frequency.value = 5;
      vib.connect(vg); vg.connect(o.frequency);
      const g = gain(0, lp);
      o.connect(g);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.035 / h, at + 0.5);
      g.gain.setValueAtTime(0.035 / h, at + 2.3);
      g.gain.linearRampToValueAtTime(0, at + 3.0);
      o.start(at); vib.start(at);
      o.stop(at + 3.1); vib.stop(at + 3.1);
    });
  }
  // the wizard's stoke: a rising shimmer as the staff goes up (a second before)…
  function shimmer(at) {
    const out = pan(0, master);
    [523, 659, 784, 1047, 1319].forEach((fr, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = fr;
      const g = gain(0, out);
      o.connect(g);
      const s = at - 1.0 + i * 0.12;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.02, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0003, s + 1.4);
      o.start(s);
      o.stop(s + 1.5);
    });
  }
  // …then the fire whooms back up
  function stoke(at) {
    const f = noiseHit(at, 'lowpass', 300, 0.7, 1.4, 0.5);
    f.frequency.setValueAtTime(300, at);
    f.frequency.exponentialRampToValueAtTime(1400, at + 0.4);
    thump(at, 70, 0.6, 0.3);
    crackle(at + 0.1, 16, 1.4);
  }
  function play(e, at) {
    switch (e.type) {
      case 'land': thump(at, 120, 0.25, 0.25); crackle(at, 9, 0.6); break;
      case 'settle': thump(at, 85, 0.45, 0.3); noiseHit(at, 'lowpass', 500, 1, 0.35, 0.2); crackle(at + 0.05, 14, 0.9); break;
      case 'snap': creak(at); break;
      case 'draw': swoosh(at - 0.25, 2500, 6000, 0.3, 0.05); ring(at, [2350, 3610, 5230], 1.6, 0.025); break;
      case 'sheathe': swoosh(at - 0.3, 5000, 2000, 0.3, 0.04); noiseHit(at, 'bandpass', 1200, 4, 0.06, 0.2); break;
      case 'puff': noiseHit(at, 'bandpass', 1100, 0.8, 0.9, 0.05); break;
      case 'wolf': howl(at); break;
      case 'stoke': stoke(at); break;
      case 'eyes': noiseHit(at + 0.3, 'bandpass', 1500, 2, 0.05, 0.08, pan(0, master)); break; // a twig snaps out there
    }
  }

  // called every frame with the scene's clock (seconds); schedules what's coming in the next 0.3 s
  function update(t) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (offset === null || Math.abs(now - (t + offset)) > 0.25) { offset = now - t; scheduled = t; }
    if (scheduled < t) scheduled = t; // after the tab was hidden, skip what was missed
    const until = t + 0.3;
    for (const p of A.pops(scheduled, until)) pop(p.time + offset, p.strength);
    if (CampAudio.season !== 'winter') for (const c of A.chirps(scheduled, until)) chirp(c.time + offset, c.cricket); // no crickets in the snow
    for (const h of A.owls(scheduled, until)) owl(h + offset);
    for (const e of A.events(scheduled + 0.3, until + 0.3)) play(e, e.time + offset); // looked up 0.3 s ahead, for the lead-ins
    for (const e of A.events(scheduled + 1.1, until + 1.1)) if (e.type === 'stoke') shimmer(e.time + offset);
    for (const e of A.events(scheduled + 0.75, until + 0.75)) if (e.type === 'land') swoosh(e.time + offset - 0.75, 700, 1600, 0.6, 0.03); // the twig flying
    scheduled = until;

    const f = A.flicker(t), w = A.wind(t);
    const fu = A.fuel(t);
    roar.gain.setTargetAtTime(0.09 * f * f * (0.35 + 0.65 * fu), now, 0.08);
    windGain.gain.setTargetAtTime((0.02 + 0.14 * w * w) * (CampAudio.season === 'winter' ? 1.35 : 1), now, 0.3);
    windFilter.frequency.setTargetAtTime(300 + 500 * w, now, 0.3);
    rustle.gain.setTargetAtTime(0.04 * Math.max(0, w - 0.5) * 2 * (0.5 + 0.5 * A.noise1(t * 3, 950)), now, 0.1);
  }

  const state = () => (ctx ? ctx.state : 'waiting for a click');
  window.CampAudio = { start, update, state, season: 'autumn' };
})();
