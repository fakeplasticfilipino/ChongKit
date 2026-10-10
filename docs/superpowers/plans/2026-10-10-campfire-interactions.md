# Campfire Interactions and Secrets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the walker things to do around the camp (F near a spot) and 13 secrets to find at the clearing's edge, with a per-device tally.

**Architecture:** Pure timing and data live in `campfire/anim.js` (walker actions as a timeline like the stories, spots, secrets, the saved tally), tested in Node. A new `interact.js` runs the camp spots, the hint and the walker's poses; a new `secrets.js` builds the secrets and the tally. `walk.js`, `camp.js`, `visitors.js`, `scene.js`, `audio.js` and `app.js` get small hooks.

**Tech Stack:** Plain JS (browser globals + CommonJS for `anim.js`), three.js r153 UMD (`vendor/three.min.js`), Web Audio, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-10-campfire-interactions-design.md`

## Global Constraints

- Zero-install: no build step, no new libraries, scripts load in order from `campfire/index.html`; everything opens from `file://`.
- Keep the pixel look: low-poly, `flatShading`, colours from `CampAnim.PALETTE` hues (reuse the hex constants already used in `camp.js`, `visitors.js`, `figures.js`).
- Sound is generated with Web Audio in `audio.js`, timed from `CampAnim.events`; no sound files, no mute button.
- User text is never involved; the hint and tally are set with `textContent` only.
- Walker actions emit events marked `act: true`; `CampAnim.eventOwner` returns `null` for them so the walker's own sounds are **not** paused (`CampAudio.skip`).
- The walking edge is `EDGE = 6.4` (walk.js); every secret sits inside `EDGE - 0.4`.
- F is the interact key (E stays Walk/Sit). The tally shows only while walking (`body.walking`) and fades with `.corner` (`body.idle`).
- localStorage key `chongkit.campfire.found`; every read/write in `try/catch`.
- Pull before work and before pushing (`git pull --rebase origin main`); commit and push straight to `main`; run `npm test` before each commit.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**User decisions (already made):**
- Interaction is "prompt + key": a floating `F · <verb>` hint near the thing; F does it; on touch, tap the hint.
- Secrets are remembered as a quiet tally per device (`found / 13`), no rewards.
- All four interaction groups: horse + stew, sit spots, fire + tent, talk to the others (owl and fox react).
- All four secret groups: nature, relics, spooky, seasonal (13 total; the seasonal one is the current season's).
- Spec approved as written ("All good").

---

## File map

| File | Change |
|---|---|
| `campfire/anim.js` | + `ACTIONS`, `act`, `cancelAct`, `actAt`, `clearActs`, act events in `events`, `eventOwner` exemption, `nearestSpot`, `inside`, `SECRETS`, `SECRET_PLACES`, `readFound` |
| `campfire/tests/anim.test.js` | + tests for all of the above |
| `campfire/walk.js` | + `hold(on)`, `sitAt(amount, drop)`, `state()`, `wantsToMove()`; input ignored while held |
| `campfire/interact.js` (new) | camp spots, hint DOM, F/tap, running/cancelling actions, walker poses, `react` values for props |
| `campfire/camp.js` | `update(t, s)` reads `s.pet`, `s.eat`, `s.peek`; apple + bowl meshes; returns `HORSE_AT`, `TENT_AT` |
| `campfire/visitors.js` | `update(t, walker)`: owl turns to a close walker; a sitting fox trots off |
| `campfire/secrets.js` (new) | secret meshes, their reactions, step-in/close finds, tally element + storage |
| `campfire/scene.js` | builds interact + secrets, passes walker info, camera lowers when sitting, secrets in `SPOTS` and obstacles, companion nod |
| `campfire/audio.js` | new sounds for act event types |
| `campfire/app.js` | F key, hint tap, wiring |
| `campfire/index.html` | `#hint`, `#tally` elements + CSS; `interact.js`, `secrets.js` scripts |
| `CLAUDE.md`, `README.md`, `TRACKER.md` | documented |

---

# Part 1 — spots and camp interactions

### Task 1: Walker actions and spots in anim.js

**Goal:** Pure, tested timeline for walker actions (start, cancel, events) and spot lookup.

**Files:**
- Modify: `campfire/anim.js` (after the talk section, before `events`; `events` body; `eventOwner`; exports)
- Test: `campfire/tests/anim.test.js`

**Acceptance Criteria:**
- [ ] `A.act(name, t, info)` records an action; `A.actAt(t)` returns `{ name, local, info }` while it runs, `null` after `ACTIONS[name].dur` (or never ends for `hold: true` until cancelled)
- [ ] `A.cancelAct(t)` ends the running action at `t`; no act events are emitted after it
- [ ] `A.events(from, to)` includes each action's events with `act: true` and `who`/`with` filled from `info`
- [ ] `A.eventOwner({ type: 'land', act: true })` is `null`
- [ ] `A.nearestSpot(x, z, spots)` returns the closest spot whose `r` contains the point, ties to the first, `null` if none
- [ ] `A.inside(x, z, spot)` is true iff the distance is below `spot.r`

**Verify:** `node --test campfire/tests/anim.test.js` → `ℹ fail 0`

**Steps:**

- [ ] **Step 1: Write the failing tests** (append to `campfire/tests/anim.test.js`)

```js
test('walker actions: start, run, end, cancel, events marked act', () => {
  A.clearActs();
  assert.strictEqual(A.actAt(10), null);
  A.act('pet', 10, { who: 'traveler' });
  assert.strictEqual(A.actAt(10.5).name, 'pet');
  assert.ok(Math.abs(A.actAt(10.5).local - 0.5) < 1e-9);
  assert.strictEqual(A.actAt(10 + A.ACTIONS.pet.dur + 0.01), null, 'ends on its own');
  const ev = A.events(10, 10 + A.ACTIONS.pet.dur).filter((e) => e.act);
  assert.ok(ev.length >= 1 && ev.every((e) => e.who === 'traveler'));
  assert.strictEqual(A.eventOwner(ev[0]), null, 'the walker\'s own act sounds never pause');
  // a held action runs until cancelled; nothing after the cancel
  A.act('sit', 50, { who: 'wizard' });
  assert.strictEqual(A.actAt(500).name, 'sit');
  A.cancelAct(60);
  assert.strictEqual(A.actAt(60.01), null);
  A.act('twig', 70, { who: 'samurai' });
  A.cancelAct(70.5); // before the twig lands
  assert.strictEqual(A.events(70, 75).filter((e) => e.act).length, 0);
  // twig: the same landing as the traveler's story, so the fire flares
  A.act('twig', 80, { who: 'samurai' });
  assert.ok(A.events(80, 84).some((e) => e.type === 'land' && e.act));
  assert.ok(A.flare(80 + A.TWIG_LAND + 0.1) > 0.5);
  // talk fills both voices
  A.act('talk', 90, { who: 'traveler', with: 'wizard' });
  const syl = A.events(90, 90 + A.ACTIONS.talk.dur).filter((e) => e.type === 'syl');
  assert.ok(syl.some((e) => e.who === 'traveler') && syl.some((e) => e.who === 'wizard'));
  for (const [name, a] of Object.entries(A.ACTIONS)) {
    assert.ok(a.label && typeof a.label === 'string', name + ' has a label');
    assert.ok(a.hold || a.dur > 0, name + ' ends or holds');
    for (const [at] of a.events || []) assert.ok(at >= 0 && (a.hold || at < a.dur), name + ' event inside');
  }
  A.clearActs();
});

test('spots: nearest in reach, ties to the first, inside', () => {
  const spots = [{ id: 'a', x: 0, z: 0, r: 1 }, { id: 'b', x: 1.5, z: 0, r: 1 }, { id: 'c', x: 0, z: 0, r: 1 }];
  assert.strictEqual(A.nearestSpot(5, 5, spots), null);
  assert.strictEqual(A.nearestSpot(0.2, 0, spots).id, 'a', 'closest, and a beats its twin c');
  assert.strictEqual(A.nearestSpot(1.2, 0, spots).id, 'b');
  assert.ok(A.inside(0.5, 0, spots[0]));
  assert.ok(!A.inside(1, 0, spots[0]));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test campfire/tests/anim.test.js`
Expected: FAIL (`A.clearActs is not a function`)

- [ ] **Step 3: Implement in `campfire/anim.js`** (insert after the `strums` function block, before the talk section)

```js
  // ---- the walker's actions (F near a spot): a timeline like the stories, kept apart from them ----
  // dur: seconds (hold: runs until cancelled); events: [[at, type, extra?]] (extra.who: 'walker' or 'with');
  // loop: [period, [[at, type]]] repeats while a held action runs. label: the hint's verb.
  const ACTIONS = {
    pet: { label: 'Pet', dur: 3.2, events: [[0.6, 'nuzzle'], [2.0, 'snort']] },
    apple: { label: 'Apple', dur: 4.5, events: [[1.4, 'chew'], [2.0, 'chew'], [2.6, 'chew'], [3.6, 'snort']] },
    stew: { label: 'Stew', hold: true, events: [[0.7, 'ladle']], loop: [3.2, [[2.4, 'spoon']]] },
    sit: { label: 'Sit', hold: true, events: [] },
    twig: { label: 'Twig', dur: 4, events: [[TWIG_LAND, 'land']] },
    warm: { label: 'Warm', dur: 5, events: [] },
    peek: { label: 'Peek', dur: 4, events: [[0.4, 'flap'], [3.2, 'flap']] },
    talk: { label: 'Talk', dur: 5, events: [[0.4, 'syl', { who: 'walker', rise: 0.6 }], [0.7, 'syl', { who: 'walker', rise: -0.2 }], [1.5, 'syl', { who: 'with', rise: 0.3, reply: true }], [1.8, 'syl', { who: 'with', rise: -0.4 }], [2.6, 'syl', { who: 'walker', rise: 0.8 }], [3.4, 'nod']] },
    hello: { label: 'Talk', dur: 2, events: [[0.3, 'syl', { who: 'walker', rise: 0.5 }]] },
    look: { label: 'Look', dur: 4, events: [] },
    pray: { label: 'Pray', dur: 4, events: [[1.6, 'kindle']] },
    pull: { label: 'Pull', dur: 3.5, events: [[0.8, 'strain'], [2.0, 'strain']] },
    read: { label: 'Read', dur: 3.5, events: [] },
    wear: { label: 'Wear', dur: 2, events: [] },
    open: { label: 'Open', dur: 3, events: [[0.8, 'uncork']] },
  };
  const acts = []; // { name, start, end (Infinity while running), info }
  function act(name, t, info) {
    cancelAct(t);
    acts.push({ name, start: t, end: ACTIONS[name].hold ? Infinity : t + ACTIONS[name].dur, info: info || {} });
    if (acts.length > 40) acts.shift();
  }
  function cancelAct(t) {
    const a = acts[acts.length - 1];
    if (a && a.end > t) a.end = Math.max(a.start, t);
  }
  function clearActs() { acts.length = 0; }
  function actAt(t) {
    for (let i = acts.length - 1; i >= 0; i--) {
      const a = acts[i];
      if (t >= a.start && t < a.end) return { name: a.name, local: t - a.start, info: a.info };
    }
    return null;
  }
  function actEvents(from, to, out) {
    for (const a of acts) {
      const def = ACTIONS[a.name], stop = Math.min(to, a.end);
      if (a.start >= stop) continue;
      const push = (time, type, extra) => {
        if (time < from || time >= stop) return;
        const e = { type, time, act: true, name: a.name, who: a.info.who };
        if (extra) {
          Object.assign(e, extra);
          if (extra.who === 'walker') e.who = a.info.who;
          if (extra.who === 'with') e.who = a.info.with;
        }
        out.push(e);
      };
      for (const [at, type, extra] of def.events || []) push(a.start + at, type, extra);
      if (def.loop) {
        const [period, list] = def.loop;
        for (let k = Math.max(0, Math.floor((from - a.start) / period) - 1); a.start + k * period < stop; k++) {
          for (const [at, type] of list) push(a.start + k * period + at, type);
        }
      }
    }
  }
  // Spots: { x, z, r, … }. The closest one whose reach holds the point (ties go to the first), or null.
  function nearestSpot(x, z, spots) {
    let best = null, bd = Infinity;
    for (const s of spots) {
      const d = Math.hypot(x - s.x, z - s.z);
      if (d < s.r && d < bd) { best = s; bd = d; }
    }
    return best;
  }
  const inside = (x, z, s) => Math.hypot(x - s.x, z - s.z) < s.r;
```

In `events(from, to)`, add just before `return out.sort(...)`:

```js
    actEvents(from, to, out);
```

Replace the `eventOwner` line:

```js
  const eventOwner = (e) => (e.act ? null : e.who || EVENT_OWNER[e.type] || null);
```

Add to the export object (the line with `talkAt, TALK, strums, …`): `ACTIONS, act, cancelAct, clearActs, actAt, nearestSpot, inside,`

Note: `TWIG_LAND` is declared above `ACTIONS` (it is, at "Moments inside the stories"); the `ACTIONS` block must come after that line.

- [ ] **Step 4: Run to verify they pass**

Run: `node --test campfire/tests/anim.test.js`
Expected: `ℹ fail 0`

- [ ] **Step 5: Commit**

```bash
git add campfire/anim.js campfire/tests/anim.test.js
git commit -m "Campfire: walker actions and spots (pure, tested)"
```

---

### Task 2: walk.js holds and sits

**Goal:** Let an action hold the walker still, sit them down on a spot, and tell whether the player is trying to move.

**Files:**
- Modify: `campfire/walk.js`

**Acceptance Criteria:**
- [ ] `walk.hold(true)` keeps a walking walker in place (input ignored, velocity eases to 0); `hold(false)` releases
- [ ] `walk.wantsToMove()` is true when a move key or the joystick is pressed (even while held)
- [ ] `walk.sitAt(amount, drop)` blends legs/hips toward the seated pose (0 standing … 1 seated) and lowers the root by `drop * amount` metres; `sitAt(0)` restores
- [ ] `walk.state()` returns `'seated' | 'rising' | 'walking' | 'returning' | 'sitting'`
- [ ] Walking, E/Sit and the return to the seat behave exactly as before when nothing calls these

**Verify:** Browser pane: `http://localhost:8000/ChongKit/campfire/`, press E, then in the console `world` isn't global, so check via Task 3's flow; for this task: `npm test` → `ℹ fail 0` and the page loads with no console errors.

**Steps:**

- [ ] **Step 1: Add state** — after `let chosen = 'traveler';`:

```js
    let held = false, sitAmt = 0, sitDrop = 0;
```

- [ ] **Step 2: Ignore input while held** — in `update`, inside `if (state === 'walking') { … }`, wrap the input read:

```js
        const [ix, iz] = held ? [0, 0] : input();
```

- [ ] **Step 3: Blend the sit pose** — in the pose section, replace the `hipY` line and the legs loop with:

```js
      const hipY = lerp(lerp(p.sitY, p.standY, k), p.sitY, sitAmt);
      p.root.position.set(x, k * 0.025 * Math.abs(Math.sin(phase)) * Math.min(1, speed) - sitDrop * sitAmt, z);
      p.root.rotation.y = yaw;
      p.legs.forEach((l, i) => {
        l.hip.position.y = hipY;
        l.hip.rotation.x = lerp(lerp(l.sitHip, Math.PI / 2 - g.legs[i].hip, k), l.sitHip, sitAmt);
        l.knee.rotation.x = lerp(lerp(l.sitKnee, -Math.PI / 2 - g.legs[i].knee, k), l.sitKnee, sitAmt);
      });
```

(delete the old `p.root.position.set(...)` and `p.root.rotation.y = yaw;` lines above it, which this replaces). Also keep the wizard's long robe hidden while sitting: change the robes line at the end of the pose section to

```js
      if (p.robes) { const standing = k > 0.5 && sitAmt < 0.5; p.robes.stand.visible = standing; p.robes.sit.forEach((m) => { m.visible = !standing; }); }
```

- [ ] **Step 4: API** — replace the `return { update, toggle, … }` line with:

```js
    const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const wantsToMove = () => MOVE_KEYS.some((c) => keys.has(c)) || Math.hypot(joy[0], joy[1]) > 0.2;
    const hold = (on) => { held = !!on; };
    const sitAt = (amount, drop) => { sitAmt = Math.max(0, Math.min(1, amount)); sitDrop = drop || 0; };
    return { update, toggle, choose, setKey, setJoy, info, hold, sitAt, wantsToMove, state: () => state, away: (name) => who === name, walking: () => !!who };
```

- [ ] **Step 5: Release on sit-down** — in `toggle()`, when going back (`state = 'returning'`), also `held = false; sitAmt = 0;`.

- [ ] **Step 6: Check and commit**

Run: `npm test` → `ℹ fail 0`. Open the page in the browser pane (`preview_start` name `chongkit-pages`, URL `http://localhost:8000/ChongKit/campfire/`), press E, walk with WASD, press E again: no console errors, the walker returns and sits.

```bash
git add campfire/walk.js
git commit -m "Campfire: walk.js can hold the walker still and sit them on a spot"
```

---

### Task 3: interact.js — camp spots, hint, F and tap, walker poses

**Goal:** While walking, the nearest camp spot shows `F · <verb>`; F (or tapping the hint) runs the action with the walker posed; moving cancels.

**Files:**
- Create: `campfire/interact.js`
- Modify: `campfire/index.html` (CSS, `#hint`, script tag after `walk.js`)
- Modify: `campfire/scene.js` (build interact after `walk`; call it in `update` after `walk.update`; return it)
- Modify: `campfire/app.js` (F key, hint click)

**Acceptance Criteria:**
- [ ] Spots: horse (Pet/Apple alternating), stew pot (Stew), fallen log and an edge rock (Sit), fire (Twig/Warm alternating), tent (Peek), each seated companion who isn't the walker (Talk, or a glance-only `hello` when they're busy)
- [ ] The hint sits over the spot on screen, text `F · Pet` (touch: `Pet`), hidden unless walking (`walk.state() === 'walking'`) and a spot is in reach and no action runs
- [ ] F or a hint tap starts the action via `A.act(name, t, { who, with, spot })`; the walker turns to face the spot and is held
- [ ] Moving (`walk.wantsToMove()`) or pressing F again during a held action cancels it (`A.cancelAct`), releases, `sitAt(0)`
- [ ] Walker poses per action (arms via keyframes): pet (arm out, stroking), apple (arm out held), stew (ladle then sit, hand to mouth on each `spoon`), sit, twig (the throw), warm (both hands forward), peek (torso bends), talk/hello (a little hand), look (head down), pray (torso bow), pull (both arms down, tugging), read (lean in), open (hands together)
- [ ] `interact.react(t)` returns `{ pet, eat, peek, stewing, sitting, talkWith, nod }` (0–1 values, names) for props and scene

