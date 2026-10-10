// Campfire: things to do while walking. The nearest spot in reach shows a hint (F · Pet); F or a tap on it runs
// the action (CampAnim.act), posing the walker; moving cancels. Browser global `CampInteract`.
// kit: { THREE, camera (set once it exists), walk, people, now(), busy(who, t), onAct?,
//        spots: [ { id, x, z, r, acts: [names], y?, drop?, companion? } ] }
(function () {
  'use strict';
  const A = window.CampAnim;
  const smooth = A.smooth;
  const TOUCH = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const turnToward = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

  function build(kit) {
    const { THREE, walk, people } = kit;
    const hint = document.getElementById('hint');
    const turns = new Map(); // spot id → how many times used (for alternating actions)
    const at = new THREE.Vector3();
    let current = null, shown = null; // spot in reach; the hint's spot
    let running = null; // { name, spot }
    const spots = kit.spots.slice();

    const nameFor = (spot) => {
      if (spot.companion) return kit.busy(spot.companion, kit.now()) ? 'hello' : 'talk';
      return spot.acts[(turns.get(spot.id) || 0) % spot.acts.length];
    };
    // F or a tap: start the spot's action, or end the one running (F again)
    function start(t) {
      if (walk.state() !== 'walking') return false;
      if (running) { stop(t); return true; }
      if (!current) return false;
      const w = walk.info();
      const name = nameFor(current);
      turns.set(current.id, (turns.get(current.id) || 0) + 1);
      A.act(name, t, { who: w.who, with: current.companion || null, spot: current.id });
      running = { name, spot: current };
      walk.hold(true);
      hide();
      if (kit.onAct) kit.onAct(name, current, t);
      return true;
    }
    function release() { walk.hold(false); walk.sitAt(0); }
    function stop(t) {
      A.cancelAct(t);
      running = null;
      release();
    }
    hint.addEventListener('click', () => start(kit.now()));

    // keyframes for the walker's right arm [time, shoulder x, elbow x] per action; both arms for some
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
    const BOTH = new Set(['warm', 'pray', 'pull', 'open']);
    const TORSO = {
      peek: [[0, 0], [0.6, 0.7], [3.2, 0.7], [4, 0]],
      look: [[0, 0], [0.6, 0.35], [3.4, 0.35], [4, 0]],
      pray: [[0, 0], [0.8, 0.45], [3.4, 0.45], [4, 0]],
      read: [[0, 0], [0.6, 0.2], [3, 0.2], [3.5, 0]],
      pull: [[0, 0], [0.8, -0.15], [1.2, 0.05], [2.0, -0.15], [2.4, 0.05], [3.5, 0]],
    };
    const ACT_DUR = (name) => A.ACTIONS[name].dur || 4;

    // after walk.update has posed the walker standing: the action's pose on top
    function pose(p, a, who) {
      const name = a.name, l = a.local;
      const staffHand = (i) => who === 'wizard' && i === 1; // the wizard's left hand stays on the staff
      const arm = ARM[name];
      if (arm) {
        const [sx, el] = A.keyframes(l, arm);
        p.arms.forEach((m, i) => {
          if ((i === 0 || BOTH.has(name)) && !staffHand(i)) { m.sh.rotation.x = sx; m.el.rotation.x = el; }
        });
      }
      if (TORSO[name]) p.torso.rotation.x = 0.06 + A.keyframes(l, TORSO[name])[0];
      if (name === 'look' || name === 'read') p.head.rotation.x = 0.4 * A.win(l, 0.3, ACT_DUR(name) - 0.3, 0.3);
      if (name === 'stew') { // ladle a bowl, sit by the pot, a spoonful each loop
        const sit = smooth((l - 1.4) / 0.8);
        walk.sitAt(sit, 0.42);
        p.torso.rotation.x = 0.1; // upright on the ground
        const spoon = sit >= 1 ? A.win(((l - 2.2) % 3.2 + 3.2) % 3.2, 0, 0.6, 0.2) : 0;
        p.arms[0].sh.rotation.x = l < 1.4 ? A.keyframes(l, [[0, 0], [0.5, -1.3], [1.0, -1.3], [1.4, -0.6]])[0] : -0.6 - 0.9 * spoon;
        p.arms[0].el.rotation.x = -1.2 - 0.6 * spoon;
        if (!staffHand(1)) { p.arms[1].sh.rotation.x = l < 1.4 ? -0.3 : -0.7; p.arms[1].el.rotation.x = -1.3; } // the bowl hand
      }
      if (name === 'sit') {
        walk.sitAt(smooth(l / 0.8), (running && running.spot.drop) || 0);
        p.torso.rotation.x = 0.1;
      }
    }

    // every frame, after walk.update. wk: what walk.update returned.
    function update(t, wk) {
      const a = A.actAt(t);
      if (running && !a) { running = null; release(); } // it finished
      if (running && (walk.wantsToMove() || walk.state() !== 'walking')) stop(t); // moved, or E sent them back
      if (!wk.who) { current = null; if (running) stop(t); release(); hide(); return; }
      const list = spots.filter((s) => s.companion !== wk.who);
      current = walk.state() === 'walking' ? A.nearestSpot(wk.at[0], wk.at[1], list) : null;
      if (running && a) {
        const p = people[wk.who], s = running.spot;
        const yaw = turnToward(wk.yaw, Math.atan2(s.x - wk.at[0], s.z - wk.at[1]), 0.15); // turn to it
        walk.face(yaw);
        p.root.rotation.y = yaw;
        pose(p, a, wk.who);
      }
      if (!current || running || !kit.camera) { hide(); return; }
      at.set(current.x, current.y || 1.4, current.z).project(kit.camera);
      if (at.z > 1) { hide(); return; }
      const label = A.ACTIONS[nameFor(current)].label;
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

    // what the props and the others react to (0–1); safe before any action has run
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
        name: n, local: l, spot: a ? a.info.spot : null,
      };
    }
    const add = (more) => { spots.push(...more); };
    return { update, start, react, add, spots };
  }

  window.CampInteract = { build };
})();
