// Campfire: walking around the camp as one of the three. Stand up, walk (WASD / arrows / joystick, relative
// to the camera; Shift runs), walk back to the seat and sit down. Browser global `CampWalk`.
// kit: { people: { traveler, wizard, samurai }, obstacles: [[x, z, r, owner?], …], onStep(speed) }
(function () {
  'use strict';
  const A = window.CampAnim;
  const RADIUS = 0.28, EDGE = 6.4, WALK = 1.5, RUN = 2.9, RISE = 0.8;
  const lerp = (a, b, k) => a + (b - a) * k;
  const turnToward = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

  function build(kit) {
    const keys = new Set();
    let joy = [0, 0];
    let who = null, state = 'seated', k = 0;
    let x = 0, z = 0, yaw = 0, vx = 0, vz = 0, phase = 0, speed = 0, back = 0, ahead = false;
    let chosen = 'traveler';

    const person = () => kit.people[who];
    function start(name) {
      who = name;
      const p = person();
      x = p.seat.x; z = p.seat.z; yaw = p.seat.yaw;
      vx = vz = speed = 0;
      state = 'rising';
    }
    // E / the button: stand up as the chosen one, or go back and sit down
    function toggle() {
      if (!who) start(chosen);
      else if (state === 'rising' || state === 'walking') { state = 'returning'; back = 0; }
    }
    function choose(name) { if (kit.people[name]) chosen = name; }
    function setKey(code, down) { if (down) keys.add(code); else keys.delete(code); }
    function setJoy(jx, jy) { joy = [jx, jy]; }

    // input as [right, forward], each -1 … 1
    function input() {
      let ix = joy[0], iz = joy[1];
      if (keys.has('KeyW') || keys.has('ArrowUp')) iz += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) iz -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
      const m = Math.hypot(ix, iz);
      return m > 1 ? [ix / m, iz / m] : [ix, iz];
    }

    // Every frame, after the stories have posed everyone. viewYaw: where the camera sits around its target.
    // Returns { who, k (0 seated … 1 standing), at: [x, z], yaw, moving }.
    function update(t, dt, viewYaw) {
      if (!who) return { who: null, k: 0 };
      const p = person();
      const obstacles = kit.obstacles.filter((o) => o[3] !== who);
      let want = [0, 0], run = false;
      if (state === 'rising') { k = Math.min(1, k + dt / RISE); if (k >= 1) state = 'walking'; }
      if (state === 'walking') {
        const [ix, iz] = input();
        ahead = iz > 0.3; // walking away from the camera: it may follow round behind
        const fx = -Math.sin(viewYaw), fz = -Math.cos(viewYaw), rx = Math.cos(viewYaw), rz = -Math.sin(viewYaw);
        run = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(joy[0], joy[1]) > 0.95;
        want = [(fx * iz + rx * ix) * (run ? RUN : WALK), (fz * iz + rz * ix) * (run ? RUN : WALK)];
      }
      if (state === 'returning') { // steer straight back to the seat, sliding around things
        back += dt;
        const dx = p.seat.x - x, dz = p.seat.z - z, d = Math.hypot(dx, dz);
        if (d < 0.12 || back > 10) { x = p.seat.x; z = p.seat.z; state = 'sitting'; }
        else want = [(dx / d) * Math.min(WALK, d * 3), (dz / d) * Math.min(WALK, d * 3)];
      }
      if (state === 'sitting') {
        yaw = turnToward(yaw, p.seat.yaw, Math.min(1, dt * 6));
        k = Math.max(0, k - dt / RISE);
        if (k <= 0) { // back in the seat: hand the figure back to its stories
          p.root.position.set(p.seat.x, 0, p.seat.z);
          p.root.rotation.y = p.seat.yaw;
          p.legs.forEach((l) => { l.hip.position.y = p.sitY; l.hip.rotation.x = l.sitHip; l.knee.rotation.x = l.sitKnee; });
          if (p.robes) { p.robes.stand.visible = false; p.robes.sit.forEach((m) => { m.visible = true; }); }
          who = null; state = 'seated';
          return { who: null, k: 0 };
        }
      }
      // move: ease toward the wanted velocity, then push out of obstacles
      const ease = Math.min(1, dt * 8);
      vx = lerp(vx, want[0], ease); vz = lerp(vz, want[1], ease);
      if (state === 'walking' || state === 'returning') {
        const ox = x, oz = z;
        [x, z] = A.collide(x + vx * dt, z + vz * dt, RADIUS, state === 'returning' ? obstacles.filter((o) => Math.hypot(o[0] - p.seat.x, o[1] - p.seat.z) > 0.9) : obstacles, EDGE);
        speed = Math.hypot(x - ox, z - oz) / Math.max(dt, 1e-3);
        if (speed > 0.2) yaw = turnToward(yaw, Math.atan2(vx, vz), Math.min(1, dt * 8));
      } else speed = 0;
      const before = Math.floor(phase / Math.PI);
      phase += dt * speed * 4.2;
      if (Math.floor(phase / Math.PI) !== before && speed > 0.3 && kit.onStep) kit.onStep(speed);

      // pose: legs straighten and swing, the body rises, arms swing, a slight bob
      const g = A.gait(phase, Math.min(1.6, speed / WALK));
      const hipY = lerp(p.sitY, p.standY, k);
      p.root.position.set(x, k * 0.025 * Math.abs(Math.sin(phase)) * Math.min(1, speed), z);
      p.root.rotation.y = yaw;
      p.legs.forEach((l, i) => {
        l.hip.position.y = hipY;
        l.hip.rotation.x = lerp(l.sitHip, Math.PI / 2 - g.legs[i].hip, k);
        l.knee.rotation.x = lerp(l.sitKnee, -Math.PI / 2 - g.legs[i].knee, k);
      });
      p.torso.position.y = hipY;
      p.torso.rotation.x = lerp(p.torso.rotation.x, 0.06 + 0.08 * Math.min(1, speed / RUN), k);
      p.torso.rotation.z = lerp(p.torso.rotation.z, 0, k);
      p.arms.forEach((a, i) => {
        if (who === 'wizard' && i === 1) return; // the staff hand stays on the staff
        a.sh.rotation.set(lerp(a.sh.rotation.x, g.arms[i], k), 0, lerp(a.sh.rotation.z, (i ? -1 : 1) * 0.08, k));
        a.el.rotation.x = lerp(a.el.rotation.x, -0.25, k);
      });
      p.head.rotation.x = lerp(p.head.rotation.x, 0, k);
      if (p.robes) { p.robes.stand.visible = k > 0.5; p.robes.sit.forEach((m) => { m.visible = k <= 0.5; }); }
      return { who, k, at: [x, z], yaw, moving: speed > 0.2 && state === 'walking' && ahead };
    }

    const info = () => ({ who, state, k, x, z, yaw, speed, keys: [...keys] });
    return { update, toggle, choose, setKey, setJoy, info, away: (name) => who === name, walking: () => !!who };
  }

  window.CampWalk = { build };
})();