**Verify:** Browser pane: walk the traveler to the horse; the hint reads `F · Pet`; F → the arm strokes, `nuzzle`/`snort` events fire (check `CampAnim.events(t-4,t).filter(e=>e.act)` in the console); press F again near the horse → `F · Apple`. Move during Sit → stands back up. No console errors.

**Steps:**

- [ ] **Step 1: index.html** — add CSS inside `<style>`:

```css
  #hint { position: fixed; transform: translate(-50%, -100%); display: none; font: inherit; color: inherit; cursor: pointer;
    background: rgba(10, 15, 26, 0.7); border: 1px solid #31445e; border-radius: 3px; padding: 4px 8px; white-space: nowrap; }
  #hint.on { display: block; }
  #tally { position: fixed; top: 12px; right: 12px; display: none; padding: 6px 10px; border: 1px solid #31445e; border-radius: 3px;
    background: rgba(10, 15, 26, 0.7); transition: opacity 0.6s; }
  body.walking #tally { display: block; }
  body.idle #tally { opacity: 0; }
```

After the `#joy` div add:

```html
<button id="hint" type="button"></button>
<div id="tally" aria-label="Secrets found"></div>
```

Add `<script src="interact.js"></script>` after `walk.js` and `<script src="secrets.js"></script>` after it (secrets.js is created in Task 7; until then create it as an empty stub `window.CampSecrets = { build: () => ({ spots: [], update() {}, react: () => ({}) }) };` so the page loads).

