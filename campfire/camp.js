// Campfire: the camp around the fire: a tripod with a pot of stew, a tent, the samurai's horse tethered
// to a tree, a lantern on a forked post beside it. Browser global `CampProps`. `kit` holds scene.js's helpers.
(function () {
  'use strict';
  const A = window.CampAnim;
  const DARK = 0x150e0b, IRON = 0x22304a, IRON_HI = 0x3a3f4a, CANVAS = 0x96603a, CANVAS_DK = 0x744726;
  const BAY = 0x55341d, MANE = 0x150e0b;

  function build(kit) {
    const { THREE, scene, mat, mesh, box, cyl, cone, group, rand } = kit;
    const UP = new THREE.Vector3(0, 1, 0);
    // a pole (cylinder) from a to b
    function pole(a, b, r, color) {
      const d = new THREE.Vector3().subVectors(b, a);
      const m = cyl(r, r, d.length(), 5, color, 0, 0, 0);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
      return m;
    }

    // ---- tripod and the pot of stew over the fire ----
    const POT = new THREE.Vector3(0, 0.8, 0); // where the stew's surface is
    const apex = new THREE.Vector3(0, 1.45, 0);
    for (const a of [-Math.PI / 2, Math.PI / 2 - 0.95, Math.PI / 2 + 0.95]) {
      scene.add(pole(new THREE.Vector3(Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75), apex.clone().add(new THREE.Vector3(Math.cos(a) * 0.04, 0.08, Math.sin(a) * 0.04)), 0.022, 0x3a2416));
    }
    scene.add(box(0.1, 0.06, 0.1, 0x24170f, 0, 1.46, 0)); // the lashing
    scene.add(box(0.015, 0.5, 0.015, IRON_HI, 0, 1.2, 0)); // chain
    const pot = group(0, 0, 0);
    pot.add(cyl(0.18, 0.14, 0.22, 9, IRON, 0, POT.y - 0.12, 0));
    pot.add(cyl(0.19, 0.19, 0.03, 9, IRON_HI, 0, POT.y - 0.01, 0)); // rim
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.01, 3, 10, Math.PI), mat(IRON_HI));
    handle.position.set(0, POT.y, 0);
    pot.add(handle);
    const stew = kit.flat(0.165, 9, 0x744726, 0, POT.y + 0.005, 0);
    pot.add(stew);
    scene.add(pot);
    const bubbles = Array.from({ length: 4 }, () => {
      const b = mesh(new THREE.IcosahedronGeometry(0.025, 0), 0x96603a, 0, POT.y + 0.01, 0, false);
      pot.add(b);
      return b;
    });
    const ladle = group(0, POT.y, 0);
    const lh = cyl(0.01, 0.01, 0.42, 4, 0x55341d, 0.06, 0.12, 0);
    lh.rotation.z = -0.5;
    ladle.add(lh);
    ladle.add(mesh(new THREE.SphereGeometry(0.035, 5, 3), IRON_HI, -0.04, -0.03, 0));
    scene.add(ladle);
    const sparkle = kit.particles(6, 0xf8b347, 1.5);
    const steam = Array.from({ length: 4 }, () => {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.blob, color: 0x9a948c, transparent: true, depthWrite: false }));
      scene.add(m);
      return m;
    });

    // ---- a tent facing the fire ----
    const tent = group(-3.4, 0, -5.3);
    tent.rotation.y = Math.atan2(3.4, 5.3);
    const W = 0.75, H = 1.1, L = 1.7, slope = Math.atan2(H, W), side = Math.hypot(H, W);
    for (const s of [-1, 1]) {
      const wall = box(0.03, side, L, s < 0 ? CANVAS : CANVAS_DK, s * W / 2, H / 2, 0);
      wall.rotation.z = s * (Math.PI / 2 - slope);
      tent.add(wall);
      const flap = box(0.025, side * 0.95, 0.5, CANVAS, s * (W / 2 + 0.18), H / 2 - 0.02, L / 2 + 0.18); // open flaps
      flap.rotation.set(0, s * 0.9, s * (Math.PI / 2 - slope));
      tent.add(flap);
    }
    const back = new THREE.Shape([new THREE.Vector2(-W, 0), new THREE.Vector2(W, 0), new THREE.Vector2(0, H)]);
    const backM = new THREE.Mesh(new THREE.ShapeGeometry(back), mat(CANVAS_DK));
    backM.position.z = -L / 2;
    tent.add(backM);
    const door = new THREE.Mesh(new THREE.ShapeGeometry(back), new THREE.MeshBasicMaterial({ color: 0x6e2a1f })); // lit by a candle inside
    door.position.z = L / 2 - 0.05;
    door.scale.set(0.8, 0.85, 1);
    tent.add(door);
    const candle = new THREE.PointLight(0xff9a40, 0.5, 2.6, 2);
    candle.position.set(0, 0.35, L / 2 + 0.3);
    tent.add(candle);
    tent.add(cyl(0.02, 0.02, H + 0.15, 4, 0x3a2416, 0, (H + 0.15) / 2, L / 2 + 0.02)); // front pole
    tent.add(box(0.5, 0.08, 0.9, 0x31445e, 0.1, 0.04, 0.1)); // a bedroll inside
    for (const s of [-1, 1]) { // guy ropes and stakes
      const stake = new THREE.Vector3(s * 0.4, 0, L / 2 + 0.7);
      tent.add(pole(new THREE.Vector3(0, H + 0.1, L / 2), stake, 0.006, 0x96603a));
      tent.add(box(0.03, 0.12, 0.03, 0x3a2416, stake.x, 0.04, stake.z));
    }
    scene.add(tent);

    // ---- the samurai's horse, tethered to a tree ----
    const horse = group(2.6, 0, -5.8);
    horse.rotation.y = 1.49; // side-on to the fire, head toward the tree
    const legs = [];
    for (const [x, z] of [[-0.14, 0.42], [0.14, 0.42], [-0.14, -0.42], [0.14, -0.42]]) {
      const leg = group(x, 0.85, z);
      leg.add(box(0.11, 0.75, 0.12, BAY, 0, -0.37, 0));
      leg.add(box(0.12, 0.1, 0.13, DARK, 0, -0.8, 0)); // hoof
      horse.add(leg);
      legs.push(leg);
    }
    const body = group(0, 1.05, 0);
    body.add(box(0.44, 0.48, 1.15, BAY, 0, 0, 0));
    body.add(box(0.46, 0.06, 0.5, 0x6e2a1f, 0, 0.25, 0.02)); // saddle blanket
    body.add(box(0.36, 0.1, 0.36, DARK, 0, 0.3, 0.02)); // saddle
    for (const s of [-1, 1]) body.add(box(0.02, 0.35, 0.03, DARK, s * 0.24, -0.05, 0.02)); // stirrup straps
    horse.add(body);
    const neck = group(0, 1.2, 0.5);
    neck.rotation.x = -0.6;
    neck.add(box(0.24, 0.62, 0.3, BAY, 0, 0.28, 0));
    neck.add(box(0.06, 0.62, 0.16, MANE, 0, 0.3, -0.12)); // mane
    const head = group(0, 0.6, 0.02);
    head.rotation.x = 1.3;
    head.add(box(0.2, 0.22, 0.52, BAY, 0, 0, 0.18));
    head.add(box(0.16, 0.14, 0.12, 0x3a2416, 0, -0.03, 0.44)); // muzzle
    for (const s of [-1, 1]) head.add(box(0.03, 0.04, 0.02, DARK, s * 0.1, 0.05, 0.12)); // eyes
    const ears = [-1, 1].map((s) => {
      const e = group(s * 0.07, 0.12, -0.05);
      e.add(cone(0.04, 0.12, 4, BAY, 0, 0.06, 0));
      head.add(e);
      return e;
    });
    neck.add(head);
    horse.add(neck);
    const tail = group(0, 1.2, -0.58);
    tail.add(box(0.1, 0.6, 0.1, MANE, 0, -0.3, -0.05));
    horse.add(tail);
    scene.add(horse);
    // the rein, from the muzzle to the tree trunk
    const rein = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x3a2416 }));
    rein.frustumCulled = false;
    scene.add(rein);
    const TETHER = new THREE.Vector3(4.8, 1.0, -5.63); // the old tree's trunk
    scene.add(box(0.06, 0.05, 0.06, 0x3a2416, TETHER.x - 0.15, TETHER.y, TETHER.z + 0.1)); // the knot

    // ---- a lantern on a forked post beside the horse ----
    const POST = new THREE.Vector3(1.55, 0, -5.25);
    scene.add(cyl(0.035, 0.045, 1.75, 5, 0x3a2416, POST.x, 0.875, POST.z));
    const fork = cyl(0.025, 0.03, 0.35, 4, 0x3a2416, POST.x + 0.1, 1.85, POST.z);
    fork.rotation.z = -0.5;
    scene.add(fork);
    const branchEnd = new THREE.Vector3(POST.x + 0.2, 1.95, POST.z);
    const lantern = group(branchEnd.x, branchEnd.y, branchEnd.z);
    lantern.add(box(0.012, 0.25, 0.012, IRON_HI, 0, -0.12, 0)); // hanger
    const lamp = group(0, -0.36, 0);
    lamp.add(box(0.16, 0.03, 0.16, DARK, 0, 0.12, 0));
    lamp.add(cone(0.1, 0.08, 4, DARK, 0, 0.17, 0));
    lamp.add(box(0.16, 0.03, 0.16, DARK, 0, -0.1, 0));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lamp.add(box(0.02, 0.2, 0.02, DARK, x * 0.07, 0.01, z * 0.07));
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
    lamp.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), flameMat));
    const lampLight = new THREE.PointLight(0xffb060, 0.7, 3.5, 2);
    lamp.add(lampLight);
    lantern.add(lamp);
    scene.add(lantern);
    const LAMP_AT = branchEnd.clone().setY(branchEnd.y - 0.36);
    const moths = kit.particles(5, 0xcfc8bb, 1);

    const tmp = new THREE.Vector3();
    const r0 = rand() * 100;

    // ---- every frame. s: { stir 0–1 (the wizard is stirring), sl (seconds into it), wind 0–1, fuel } ----
    function update(t, s) {
      // stew: bubbles pop, steam rises, the ladle stirs itself while the wizard gestures
      bubbles.forEach((b, i) => {
        const c = ((t * (0.7 + i * 0.13) + i * 0.37) % 1);
        const a = i * 1.7 + Math.floor(t * (0.7 + i * 0.13) + i * 0.37) * 2.3;
        b.position.set(Math.cos(a) * 0.09, POT.y + 0.01, Math.sin(a) * 0.09);
        b.scale.setScalar(c < 0.8 ? c / 0.8 : 0.01);
      });
      steam.forEach((m, i) => {
        const age = (t * 0.35 + i / steam.length) % 1;
        m.position.set(0.15 * A.noise1(t * 0.3 + i * 5, 900 + i) + 0.3 * age * (s.wind - 0.3), POT.y + 0.1 + age * 0.9, 0.1 * A.noise1(t * 0.3 + i * 7, 910 + i));
        m.scale.setScalar(0.12 + 0.35 * age);
        m.material.opacity = 0.22 * Math.sin(Math.PI * age) * (0.5 + 0.5 * s.fuel);
      });
      const swirl = s.stir > 0 ? s.sl * 3.2 : 0;
      ladle.rotation.y = swirl + 0.6;
      ladle.position.set(Math.cos(swirl) * 0.05 * s.stir, POT.y, Math.sin(swirl) * 0.05 * s.stir);
      const sp = sparkle.geometry.attributes.position, sc = sparkle.geometry.attributes.color, sb = sparkle.userData.base;
      for (let i = 0; i < 6; i++) {
        const a = swirl * 1.3 + i * 1.05, h = ((t * 0.8 + i / 6) % 1);
        sp.setXYZ(i, Math.cos(a) * 0.2, POT.y + 0.05 + h * 0.4, Math.sin(a) * 0.2);
        const on = s.stir * (1 - h) * (A.noise1(t * 9 + i, 990) > -0.2 ? 1 : 0.3);
        sc.setXYZ(i, sb.r * on, sb.g * on, sb.b * on);
      }
      sp.needsUpdate = sc.needsUpdate = true;

      // horse: breathes, swishes its tail, grazes now and then, flicks its ears, shifts its weight
      const graze = A.envelope(t, 41, 12, 9);
      neck.rotation.x = -0.6 + 1.25 * graze + 0.03 * Math.sin(t * 1.3);
      head.rotation.x = 1.3 - 0.5 * graze;
      body.scale.y = 1 + 0.015 * A.breath(t, 4.2, 0.2);
      tail.rotation.z = 0.25 * Math.sin(t * 2.3) * (0.4 + 0.6 * Math.max(0, A.noise1(t * 0.4, 920)));
      tail.rotation.x = 0.15 + 0.1 * Math.sin(t * 1.1);
      ears.forEach((e, i) => { e.rotation.x = 0.5 * A.envelope(t + i * 1.7, 7 + i * 2, 3, 0.6); });
      const shiftW = A.envelope(t, 29, 20, 3);
      legs[3].rotation.x = 0.25 * shiftW; // rests a hind hoof
      head.localToWorld(tmp.set(0, -0.05, 0.4));
      const rp = rein.geometry.attributes.position;
      rp.setXYZ(0, tmp.x, tmp.y, tmp.z);
      rp.setXYZ(1, TETHER.x - 0.15, TETHER.y, TETHER.z + 0.1);
      rp.needsUpdate = true;

      // lantern: sways in the wind, flickers; moths circle it and the fire
      lantern.rotation.z = 0.08 * (s.wind - 0.3) + 0.04 * A.noise1(t * 0.8, 930);
      lantern.rotation.x = 0.04 * A.noise1(t * 0.7, 931);
      const lf = 0.9 + 0.1 * A.noise1(t * 6, 932);
      lampLight.intensity = 0.7 * lf;
      flameMat.color.setHex(lf > 0.95 ? 0xffe08a : 0xf8b347);
      const mp = moths.geometry.attributes.position, mc = moths.geometry.attributes.color, mb = moths.userData.base;
      for (let i = 0; i < 5; i++) {
        const atLamp = i < 2, c = atLamp ? LAMP_AT : POT;
        const a = t * (1.6 + i * 0.4) + i * 2 + 1.2 * A.noise1(t * 0.9 + i * 3, 940 + i), r = (atLamp ? 0.18 : 0.45) + 0.12 * A.noise1(t * 1.3 + i, 950 + i);
        mp.setXYZ(i, c.x + Math.cos(a) * r, c.y + (atLamp ? 0 : 0.35) + 0.15 * A.noise1(t * 1.7 + i, 960 + i), c.z + Math.sin(a) * r);
        mc.setXYZ(i, mb.r * 0.7, mb.g * 0.7, mb.b * 0.7);
      }
      mp.needsUpdate = mc.needsUpdate = true;
    }

    return { update, POT, r0 };
  }

  window.CampProps = { build };
})();
