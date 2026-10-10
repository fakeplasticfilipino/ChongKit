// Campfire: the sound, made in the browser with Web Audio (no sound files).
// Fire roar and pops, wind, crickets, an owl. The timing comes from anim.js, so the pops match the
// embers you see and the wind matches the swaying trees. Browsers only allow sound after the first
// click, tap or key, so `start()` is called then. Browser global `CampAudio`.
(function () {
  'use strict';
  const A = window.CampAnim;
  let ctx, master, noise, roar, hiss, windGain, windFilter, echo, rustle, rainGain, patter, sizzle, humGain;
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
    windFilter = filter('bandpass', 300, 0.7);
    windFilter.connect(windGain);
    loop(windFilter);

    // leaves rustling in strong gusts
    rustle = gain(0, master);
    const leaves = filter('highpass', 2600);
    leaves.connect(rustle);
    loop(leaves);

    // rain: a hiss of drops, a soft patter, and the fire sizzling
    rainGain = gain(0, master);
    const rb = filter('bandpass', 3200, 0.4);
    rb.connect(rainGain);
    loop(rb);
    patter = gain(0, master);
    const rl = filter('lowpass', 700, 0.7);
    rl.connect(patter);
    loop(rl);
    sizzle = gain(0, master);
    const sz = filter('highpass', 5500);
    sz.connect(sizzle);
    loop(sz);

    // a soft echo for faraway sounds (owl, wolf)
    echo = ctx.createDelay(1);
    echo.delayTime.value = 0.23;
    const fb = gain(0.32, echo);
    echo.connect(fb);
    echo.connect(gain(0.5, master));

    // the standing stones' low hum: two sines a fifth apart, silent until the walker steps into the ring
    humGain = gain(0, master);
    for (const fq of [55, 82.5]) {
      const o = ctx.createOscillator();
      o.frequency.value = fq;
      o.connect(humGain);
      o.start();
    }
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
  // distant thunder: a muffled crack, then a long rolling rumble
  function thunder(at) {
    noiseHit(at, 'bandpass', 380, 1, 0.5, 0.25);
    const g = gain(0, master);
    const lp = filter('lowpass', 150, 0.5);
    lp.connect(g);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    src.connect(lp);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.9, at + 0.35);
    for (let i = 1; i < 10; i++) g.gain.linearRampToValueAtTime(0.9 * Math.exp(-i / 3.5) * (0.6 + 0.4 * Math.random()), at + 0.35 + i * 0.45); // rolls
    g.gain.linearRampToValueAtTime(0, at + 5);
    src.start(at, Math.random());
    src.stop(at + 5.1);
  }
  // wordless voices: a buzz through two moving formants, low and soft (a murmur, never words)
  const VOICE = { traveler: [150, -0.5], wizard: [100, 0], samurai: [125, 0.5] };
  function syllable(at, who, rise, reply, vol) {
    const [f0, p] = VOICE[who];
    const len = reply ? 0.17 : 0.13 + Math.random() * 0.09;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * (1 + 0.12 * rise), at);
    o.frequency.linearRampToValueAtTime(f0 * (1 - 0.1 * rise), at + len);
    const f1 = filter('bandpass', reply ? 300 : 420 + Math.random() * 320, 4);
    const f2 = filter('bandpass', reply ? 900 : 1000 + Math.random() * 800, 5);
    const lp = filter('lowpass', reply ? 700 : 1500);
    const g = gain(0);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(lp); lp.connect(pan(p, master));
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol || (reply ? 0.16 : 0.22), at + 0.03);
    g.gain.linearRampToValueAtTime(0, at + len);
    o.start(at);
    o.stop(at + len + 0.05);
  }
  function laughter(at) {
    ['traveler', 'wizard', 'samurai'].forEach((who, j) => {
      for (let i = 0; i < 4; i++) syllable(at + j * 0.07 + i * 0.14, who, 0.5 - i * 0.25, false, 0.2);
    });
  }
  // the guitar: plucked strings (a bright buzz that mellows and fades), swept low → high on a downstroke,
  // high → low on an upstroke
  function pluck(at, freq, vol, ring, out) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = freq;
    o2.type = 'triangle'; o2.frequency.value = freq * 1.003;
    const lp = filter('lowpass', Math.min(5000, freq * 14), 0.8);
    lp.frequency.setValueAtTime(Math.min(5000, freq * 14), at);
    lp.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 2.2), at + 0.6);
    const g = gain(0);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(vol * 0.25, at + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0003, at + ring);
    o.start(at); o2.start(at);
    o.stop(at + ring + 0.05); o2.stop(at + ring + 0.05);
  }
  // a strum sweeps all the strings; a picked note or two rings longer and a little louder
  function strum(at, notes, dir, last) {
    const out = pan(-0.45, master);
    const order = dir > 0 ? notes : notes.slice().reverse(), full = notes.length > 3;
    const vol = (full ? (dir > 0 ? 0.035 : 0.024) : notes.length > 2 ? 0.026 : 0.045) * (last ? 1.3 : 1);
    order.forEach((f, i) => pluck(at + i * (dir > 0 ? 0.012 : 0.009), f, vol, last ? 3 : full ? 1.3 : 1.8, out));
    if (full) noiseHit(at, 'highpass', 3000, 0.7, 0.04, 0.01, out); // the pick on the strings
  }
  function rasp(at) {
    const f = noiseHit(at, 'bandpass', 2200, 3, 0.35, 0.07, pan(0.5, master));
    f.frequency.setValueAtTime(2200, at);
    f.frequency.linearRampToValueAtTime(3200, at + 0.33);
  }
  // the walker's actions
  function snort(at) { const f = noiseHit(at, 'bandpass', 520, 1.5, 0.35, 0.22); f.frequency.exponentialRampToValueAtTime(300, at + 0.3); }
  function nuzzle(at) { noiseHit(at, 'lowpass', 400, 0.7, 0.6, 0.08); }
  function chew(at) { noiseHit(at, 'bandpass', 1800, 2, 0.06, 0.12); noiseHit(at + 0.11, 'bandpass', 1500, 2, 0.06, 0.1); }
  function flap(at) { swoosh(at, 400, 900, 0.3, 0.06); }
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
      case 'nuzzle': nuzzle(at); break;
      case 'snort': snort(at); break;
      case 'chew': chew(at); break;
      case 'ladle': ring(at, [1800, 2700], 0.5, 0.02); break;
      case 'spoon': ring(at, [2600, 3900], 0.25, 0.012); break;
      case 'flap': flap(at); break;
      case 'kindle': thump(at, 90, 0.4, 0.15); crackle(at + 0.05, 6, 0.5); break;
      case 'strain': creak(at); break;
      case 'uncork': thump(at, 600, 0.08, 0.12); break;
      case 'whisper': swoosh(at, 3000, 6000, 1.2, 0.03); break;
      case 'syl': syllable(at, e.who, e.rise, e.reply); break;
      case 'laugh': laughter(at); break;
      case 'strum': strum(at, e.notes, e.dir, e.last); break;
      case 'rasp': rasp(at); break;
      case 'thunder': if (CampAudio.season !== 'winter') thunder(at + 2.4); break; // the flash comes first; it's far off
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
    const raining = A.rainAt(t);
    if (CampAudio.season !== 'winter' && raining < 0.2) for (const c of A.chirps(scheduled, until)) chirp(c.time + offset, c.cricket); // no crickets in the snow or rain
    for (const h of A.owls(scheduled, until)) owl(h + offset);
    for (const e of A.events(scheduled + 0.3, until + 0.3)) if (!(CampAudio.skip && CampAudio.skip(e))) play(e, e.time + offset); // looked up 0.3 s ahead, for the lead-ins
    for (const e of A.events(scheduled + 1.1, until + 1.1)) if (e.type === 'stoke') shimmer(e.time + offset);
    for (const e of A.events(scheduled + 0.75, until + 0.75)) if (e.type === 'land') swoosh(e.time + offset - 0.75, 700, 1600, 0.6, 0.03); // the twig flying
    scheduled = until;

    const f = A.flicker(t), w = A.wind(t);
    const wet = CampAudio.season === 'winter' ? 0 : raining;
    const fu = A.fuel(t) * (1 - 0.3 * wet);
    rainGain.gain.setTargetAtTime(0.1 * wet, now, 0.5);
    patter.gain.setTargetAtTime(0.06 * wet, now, 0.5);
    sizzle.gain.setTargetAtTime(0.012 * wet * fu * (0.6 + 0.4 * A.noise1(t * 5, 970)), now, 0.1);
    roar.gain.setTargetAtTime(0.09 * f * f * (0.35 + 0.65 * fu), now, 0.08);
    windGain.gain.setTargetAtTime((0.012 + 0.035 * w * w) * (CampAudio.season === 'winter' ? 1.15 : 1), now, 0.6); // a calm night: a soft sigh, never a storm
    windFilter.frequency.setTargetAtTime(250 + 200 * w, now, 0.6);
    rustle.gain.setTargetAtTime(0.013 * Math.max(0, w - 0.5) * 2 * (0.5 + 0.5 * A.noise1(t * 3, 950)), now, 0.1);
    humGain.gain.setTargetAtTime(0.05 * (CampAudio.hum || 0), now, 0.3); // secrets.js sets CampAudio.hum (0-1)
  }

  // the will-o'-wisp leaving: a high, thin sweep of breath (secrets.js calls it)
  function whisperNow() { if (ctx && ctx.state === 'running') swoosh(ctx.currentTime + 0.01, 3000, 6000, 1.2, 0.03); }

  // a footstep: leaves crunching in autumn, snow squeaking in winter, soft grass otherwise
  function step(speed) {
    if (!ctx || ctx.state !== 'running') return;
    const at = ctx.currentTime + 0.01, v = 0.05 + 0.025 * Math.min(1.6, speed), out = pan(0, master);
    if (CampAudio.season === 'autumn') {
      noiseHit(at, 'bandpass', 2600, 1, 0.09, v, out);
      for (let i = 0; i < 3; i++) noiseHit(at + 0.01 + Math.random() * 0.06, 'bandpass', 4000 + Math.random() * 2500, 3, 0.02, v * 0.7, out);
    } else if (CampAudio.season === 'winter') {
      const f = noiseHit(at, 'bandpass', 1300, 6, 0.12, v * 1.3, out);
      f.frequency.linearRampToValueAtTime(1800, at + 0.1);
    } else noiseHit(at, 'lowpass', 650, 1, 0.08, v * 1.4, out);
  }
  const state = () => (ctx ? ctx.state : 'waiting for a click');
  window.CampAudio = { start, update, state, step, whisper: whisperNow, hum: 0, season: 'autumn', skip: null };
})();