- [ ] **Step 2: Create `campfire/interact.js`**

```js
// Campfire: things to do while walking. The nearest spot in reach shows a hint (F · Pet); F or a tap on it runs
// the action (CampAnim.act), posing the walker; moving cancels. Browser global `CampInteract`.
// kit: { THREE, camera, walk, people, A, spots: [ { id, x, z, r, acts: [names], y?, face? } ], busy(who, t) }
(function () {
  'use strict';
  const A = window.CampAnim;
  const smooth = A.smooth;
  const TOUCH = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function build(kit) {
    const { THREE, camera, walk, people } = kit;
    const hint = document.getElementById('hint');
    const turns = new Map(); // spot id → how many times used (for alternating actions)
    const at = new THREE.Vector3();
    let current = null, shown = null; // spot in reach; the hint's spot
    let running = null; // { name, spot }
    const spots = kit.spots.slice();

    const nameFor = (spot, who) => {
      if (spot.companion) return kit.busy(spot.companion, kit.now()) ? 'hello' : 'talk';
      return spot.acts[(turns.get(spot.id) || 0) % spot.acts.length];
    };
    function start(t) {
      const w = walk.info();
      if (!current || walk.state() !== 'walking') return false;
      if (running) { stop(t); return true; }
      const name = nameFor(current, w.who);
      turns.set(current.id, (turns.get(current.id) || 0) + 1);
      A.act(name, t, { who: w.who, with: current.companion || null, spot: current.id });
      running = { name, spot: current };
      walk.hold(true);
      if (kit.onAct) kit.onAct(name, current, t);
      return true;
    }
    function stop(t) {
      A.cancelAct(t);
      running = null;
      walk.hold(false);
      walk.sitAt(0);
    }
    hint.addEventListener('click', () => start(kit.now()));

    // keyframes for the walker's right arm [time, shoulder x, elbow x] per action; left mirrors unless given
    const ARM = {
      pet: [[0, 0, -0.3], [0.5, -1.3, -0.4], [1.0, -1.1, -0.6], [1.5, -1.3, -0.4], [2.0, -1.1, -0.6], [2.6, -1.3, -0.4], [3.2, 0, -0.3]],
      apple: [[0, 0, -0.3], [0.6, -1.4, -0.2], [3.8, -1.4, -0.2], [4.5, 0, -0.3]],
      twig: [[0, 0, -0.3], [0.8, 0.6, -1.4], [1.55, -1.6, -0.2], [2.4, 0, -0.3]],
      warm: [[0, 0, -0.3], [0.8, -1.2, -0.5], [4.2, -1.2, -0.5], [5, 0, -0.3]],
      talk: [[0, 0, -0.3], [0.5, -0.5, -1.0], [4.5, -0.5, -1.0], [5, 0, -0.3]],
      hello: [[0, 0, -0.3], [0.4, -2.4, -0.3], [1.6, -2.4, -0.3], [2, 0, -0.3]],
      pray: [[0, 0, -0.3], [0.8, -0.9, -1.6], [3.4, -0.9, -1.6], [4, 0, -0.3]],
      pull: [[0, 0, -0.3], [0.5, -0.9, -0.1], [3.0, -0.9, -0.1], [3.5, 0, -0.3]],
      open: [[0, 0, -0.3], [0.5, -1.0, -0.9], [2.5, -1.0, -0.9], [3, 0, -0.3]],
    };
    const TORSO = { peek: [[0, 0], [0.6, 0.7], [3.2, 0.7], [4, 0]], look: [[0, 0], [0.6, 0.35], [3.4, 0.35], [4, 0]], pray: [[0, 0], [0.8, 0.45], [3.4, 0.45], [4, 0]], read: [[0, 0], [0.6, 0.2], [3, 0.2], [3.5, 0]], pull: [[0, 0], [0.8, -0.15], [1.2, 0.05], [2.0, -0.15], [2.4, 0.05], [3.5, 0]] };

    function pose(p, a) {
      const name = a.name, l = a.local;
      const arm = ARM[name];
      if (arm) {
        const [sx, el] = A.keyframes(l, arm);
        const both = name === 'warm' || name === 'pray' || name === 'pull' || name === 'open';
        p.arms.forEach((m, i) => {
          if (i === 0 || both) { m.sh.rotation.x = sx; m.el.rotation.x = el; }
        });
      }
      if (TORSO[name]) p.torso.rotation.x = 0.06 + A.keyframes(l, TORSO[name])[0];
      if (name === 'look' || name === 'read') p.head.rotation.x = 0.4 * A.win(l, 0.3, ACT_DUR(name) - 0.3, 0.3);
      if (name === 'stew') { // ladle a bowl, sit by the pot, a spoonful each loop
        const sit = smooth((l - 1.4) / 0.8);
        walk.sitAt(sit, 0.42);
        const spoon = sit >= 1 ? A.win(((l - 2.2) % 3.2 + 3.2) % 3.2, 0, 0.6, 0.2) : 0;
        p.arms[0].sh.rotation.x = l < 1.4 ? A.keyframes(l, [[0, 0], [0.5, -1.3], [1.0, -1.3], [1.4, -0.6]])[0] : -0.6 - 0.9 * spoon;
        p.arms[0].el.rotation.x = -1.2 - 0.6 * spoon;
        p.arms[1].sh.rotation.x = l < 1.4 ? -0.3 : -0.7; p.arms[1].el.rotation.x = -1.3; // the bowl hand
      }
      if (name === 'sit') walk.sitAt(smooth(l / 0.8), running && running.spot.drop || 0);
    }
    const ACT_DUR = (name) => A.ACTIONS[name].dur || 4;

    // every frame, after walk.update. wk: what walk.update returned.
    function update(t, wk) {
      const a = A.actAt(t);
      if (running && !a) { running = null; walk.hold(false); walk.sitAt(0); } // it finished
      if (running && walk.wantsToMove()) stop(t);
      if (!wk.who) { current = null; if (running) stop(t); hide(); return; }
      const list = spots.filter((s) => s.companion !== wk.who);
      current = walk.state() === 'walking' ? A.nearestSpot(wk.at[0], wk.at[1], list) : null;
      const p = people[wk.who];
      if (running && a) {
        const s = running.spot, face = Math.atan2(s.x - wk.at[0], s.z - wk.at[1]);
        p.root.rotation.y += Math.atan2(Math.sin(face - p.root.rotation.y), Math.cos(face - p.root.rotation.y)) * 0.15; // turn to it
        pose(p, a);
      }
      if (!current || running) { hide(); return; }
      at.set(current.x, current.y || 1.4, current.z).project(camera);
      if (at.z > 1) { hide(); return; }
      const label = A.ACTIONS[nameFor(current, wk.who)].label;
      if (shown !== current || hint.dataset.label !== label) {
        hint.textContent = TOUCH ? label : 'F · ' + label;
        hint.dataset.label = label;
        shown = current;
      }
      hint.style.left = ((at.x + 1) / 2) * window.innerWidth + 'px';
      hint.style.top = ((1 - at.y) / 2) * window.innerHeight + 'px';
      hint.classList.add('on');
    }
    function hide() { hint.classList.remove('on'); shown = null; }

    // what the props and the others react to (0–1)
    function react(t) {
      const a = A.actAt(t), n = a ? a.name : null, l = a ? a.local : 0;
      const d = n ? (A.ACTIONS[n].dur || 1e9) : 0;
      return {
        pet: n === 'pet' ? A.win(l, 0.3, d - 0.3, 0.4) : 0,
        eat: n === 'apple' ? A.win(l, 0.8, d - 0.6, 0.4) : 0,
        peek: n === 'peek' ? A.win(l, 0.4, d - 0.6, 0.4) : 0,
        stewing: n === 'stew', sitting: n === 'sit' || (n === 'stew' && l > 1.4),
        talkWith: n === 'talk' || n === 'hello' ? a.info.with : null,
        nod: n === 'talk' ? A.win(l, 3.4, 4.2, 0.2) : 0,
        name: n, local: l, spot: a && a.info.spot,
      };
    }
    const add = (more) => { spots.push(...more); };
    return { update, start, react, add, spots };
  }

  window.CampInteract = { build };
})();
```

