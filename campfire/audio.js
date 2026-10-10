// Campfire: the sound, made in the browser with Web Audio (no sound files).
// Fire roar and pops, wind, crickets, an owl. The timing comes from anim.js, so the pops match the
// embers you see and the wind matches the swaying trees. Browsers only allow sound after the first
// click, tap or key, so `start()` is called then. Browser global `CampAudio`.
(function () {
  'use strict';
  const A = window.CampAnim;
  let ctx, master, noise, roar, hiss, windGain, windFilter, echo;
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

    // a soft echo for faraway sounds (owl)
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

  // called every frame with the scene's clock (seconds); schedules what's coming in the next 0.3 s
  function update(t) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (offset === null || Math.abs(now - (t + offset)) > 0.25) { offset = now - t; scheduled = t; }
    if (scheduled < t) scheduled = t; // after the tab was hidden, skip what was missed
    const until = t + 0.3;
    for (const p of A.pops(scheduled, until)) pop(p.time + offset, p.strength);
    for (const c of A.chirps(scheduled, until)) chirp(c.time + offset, c.cricket);
    for (const h of A.owls(scheduled, until)) owl(h + offset);
    scheduled = until;

    const f = A.flicker(t), w = A.wind(t);
    roar.gain.setTargetAtTime(0.09 * f * f, now, 0.08);
    windGain.gain.setTargetAtTime(0.02 + 0.14 * w * w, now, 0.3);
    windFilter.frequency.setTargetAtTime(300 + 500 * w, now, 0.3);
  }

  const state = () => (ctx ? ctx.state : 'waiting for a click');
  window.CampAudio = { start, update, state };
})();