- [ ] **Step 3: scene.js wiring** — after `const walk = CampWalk.build(...)`, add:

```js
    const lx2 = -3.6, lz2 = -2.6; // the fallen log's middle
    const busyNow = (who, t) => (A.BUSY[who] || []).some((n) => A.story(n, t) >= 0) || (() => { const c = A.talkAt(t); return !!c && (c.speaker === who || c.listener === who); })();
    let nowT = 0;
    const interact = CampInteract.build({
      THREE, camera: null, walk, people: { traveler, wizard, samurai }, now: () => nowT, busy: busyNow,
      spots: [
        { id: 'horse', x: 2.6 + 0.9 * hx, z: -5.8 + 0.9 * hz, r: 1.2, y: 1.5, acts: ['pet', 'apple'] },
        { id: 'stew', x: 0, z: 1.25, r: 0.75, y: 1.2, acts: ['stew'] },
        { id: 'log', x: lx2 + 0.45 * lz, z: lz2 - 0.45 * lx, r: 0.9, y: 0.9, acts: ['sit'], drop: 0 },
        { id: 'rock', x: 4.4, z: 2.4, r: 0.8, y: 0.8, acts: ['sit'], drop: 0.15 },
        { id: 'fire', x: 0.9, z: 0.9, r: 0.8, y: 1.0, acts: ['twig', 'warm'] },
        { id: 'tent', x: -3.4 + 1.3 * Math.sin(Math.atan2(3.4, 5.3)), z: -5.3 + 1.3 * Math.cos(Math.atan2(3.4, 5.3)), r: 0.9, y: 1.3, acts: ['peek'] },
        { id: 'traveler', x: -1.55, z: 0.55, r: 0.75, y: 1.5, companion: 'traveler', acts: [] },
        { id: 'wizard', x: 0, z: -1.6, r: 0.75, y: 1.6, companion: 'wizard', acts: [] },
        { id: 'samurai', x: 1.55, z: 0.55, r: 0.75, y: 1.5, companion: 'samurai', acts: [] },
      ],
    });
```

Because `camera` is created later in `build`, set it once it exists: right after `const camera = new THREE.PerspectiveCamera(...)` add `interact.camera = camera;` and in interact.js read `kit.camera` lazily — change `const { THREE, camera, walk, people } = kit;` to `const { THREE, walk, people } = kit;` and use `(kit.camera)` in `update`: `at.set(...).project(kit.camera)`; in scene.js pass the kit object as a variable `const interactKit = {...}` and set `interactKit.camera = camera` after the camera is made.

If the rock spot (4.4, 2.4) has no rock yet, add one in scene.js next to the spots: `scene.add(box(0.7, 0.35, 0.5, 0x3a3f4a, 4.4, 0.17, 2.4));` and add `[4.4, 2.4, 0.4]` to `obstacles`. Check in the browser that the spot positions sit in front of their things; adjust the numbers until the hint appears where the walker naturally stops.

In `update`, right after `const wk = walk.update(t, dt, view.yaw);` add:

```js
      nowT = t;
      interact.update(t, wk);
```

Return `interact` from `build`: `return { scene, camera, update, pick, act, walk, interact };`

- [ ] **Step 4: app.js** — in the keydown handler, add before the Digit branch:

```js
    else if (e.code === 'KeyF' && !e.repeat) world.interact.start(last);
```

- [ ] **Step 5: Verify in the browser pane** (see **Verify**) and check every spot shows its hint and runs its pose; fix positions as needed. Console: `read_console_messages` with `onlyErrors` shows nothing new.

- [ ] **Step 6: Commit**

```bash
git add campfire/interact.js campfire/secrets.js campfire/index.html campfire/scene.js campfire/app.js
git commit -m "Campfire: walk-up spots with an F hint (horse, stew, sit, fire, tent, companions)"
```

---

### Task 4: Props react, sitting camera, act sounds

**Goal:** The horse nuzzles and eats, an apple and a bowl appear, the tent candle flares, the camera lowers when sitting, and every act event has a sound.

**Files:**
- Modify: `campfire/camp.js`
- Modify: `campfire/scene.js` (pass react values to `camp.update`; camera)
- Modify: `campfire/audio.js`

**Acceptance Criteria:**
- [ ] `camp.update(t, s)` with `s.pet` > 0 lowers the horse's head toward the walker (neck forward, small nuzzle wobble); `s.eat` > 0 shows an apple at the muzzle shrinking with each `chew` and the jaw bobbing
- [ ] During `stew`, a bowl (small cylinder) is in the walker's left hand; it steams (reuse a `blob` sprite)
- [ ] `s.peek` > 0 raises the tent candle intensity from 0.5 to 1.1 with flicker
- [ ] While `react.sitting`, the follow camera lowers by 0.35 and comes 0.6 closer (eased)
- [ ] Sounds: `nuzzle` (soft low breath), `snort` (noise burst, bandpass ~500 Hz, fast decay), `chew` (two short crunches), `ladle` (metal clink: `ring` 1800/2700 Hz short), `spoon` (lighter clink), `flap` (canvas swoosh 400→900 Hz), `nod` (silent: no case), `kindle` (a soft whoomp + crackle), `strain` (creak), `uncork` (pop); act `syl` uses the existing syllable

**Verify:** Browser pane: pet the horse → head lowers; apple → apple shrinks; peek → the doorway glows brighter; sit on the log → the camera lowers. Console free of errors. `npm test` → `ℹ fail 0`.

**Steps:**

- [ ] **Step 1: camp.js** — near the horse code, after `scene.add(horse);`, add the apple:

```js
    const apple = box(0.08, 0.08, 0.08, 0x9b3a1c, 0, -0.08, 0.42); // held at the muzzle while the horse eats
    apple.visible = false;
    head.add(apple);
```

In `update(t, s)`, after the horse's neck/head lines, add:

```js
      const pet = s.pet || 0, eat = s.eat || 0;
      neck.rotation.x += (0.9 - neck.rotation.x) * Math.max(pet, eat) * 0.9; // lowers its head toward the walker
      head.rotation.x += 0.12 * pet * Math.sin(t * 5) + 0.18 * eat * Math.abs(Math.sin(t * 7)); // nuzzles; chews
      apple.visible = eat > 0.05;
      apple.scale.setScalar(Math.max(0.2, 1 - 0.8 * Math.min(1, (s.eatLocal || 0) / 3)));
      candle.intensity = 0.5 + 0.6 * (s.peek || 0) * (0.85 + 0.15 * A.noise1(t * 9, 1600));
```

Return `HORSE_AT` and the bowl helper: change `return { update, POT, r0 };` to `return { update, POT, r0 };` (unchanged) — the bowl lives in scene.js (it follows the walker's hand).

- [ ] **Step 2: scene.js** — change the `camp.update(...)` call to:

```js
      const rx = interact.react(t);
      camp.update(t, { stir, sl, wind: A.wind(t), fuel: fu, pet: rx.pet, eat: rx.eat, eatLocal: rx.name === 'apple' ? rx.local - 0.8 : 0, peek: rx.peek });
```

Note: `interact.update` runs later in `update` (after `walk.update`); `react` only reads the `CampAnim` timeline, so calling it earlier in the frame is fine.

Add the bowl after `const interact = ...`:

```js
    const bowl = cyl(0.09, 0.06, 0.06, 7, 0x744726, 0, 0, 0);
    bowl.visible = false;
    scene.add(bowl);
    const bowlSteam = new THREE.Sprite(new THREE.SpriteMaterial({ map: blob, color: 0x9a948c, transparent: true, depthWrite: false }));
    bowlSteam.visible = false;
    scene.add(bowlSteam);
```

In `update`, after `interact.update(t, wk);`:

```js
      const rxw = interact.react(t);
      bowl.visible = bowlSteam.visible = rxw.stewing && rxw.local > 0.9;
      if (bowl.visible) {
        const wp = { traveler, wizard, samurai }[wk.who];
        wp.arms[1].wr.getWorldPosition(bowl.position);
        bowlSteam.position.copy(bowl.position).y += 0.12 + 0.05 * Math.sin(t * 2);
        bowlSteam.scale.setScalar(0.12);
        bowlSteam.material.opacity = 0.25;
      }
      sitCam += ((rxw.sitting ? 1 : 0) - sitCam) * Math.min(1, dt * 3);
```

Declare `let sitCam = 0;` next to `let lastT = null`. In the camera block change:

```js
      if (wk.who) follow.set(wk.at[0], 0.95 - 0.35 * sitCam, wk.at[1]);
      ...
      const R = RADIUS + (3.6 - 0.6 * sitCam - RADIUS) * wkK;
```

(If `arms[1].wr` doesn't exist on a figure, use `arms[1].el`.)

- [ ] **Step 3: audio.js** — add sound functions before `play`:

```js
  // the walker's actions
  function snort(at) { const f = noiseHit(at, 'bandpass', 520, 1.5, 0.35, 0.22); f.frequency.exponentialRampToValueAtTime(300, at + 0.3); }
  function nuzzle(at) { noiseHit(at, 'lowpass', 400, 0.7, 0.6, 0.08); }
  function chew(at) { noiseHit(at, 'bandpass', 1800, 2, 0.06, 0.12); noiseHit(at + 0.11, 'bandpass', 1500, 2, 0.06, 0.1); }
  function flap(at) { swoosh(at, 400, 900, 0.3, 0.06); }
```

In `play(e, at)` add cases:

```js
      case 'nuzzle': nuzzle(at); break;
      case 'snort': snort(at); break;
      case 'chew': chew(at); break;
      case 'ladle': ring(at, [1800, 2700], 0.5, 0.02); break;
      case 'spoon': ring(at, [2600, 3900], 0.25, 0.012); break;
      case 'flap': flap(at); break;
      case 'kindle': thump(at, 90, 0.4, 0.15); crackle(at + 0.05, 6, 0.5); break;
      case 'strain': creak(at); break;
      case 'uncork': thump(at, 600, 0.08, 0.12); break;
```

(`syl` already plays; act syllables carry `who`, `rise`, `reply`.)

- [ ] **Step 4: Verify** (see **Verify**), then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add campfire/camp.js campfire/scene.js campfire/audio.js
git commit -m "Campfire: the horse, stew and tent react; sitting lowers the camera; action sounds"
```

---

### Task 5: Talking to companions; owl and fox react

**Goal:** A seated companion answers the walker (turns, murmurs back, nods); the owl snaps its head to a close walker; a sitting fox trots off when approached.

**Files:**
- Modify: `campfire/scene.js` (`social` and `chat` additions)
- Modify: `campfire/visitors.js` (`update(t, walker)`)

**Acceptance Criteria:**
- [ ] During `talk`/`hello`, the companion's head turns to the walker at full weight; on `talk` the companion nods (`react.nod`) at the end
- [ ] The owl turns its head toward a walker within 1.5 m of the lantern post (x 1.55, z -5.25)
- [ ] A fox with `f.sit > 0.5` and a walker within 2.5 m runs away from the walker at 2.4 m/s for 2.5 s, then hides until its visit ends (`A.foxAt` returns null); the next visit is normal

**Verify:** Browser pane: walk up to the wizard (not busy) → F · Talk → two voices, the wizard turns and nods. `?at=` a fox visit (find one with `CampAnim.foxAt` in the console: first `t` where it's sitting), walk at it → it runs off. No console errors.

**Steps:**

- [ ] **Step 1: scene.js `social`** — inside `social(p)`, before `return list;`:

```js
        const rs = interact.react(t);
        if (rs.talkWith === me && walkWas.who) list.push([4, walkerHead]); // answers the walker
```

and in `chat(p)`'s returned value add the nod — find `const chat = (p) => {` and at the start of its body add `const rn = interact.react(t); const nodAdd = rn.talkWith === NAMES.get(p) ? 0.35 * rn.nod : 0;`, then add `+ nodAdd` to its return expression.

- [ ] **Step 2: visitors.js** — change `function update(t)` to `function update(t, walker)` (walker: `{ at: [x, z] } | null`), and add after `const f = A.foxAt(t);`:

```js
      let fx = f;
      if (f && walker) {
        if (!spooked && f.sit > 0.5 && Math.hypot(f.x - walker.at[0], f.z - walker.at[1]) < 2.5) spooked = { t, x: f.x, z: f.z, yaw: Math.atan2(f.x - walker.at[0], f.z - walker.at[1]) };
      }
      if (spooked && (!f || t < spooked.t)) spooked = null; // the visit ended (or the clock jumped back)
      if (f && spooked) {
        const u = t - spooked.t;
        fx = u > 2.5 ? null : { ...f, x: spooked.x + Math.sin(spooked.yaw) * 2.4 * u, z: spooked.z + Math.cos(spooked.yaw) * 2.4 * u, yaw: spooked.yaw, sit: 0, walk: 1, local: -1 };
      }
```

then use `fx` instead of `f` in the rest of the fox block (`fox.visible = !!fx; … if (fx) { … }`). Declare `let spooked = null;` above `function update`. For the owl, replace the `look` line:

```js
      const near = walker && Math.hypot(walker.at[0] - PERCH.x, walker.at[1] - PERCH.z) < 1.5;
      const look = near ? Math.atan2(walker.at[0] - PERCH.x, walker.at[1] - PERCH.z) - owl.rotation.y : Math.round(A.noise1(t * 0.25, 1300) * 2.4) * 0.55;
```

(`PERCH` is the owl's perch Vector3 already defined in visitors.js; if it is named differently, use that.)

In scene.js, change the `visitors.update(t)` call to `visitors.update(t, walkWas.who ? walkWas : null)`.

- [ ] **Step 3: Verify** (see **Verify**); `npm test` → `ℹ fail 0`.

- [ ] **Step 4: Commit**

```bash
git add campfire/scene.js campfire/visitors.js
git commit -m "Campfire: companions answer the walker; the owl looks, the fox runs off"
```

---

### Task 6: Part 1 docs and push

**Goal:** CLAUDE.md, README and TRACKER describe the interactions; pushed.

**Files:**
- Modify: `CLAUDE.md` (Campfire rule 3), `README.md` (Campfire section), `TRACKER.md` (Campfire)

**Acceptance Criteria:**
- [ ] CLAUDE.md Campfire rule 3 lists F, the hint (a button on touch) and the tally among the allowed controls, and names `interact.js` / `secrets.js` and `CampAnim.act`
- [ ] README's Campfire section lists the camp interactions and the F key
- [ ] TRACKER: a v11 section with part 1 done and part 2 open
- [ ] `npm test` passes; pushed to `main`

**Verify:** `git log origin/main --oneline -1` shows the docs commit.

**Steps:**

- [ ] **Step 1:** In CLAUDE.md Campfire rule 3, change "**No controls beyond** "← All tools", fullscreen and Walk/Sit in a corner (they fade when the mouse rests), the walking keys (E, WASD / arrows, Shift, 1–3; a joystick on touch screens)" to add: ", **F** to use the spot in reach (its floating hint, a button on touch screens; `interact.js`, actions are `CampAnim.act`), and the secrets tally (top right, only while walking; `secrets.js`)".
- [ ] **Step 2:** README Campfire: add a bullet under walking: "Walk up to things and press **F** (or tap the hint): pet or feed the horse, ladle a bowl of stew and eat it, sit on the log or a rock, toss a twig or warm your hands at the fire, peek into the tent, talk to the others. Moving stops what you're doing."
- [ ] **Step 3:** TRACKER Campfire, replace the "📋 Next: walk-up interactions" section with:

```markdown
### 🚧 v11 — walk-up interactions and secrets (spec: `docs/superpowers/specs/2026-10-10-campfire-interactions-design.md`)
- [x] Spots with an F hint (tap on touch): horse (pet / apple), stew, sit (log, rock), fire (twig / warm), tent (peek), talk to the others; moving cancels
- [x] Props react (horse, apple, bowl, tent candle), sitting lowers the camera, action sounds; the owl looks, the fox runs off
- [ ] Secrets at the clearing's edge (13) and the tally
```

- [ ] **Step 4:** `npm test`, then:

```bash
git pull --rebase origin main
git add CLAUDE.md README.md TRACKER.md
git commit -m "Campfire: document walk-up interactions"
git push origin main
```

---

# Part 2 — secrets and the tally

### Task 7: Secrets data and the saved tally in anim.js

**Goal:** Pure, tested list of the 13 secrets, their places, and a safe reader for the saved tally.

**Files:**
- Modify: `campfire/anim.js`
- Test: `campfire/tests/anim.test.js`

**Acceptance Criteria:**
- [ ] `A.SECRETS`: 13 entries `{ id, group, place, act | trigger, season? }`; groups nature/relics/spooky/seasonal; exactly one per season among the seasonal four, all sharing place `'season'`
- [ ] `A.SECRET_PLACES`: `{ name: [x, z] }`, every place within `6.0` of the centre, at least `4.9` from it, ≥ 1.5 apart, ≥ 1.4 from the tent (-3.4, -5.3), horse (2.6, -5.8), lantern post (1.55, -5.25), tether tree (4.8, -5.63), log (-3.6, -2.6) and the rock (4.4, 2.4)
- [ ] `A.secretsFor(season)` returns the 9 always-there secrets plus that season's one (10 in all)
- [ ] `A.readFound(text)` returns a list of known ids without duplicates; `[]` for null, broken JSON, or non-arrays

**Verify:** `node --test campfire/tests/anim.test.js` → `ℹ fail 0`

**Steps:**

- [ ] **Step 1: Failing tests**

```js
test('secrets: thirteen, places inside the edge and clear of the camp, one per season', () => {
  assert.strictEqual(A.SECRETS.length, 13);
  assert.strictEqual(new Set(A.SECRETS.map((s) => s.id)).size, 13);
  const seasonal = A.SECRETS.filter((s) => s.group === 'seasonal');
  assert.deepStrictEqual(seasonal.map((s) => s.season).sort(), ['autumn', 'spring', 'summer', 'winter']);
  const camp = [[-3.4, -5.3], [2.6, -5.8], [1.55, -5.25], [4.8, -5.63], [-3.6, -2.6], [4.4, 2.4]];
  const places = Object.entries(A.SECRET_PLACES);
  for (const [name, [x, z]] of places) {
    const r = Math.hypot(x, z);
    assert.ok(r <= 6.0 && r >= 4.9, name + ' at the edge: ' + r);
    for (const [cx, cz] of camp) assert.ok(Math.hypot(x - cx, z - cz) >= 1.4, name + ' clear of the camp');
  }
  for (let i = 0; i < places.length; i++) for (let j = i + 1; j < places.length; j++) {
    assert.ok(Math.hypot(places[i][1][0] - places[j][1][0], places[i][1][1] - places[j][1][1]) >= 1.5, places[i][0] + ' / ' + places[j][0]);
  }
  for (const s of A.SECRETS) {
    assert.ok(A.SECRET_PLACES[s.place], s.id + ' has a place');
    assert.ok((s.act && A.ACTIONS[s.act]) || s.trigger === 'step' || s.trigger === 'near', s.id + ' is found somehow');
  }
  for (const season of A.SEASONS) {
    const list = A.secretsFor(season);
    assert.strictEqual(list.length, 10);
    assert.strictEqual(list.filter((s) => s.group === 'seasonal')[0].season, season);
  }
});

test('readFound: known ids, no duplicates, empty for anything broken', () => {
  assert.deepStrictEqual(A.readFound(JSON.stringify(['shrine', 'shrine', 'bogus', 'skull'])), ['shrine', 'skull']);
  assert.deepStrictEqual(A.readFound(null), []);
  assert.deepStrictEqual(A.readFound('{oops'), []);
  assert.deepStrictEqual(A.readFound('{"a":1}'), []);
  assert.deepStrictEqual(A.readFound('[1, null, "nest"]'), ['nest']);
});
```

(`A.SEASONS` already exists — the seasons list; check its values are `['winter', 'spring', 'summer', 'autumn']` in some order and adapt the sort.)

- [ ] **Step 2:** Run, expect FAIL (`A.SECRETS` undefined).

- [ ] **Step 3: Implement** (after the spots helpers from Task 1):

```js
  // ---- secrets at the clearing's edge (walk up to them); +z is behind the starting view ----
  const polar = (a, r) => [Math.round(Math.sin(a) * r * 100) / 100, Math.round(Math.cos(a) * r * 100) / 100];
  const SECRET_PLACES = {
    season: polar(0, 5.2), mushrooms: polar(0.45, 5.7), skull: polar(0.9, 5.4), hedgehog: polar(1.3, 5.9),
    wisp: polar(1.65, 5.95), nest: polar(2.0, 5.8), initials: polar(2.3, 5.9),
    shrine: polar(-0.5, 5.8), stones: polar(-1.0, 5.5), sword: polar(-1.45, 5.7),
  };
  const SECRETS = [
    { id: 'mushrooms', group: 'nature', place: 'mushrooms', trigger: 'step' },
    { id: 'hedgehog', group: 'nature', place: 'hedgehog', act: 'look' },
    { id: 'nest', group: 'nature', place: 'nest', act: 'look' },
    { id: 'shrine', group: 'relics', place: 'shrine', act: 'pray' },
    { id: 'sword', group: 'relics', place: 'sword', act: 'pull' },
    { id: 'initials', group: 'relics', place: 'initials', act: 'read' },
    { id: 'wisp', group: 'spooky', place: 'wisp', trigger: 'near' },
    { id: 'skull', group: 'spooky', place: 'skull', act: 'look' },
    { id: 'stones', group: 'spooky', place: 'stones', trigger: 'step' },
    { id: 'snowman', group: 'seasonal', place: 'season', season: 'winter', act: 'look' },
    { id: 'pumpkin', group: 'seasonal', place: 'season', season: 'autumn', act: 'look' },
    { id: 'crown', group: 'seasonal', place: 'season', season: 'spring', act: 'wear' },
    { id: 'jar', group: 'seasonal', place: 'season', season: 'summer', act: 'open' },
  ];
  const secretsFor = (season) => SECRETS.filter((s) => !s.season || s.season === season);
  function readFound(text) {
    let list;
    try { list = JSON.parse(text); } catch (e) { return []; }
    if (!Array.isArray(list)) return [];
    const known = new Set(SECRETS.map((s) => s.id)), out = [];
    for (const id of list) if (typeof id === 'string' && known.has(id) && !out.includes(id)) out.push(id);
    return out;
  }
```

Export `SECRETS, SECRET_PLACES, secretsFor, readFound`. If a place fails the tests (e.g. `initials` too close to the tether tree), change its angle or radius in `SECRET_PLACES` until all pass — the test is the rule.

- [ ] **Step 4:** Run, expect `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add campfire/anim.js campfire/tests/anim.test.js
git commit -m "Campfire: secrets list, their places and the saved tally (pure, tested)"
```

---

### Task 8: secrets.js — nature and relic secrets

**Goal:** Build the mushroom ring, hedgehog, nest, shrine, sword in a stump and carved tree; their actions animate them; the forest keeps clear of their places.

**Files:**
- Create (replace the stub): `campfire/secrets.js`
- Modify: `campfire/scene.js` (build after `interact`; add places to `SPOTS` before the forest is built; obstacles; `update`)

**Acceptance Criteria:**
- [ ] `CampSecrets.build(kit)` returns `{ spots, update(t, walker, react), found() }`; `spots` are interact spots `{ id, x, z, r, y, acts: [act], secret: id }` for every act-found secret of the current season
- [ ] Bushes, trees, ferns and rocks don't spawn on secret places (their positions are pushed into scene.js's `SPOTS` before the forest is generated)
- [ ] Shrine, stump and the carved tree block the way (in `obstacles`); mushrooms don't
- [ ] Reactions: mushrooms glow (emissive caps + sparkle points) while the walker stands inside; hedgehog uncurls for `look` (body scale + snout out) then curls; nest chick pops up on `look`; shrine candle lights on `kindle` and burns 60 s (a small PointLight 0.4); sword shakes on each `strain`; carved initials brighten during `read`

**Verify:** Browser pane `?season=autumn`: walk to each place (the console helper `CampAnim.SECRET_PLACES` gives coordinates), see the hint (`F · Look` etc.), run it, see the reaction. No console errors.

**Steps:**

- [ ] **Step 1: scene.js** — right after `const SPOTS = [...]`, add:

```js
    for (const [x, z] of Object.values(A.SECRET_PLACES)) SPOTS.push([x, z]); // the forest leaves room for the secrets
```

(Check `clear()` is used by trees, ferns, rocks and bushes; for any generator that doesn't use it, add a `clear(x, z, 1.0)` check.)

- [ ] **Step 2: Create `campfire/secrets.js`** with this structure:

```js
// Campfire: secrets at the clearing's edge (CampAnim.SECRETS), what they do, and the tally of the ones this device
// has found. Browser global `CampSecrets`. kit: scene.js's helpers + { season, onFind(id, first) }.
(function () {
  'use strict';
  const A = window.CampAnim;
  const KEY = 'chongkit.campfire.found';
  const MOSS = 0x2f5a3a, STONE = 0x3a3f4a, BARK = 0x3a2416, CAP = 0xc8561b, GLOW = 0xf8b347, BONE = 0xe8e2d4, DARK = 0x150e0b;

  function build(kit) {
    const { THREE, scene, box, cyl, cone, group, particles } = kit;
    const list = A.secretsFor(kit.season);
    const P = (name) => A.SECRET_PLACES[name];
    const parts = {}; // id → what moves
    const obstacles = [];

    // ---- nature ----
    { const [x, z] = P('mushrooms'), g = group(x, 0, z), caps = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, m = new THREE.MeshStandardMaterial({ color: CAP, flatShading: true, roughness: 1, emissive: 0x000000 });
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.06, 5), m);
        cap.position.set(Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6);
        g.add(cyl(0.015, 0.02, 0.08, 4, BONE, cap.position.x, 0.04, cap.position.z), cap);
        caps.push(m);
      }
      scene.add(g);
      parts.mushrooms = { caps, sparks: particles(8, GLOW, 1), x, z };
    }
    // hedgehog under a bush, nest on a low branch: build each as a group of boxes/cones like visitors.js,
    // keep references to the moving parts in parts.hedgehog = { body, snout }, parts.nest = { chick }
    // ---- relics ----
    // shrine: a stone box with a roof, moss, a candle (box + PointLight 0x ff9a40, intensity 0 until lit): parts.shrine = { light, flame }
    // sword in a stump: cyl stump + a thin box blade + crossguard: parts.sword = { blade }
    // carved tree: a trunk (cyl 0.25) with a small plane of carved marks (MeshBasicMaterial DARK): parts.initials = { mark }
    // push [x, z, r] for shrine (0.45), sword (0.4), initials (0.35) into obstacles

    const spots = list.filter((s) => s.act).map((s) => {
      const [x, z] = P(s.place);
      return { id: 'secret:' + s.id, secret: s.id, x, z, r: 1.0, y: 1.0, acts: [s.act] };
    });

    function update(t, walker, rx) {
      const here = (name, r) => walker && Math.hypot(walker.at[0] - P(name)[0], walker.at[1] - P(name)[1]) < r;
      const m = parts.mushrooms, glow = here('mushrooms', 0.65) ? 1 : 0;
      m.level = (m.level || 0) + (glow - (m.level || 0)) * 0.08;
      m.caps.forEach((c) => c.emissive.setHex(m.level > 0.5 ? GLOW : m.level > 0.15 ? CAP : 0x000000));
      // sparks: like camp.js's moths, eight points rising over the ring while m.level > 0.1
      // hedgehog: if rx.spot === 'secret:hedgehog' → uncurl = A.win(rx.local, 0.4, 3.4, 0.4); body.scale.y = 1 + 0.3 * uncurl; snout.position.z = 0.1 + 0.08 * uncurl
      // nest: chick.position.y = base + 0.06 * A.win(rx.local, 0.8, 2.8, 0.2) when rx.spot === 'secret:nest'
      // shrine: lit since the last 'kindle' act event within 60 s: light.intensity = 0.4 * flicker; flame.visible
      // sword: blade.rotation.z = 0.04 * Math.sin(t * 40) * (any 'strain' event in the last 0.4 s ? 1 : 0)
      // initials: mark.material.color brightens during 'read'
    }
    return { spots, obstacles, update, parts };
  }

  window.CampSecrets = { build };
})();
```

The commented lines above are **required parts of this task**: write each one as code following the mushroom pattern (meshes from `box`/`cyl`/`cone`/`group`, colours from the constants, motion from `rx` and `A.events(t - n, t)` filtered by `act && name`). Keep every mesh low-poly and flat-shaded.

- [ ] **Step 3: scene.js wiring** — after `const interact = ...`:

```js
    const secrets = CampSecrets.build({ THREE, scene, box, cyl, cone, group, particles, season: SEASON });
    interact.add(secrets.spots);
    obstacles.push(...secrets.obstacles);
```

Note: `obstacles` must be pushed before `walk` reads them each frame (it reads `kit.obstacles` every update, so pushing after build works). In `update`, after `interact.update(t, wk);` add `secrets.update(t, wk.who ? wk : null, interact.react(t));`.

- [ ] **Step 4: Verify** (see **Verify**); `npm test` → `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add campfire/secrets.js campfire/scene.js
git commit -m "Campfire: nature and relic secrets at the clearing's edge"
```

---

### Task 9: Spooky and seasonal secrets

**Goal:** Will-o'-wisp, skull, standing stones and the four seasonal secrets, with their reactions and sounds.

**Files:**
- Modify: `campfire/secrets.js`, `campfire/audio.js`, `campfire/scene.js` (only if needed for the crown on the walker's head)

**Acceptance Criteria:**
- [ ] Wisp: a pale sprite (`blob`, colour 0x8fa6c4) bobbing at its place; within 2.0 m it drifts outward (away from the fire) and fades over 3 s, then returns after 90 s
- [ ] Skull: half-sunk in the leaves; on `look`, a beetle (tiny dark box) crawls out of an eye socket and back
- [ ] Stones: five standing stones in a 0.6 m ring; while the walker stands inside, runes (small emissive planes) glow and a low hum plays (an oscillator in `audio.js` whose gain follows `CampAudio.hum` 0–1, set from secrets.js each frame)
- [ ] Seasonal (only the current season's is built): snowman (arm drops on `look`, back after), pumpkin (inner candle light on during `look` then stays lit 60 s), flower crown (on `wear` it moves onto the walker's head until they sit back down), jar of fireflies (on `open`, 8 points spill up and drift off over 6 s; the jar empties until the page reloads)
- [ ] Wisp and stones are in no obstacle list; snowman, pumpkin, stones (each stone 0.15) block
- [ ] Sounds: `whisper` (wisp leaving: high filtered noise sweep), hum (continuous, gain 0–0.05), `uncork` (Task 4) for the jar

**Verify:** Browser pane with `?season=winter`, `?season=autumn`, `?season=spring`, `?season=summer`: each seasonal secret is there and reacts; wisp flees; stones hum (check `CampAudio.hum` > 0 in the console while inside). No console errors.

**Steps:**

- [ ] **Step 1:** In secrets.js, build each with the same pattern as Task 8 (group of primitives at `P(name)`, moving parts in `parts`), only building the seasonal one whose `season === kit.season`. For the crown, keep `parts.crown.worn` = walker name; in `update`, when worn, copy the walker's head world position into the crown each frame (`kit.people[who].head.getWorldPosition(...)`, +0.18 y) and clear it when `walker` is null (they sat down). Pass `people` in the kit from scene.js.
- [ ] **Step 2:** Wisp state: `{ gone: null | t }`; `near` → `gone = t`; while `t - gone < 3`: move outward `0.8 * u` m and fade opacity; hidden until `t - gone > 90`.
- [ ] **Step 3: audio.js** — in `start()` after other loops are set up, add a hum: two sine oscillators 55 Hz and 82.5 Hz into `humGain = gain(0, master)`; export `hum: 0` on `CampAudio`; in `update`: `humGain.gain.setTargetAtTime(0.05 * (CampAudio.hum || 0), now, 0.3);`. Add `case 'whisper': swoosh(at, 3000, 6000, 1.2, 0.03); break;` to `play`; secrets.js emits the whisper by calling `CampAudio.whisper && CampAudio.whisper()` — add `function whisperNow() { if (ctx && ctx.state === 'running') swoosh(ctx.currentTime + 0.01, 3000, 6000, 1.2, 0.03); }` and export it as `whisper`.
- [ ] **Step 4:** Verify (see **Verify**); `npm test`.
- [ ] **Step 5: Commit**

```bash
git add campfire/secrets.js campfire/audio.js campfire/scene.js
git commit -m "Campfire: spooky and seasonal secrets"
```

---

### Task 10: The tally, first-find chime, docs, push

**Goal:** Finding a secret is saved per device and shown as `found / 13` while walking; a first find chimes; docs updated; pushed.

**Files:**
- Modify: `campfire/secrets.js`, `campfire/audio.js`, `campfire/scene.js` or `campfire/app.js` (find callback), `CLAUDE.md`, `README.md`, `TRACKER.md`

**Acceptance Criteria:**
- [ ] A secret counts as found when its action's first event time passes (or at its start for actions without events), when the walker steps inside (`step`), or comes within 2 m (`near`)
- [ ] Found ids load with `A.readFound(localStorage.getItem('chongkit.campfire.found'))` in `try/catch`; a new find appends and saves (`try/catch`); without storage the tally lives in memory
- [ ] `#tally` shows `N / 13` (`textContent`), visible only while walking
- [ ] A first find plays a rising three-note chime (`CampAudio.chime()`: `ring` at 660, 880, 1320 Hz, 0.12 s apart); repeats don't
- [ ] README describes secrets and the tally (not where they are); TRACKER v11 marked done; CLAUDE.md mentions `CampAnim.SECRETS` and the storage key
- [ ] `npm test` passes; pushed

**Verify:** Browser pane: clear storage (`localStorage.removeItem('chongkit.campfire.found')`), reload, walk, tally reads `0 / 13`; find the shrine → `1 / 13` and a chime; reload → still `1 / 13`; pray again → no chime. `git log origin/main --oneline -1` shows the final commit.

**Steps:**

- [ ] **Step 1: secrets.js tally** — add:

```js
    const tally = document.getElementById('tally');
    let found = [];
    try { found = A.readFound(localStorage.getItem(KEY)); } catch (e) { found = []; }
    const show = () => { tally.textContent = found.length + ' / ' + A.SECRETS.length; };
    show();
    function find(id) {
      const first = !found.includes(id);
      if (first) {
        found.push(id);
        try { localStorage.setItem(KEY, JSON.stringify(found)); } catch (e) { /* storage off: this visit only */ }
        show();
      }
      if (kit.onFind) kit.onFind(id, first);
    }
```

In `update`: for act secrets, `if (rx.spot && rx.spot.startsWith('secret:') && rx.local > 0.5 && lastFound !== rx.spot + '@' + Math.floor(t - rx.local)) { lastFound = …; find(rx.spot.slice(7)); }`; for `step` secrets, find on entering (edge-triggered: inside now and not last frame); for the wisp, find when `gone` is set. Return `found: () => found.slice()`.

- [ ] **Step 2: chime** — audio.js: `function chime() { if (!ctx || ctx.state !== 'running') return; const at = ctx.currentTime + 0.02; [660, 880, 1320].forEach((f, i) => ring(at + i * 0.12, [f], 0.9, 0.03)); }`, export `chime`. In scene.js pass `onFind: (id, first) => { if (first && window.CampAudio && CampAudio.chime) CampAudio.chime(); }` to `CampSecrets.build`.

- [ ] **Step 3: Docs** — README Campfire: "Thirteen secrets hide at the edge of the clearing (one of them changes with the season). Each device remembers what it has found: the count shows top right while walking." CLAUDE.md Campfire: add "Secrets are `CampAnim.SECRETS` at `SECRET_PLACES` (tested to stay inside the edge and clear of the camp; the forest leaves room for them); each device saves its finds in localStorage `chongkit.campfire.found` (read through `CampAnim.readFound`)." TRACKER: v11 heading `✅`, last item checked, plus "- [x] Tests: actions, spots, secrets, readFound".

- [ ] **Step 4:** `npm test`, verify (see **Verify**), then:

```bash
git pull --rebase origin main
git add campfire CLAUDE.md README.md TRACKER.md
git commit -m "Campfire: secrets tally and first-find chime; docs"
git push origin main
```
