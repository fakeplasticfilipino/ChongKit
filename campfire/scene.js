// Campfire: builds the world (forest, fire, the three figures) and moves it.
// Browser global `CampScene`. Uses three.js (global THREE) and anim.js (global CampAnim).
(function () {
  'use strict';
  const A = window.CampAnim;

  function build(THREE) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070c);
    scene.fog = new THREE.FogExp2(0x0a0f1a, 0.065);

    // ---- helpers ----
    const mats = {};
    const mat = (c) => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 1, metalness: 0 }));
    function mesh(geo, color, x, y, z, shadow) {
      const m = new THREE.Mesh(geo, mat(color));
      m.position.set(x || 0, y || 0, z || 0);
      if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
      return m;
    }
    const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
    const cyl = (rt, rb, h, seg, c, x, y, z) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z);
    const cone = (r, h, seg, c, x, y, z) => mesh(new THREE.ConeGeometry(r, h, seg), c, x, y, z);
    const group = (x, y, z) => { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); return g; };
    const rand = A.rng(42);

    // ---- light ----
    scene.add(new THREE.HemisphereLight(0x4a6280, 0x101828, 0.7));
    const moonLight = new THREE.DirectionalLight(0x8fa6c4, 0.35);
    moonLight.position.set(10, 20, -14);
    scene.add(moonLight);
    const fireLight = new THREE.PointLight(0xff9a40, 5, 9, 1.6);
    fireLight.position.set(0, 0.8, 0);
    fireLight.castShadow = true;
    fireLight.shadow.mapSize.set(512, 512);
    fireLight.shadow.bias = -0.004;
    fireLight.shadow.camera.near = 0.3;
    scene.add(fireLight);

    // ---- ground ----
    const ground = mesh(new THREE.CircleGeometry(40, 24), 0x16241b, 0, 0, 0);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const clearing = mesh(new THREE.CircleGeometry(3.6, 14), 0x3a2416, 0, 0.01, 0);
    clearing.rotation.x = -Math.PI / 2;
    scene.add(clearing);
    // grass tufts at the edge of the clearing
    for (let i = 0; i < 40; i++) {
      const a = -Math.PI * rand(), r = 3.1 + rand() * 3;
      const t = cone(0.08 + rand() * 0.06, 0.2 + rand() * 0.2, 3, rand() < 0.5 ? 0x213425 : 0x2f4a30, Math.cos(a) * r, 0.1, Math.sin(a) * r);
      scene.add(t);
    }

    // ---- fire pit: stones, logs ----
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const s = mesh(new THREE.DodecahedronGeometry(0.16 + rand() * 0.05), rand() < 0.5 ? 0x5e5650 : 0x3a2416, Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7);
      s.rotation.set(rand() * 3, rand() * 3, 0);
      scene.add(s);
    }
    for (let i = 0; i < 3; i++) {
      const l = cyl(0.07, 0.07, 0.9, 6, 0x24170f, 0, 0.12, 0);
      l.rotation.set(Math.PI / 2 - 0.25, (i / 3) * Math.PI, 0);
      l.castShadow = false;
      scene.add(l);
    }
    const embersBed = mesh(new THREE.CircleGeometry(0.45, 8), 0x9b3a1c, 0, 0.03, 0, false);
    embersBed.rotation.x = -Math.PI / 2;
    embersBed.material = new THREE.MeshBasicMaterial({ color: 0x9b3a1c });
    scene.add(embersBed);

    // ---- flames ----
    const flameCols = [0xc8561b, 0xe8812c, 0xf8b347, 0xffe08a];
    const flames = [];
    for (let i = 0; i < 7; i++) {
      const layer = i < 3 ? 0 : i < 5 ? 1 : i < 6 ? 2 : 3;
      const h = [0.7, 0.55, 0.4, 0.26][layer], r = [0.22, 0.17, 0.12, 0.08][layer];
      const geo = new THREE.ConeGeometry(r, h, 5);
      geo.translate(0, h / 2, 0); // grow from the base
      const f = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: flameCols[layer] }));
      const a = i * 2.4, off = layer === 0 ? 0.12 : 0.05;
      f.userData = { x: Math.cos(a) * off, z: Math.sin(a) * off, seed: i + 1 };
      f.position.set(f.userData.x, 0.08, f.userData.z);
      f.renderOrder = layer;
      scene.add(f);
      flames.push(f);
    }

    // ---- seated people ----
    // front is +z; turned to face the fire
    function person(o) {
      const root = group(o.x, 0, o.z);
      root.rotation.y = Math.atan2(-o.x, -o.z);
      const hip = o.hip;
      for (const s of [-1, 1]) {
        root.add(box(0.15, 0.15, 0.42, o.legs, s * 0.11, hip, 0.18));
        root.add(box(0.14, hip, 0.14, o.legs, s * 0.11, hip / 2, 0.38));
        root.add(box(0.15, 0.08, 0.24, 0x150e0b, s * 0.11, 0.04, 0.44));
      }
      const torso = group(0, hip, 0);
      torso.rotation.x = o.lean;
      torso.add(box(0.42, 0.58, 0.26, o.coat, 0, 0.29, 0));
      root.add(torso);
      const head = group(0, 0.6, 0.02);
      head.add(box(0.24, 0.26, 0.24, o.skin, 0, 0.13, 0));
      head.add(box(0.26, 0.09, 0.26, o.hair, 0, 0.27, -0.01)); // hair on top
      head.add(box(0.26, 0.2, 0.06, o.hair, 0, 0.16, -0.12)); // hair at the back
      torso.add(head);
      const arms = [-1, 1].map((s) => {
        const sh = group(s * 0.26, 0.52, 0);
        sh.add(box(0.11, 0.48, 0.12, o.coat, 0, -0.22, 0));
        sh.add(box(0.1, 0.1, 0.1, o.skin, 0, -0.48, 0)); // hand
        sh.rotation.x = -0.75;
        torso.add(sh);
        return sh;
      });
      scene.add(root);
      return { root, torso, head, arms, lean: o.lean };
    }

    // a log to sit on
    function seatLog(x, z) {
      const l = cyl(0.17, 0.17, 1.1, 7, 0x55341d, x, 0.17, z);
      l.rotation.z = Math.PI / 2;
      l.rotation.y = Math.atan2(-x, -z);
      scene.add(l);
    }

    // traveler: coat, red scarf, leaning on a cane
    seatLog(-2.15, 0.35);
    const traveler = person({ x: -2.1, z: 0.35, hip: 0.4, lean: 0.15, coat: 0x3a2416, legs: 0x24170f, skin: 0x96603a, hair: 0x24170f });
    traveler.torso.add(box(0.3, 0.08, 0.28, 0x6e2a1f, 0, 0.56, 0.02)); // scarf
    traveler.torso.add(box(0.08, 0.3, 0.04, 0x6e2a1f, 0.06, 0.4, 0.15));
    const cane = cyl(0.025, 0.025, 1.0, 5, 0x55341d, 0.28, 0.5, 0.62);
    cane.rotation.x = -0.15;
    traveler.root.add(cane);
    traveler.arms[1].rotation.set(-1.0, 0, 0.12); // right hand on the cane

    // wizard: robe, beard, pointed hat, glowing staff
    seatLog(0, -2.3);
    const wizard = person({ x: 0, z: -2.25, hip: 0.4, lean: 0.12, coat: 0x2c1a28, legs: 0x2c1a28, skin: 0x96603a, hair: 0x9a948c });
    wizard.root.add(cyl(0.3, 0.55, 0.5, 8, 0x2c1a28, 0, 0.25, 0.2)); // robe over the legs
    const beard = cone(0.13, 0.32, 5, 0xcfc8bb, 0, -0.04, 0.12);
    beard.rotation.x = Math.PI;
    wizard.head.add(beard);
    const hat = group(0, 0.27, 0);
    hat.add(cyl(0.34, 0.34, 0.03, 10, 0x45293e, 0, 0, 0));
    const tip = cone(0.18, 0.55, 7, 0x45293e, 0, 0.27, -0.03);
    tip.rotation.x = -0.25;
    hat.add(tip);
    wizard.head.add(hat);
    const staff = group(0.55, 0, 0.3);
    staff.add(cyl(0.03, 0.035, 1.9, 5, 0x55341d, 0, 0.95, 0));
    staff.add(cyl(0.06, 0.03, 0.18, 5, 0x55341d, 0, 1.92, 0)); // the crook
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0xf8b347 }));
    crystal.position.y = 1.95;
    staff.add(crystal);
    const crystalLight = new THREE.PointLight(0xf8b347, 0.6, 2.5, 2);
    crystalLight.position.y = 1.95;
    staff.add(crystalLight);
    wizard.root.add(staff);
    wizard.arms[1].rotation.set(-0.5, 0, -0.35); // right hand on the staff

    // fighter: topknot, sword on the back, crouched on a stone
    const seatStone = mesh(new THREE.DodecahedronGeometry(0.28), 0x5e5650, 2.15, 0.15, 0.35);
    scene.add(seatStone);
    const fighter = person({ x: 2.1, z: 0.35, hip: 0.32, lean: 0.25, coat: 0x6e2a1f, legs: 0x24170f, skin: 0x96603a, hair: 0x150e0b });
    fighter.head.add(mesh(new THREE.DodecahedronGeometry(0.07), 0x150e0b, 0, 0.32, -0.06)); // topknot
    const sword = group(0.05, 0.3, -0.16);
    sword.rotation.z = 0.55;
    sword.add(box(0.06, 0.8, 0.02, 0x9a948c, 0, 0, 0));
    sword.add(box(0.22, 0.04, 0.05, 0x55341d, 0, 0.42, 0));
    sword.add(box(0.04, 0.18, 0.04, 0x24170f, 0, 0.53, 0));
    fighter.torso.add(sword);
    fighter.arms[0].rotation.x = -1.0;
    fighter.arms[1].rotation.x = -1.0;

    // ---- forest ----
    const canopies = [];
    function tree(x, z, h, r) {
      const t = group(x, 0, z);
      t.add(cyl(r * 0.13, r * 0.18, h * 0.45, 6, rand() < 0.5 ? 0x24170f : 0x3a2416, 0, h * 0.22, 0));
      const top = group(0, h * 0.3, 0);
      const cols = [0x0d1612, 0x16241b, 0x213425];
      for (let k = 0; k < 3; k++) {
        const c = cone(r * (1 - k * 0.25), h * (0.42 - k * 0.06), 7, cols[(k + (rand() * 3 | 0)) % 3], 0, h * (0.2 + k * 0.2), 0);
        c.rotation.y = rand() * 3;
        top.add(c);
      }
      t.add(top);
      canopies.push({ top, seed: canopies.length + 1 });
      scene.add(t);
    }
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI * 2, r = 5.5 + rand() * 18;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (z > 2 && Math.abs(x) < 5 + (z - 2) * 0.6) continue; // keep the view open
      if (z < -9 && Math.abs(x) < 2.5 + (-z - 9) * 0.25) continue; // a gap in the trees for the moon
      tree(x, z, 5 + rand() * 4, 1.1 + rand() * 0.8);
    }
    // two big trunks framing the view
    tree(-5.4, 2.5, 9, 1.6);
    tree(5.8, 1.6, 9.5, 1.7);

    // ---- sky ----
    const moon = new THREE.Mesh(new THREE.CircleGeometry(0.9, 10), new THREE.MeshBasicMaterial({ color: 0xd6e0ec, fog: false }));
    moon.position.set(5, 10.5, -34);
    scene.add(moon);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(1.7, 12), new THREE.MeshBasicMaterial({ color: 0x4a6280, fog: false, transparent: true, opacity: 0.35 }));
    halo.position.set(5, 10.5, -34.1);
    scene.add(halo);
    const starGroups = [];
    for (let g = 0; g < 4; g++) {
      const pos = [];
      for (let i = 0; i < 45; i++) {
        const a = rand() * Math.PI * 2, e = 0.35 + rand() * 1.1;
        pos.push(Math.cos(a) * Math.cos(e) * 45, Math.sin(e) * 45, Math.sin(a) * Math.cos(e) * 45);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd6e0ec, size: 1, sizeAttenuation: false, fog: false, transparent: true }));
      scene.add(pts);
      starGroups.push(pts);
    }

    // ---- particles: embers, fireflies (additive, faded by darkening) ----
    function particles(n, color, size) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
      const p = new THREE.Points(geo, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      p.userData.base = new THREE.Color(color);
      p.frustumCulled = false;
      scene.add(p);
      return p;
    }
    const EMBERS = 36, FLIES = 7;
    const embers = particles(EMBERS, 0xf8b347, 1.5);
    const flies = particles(FLIES, 0xb7d65a, 1.5);
    const emberLife = Array.from({ length: EMBERS }, () => 1.8 + rand() * 1.8);
    const emberOff = Array.from({ length: EMBERS }, () => rand() * 10);

    // ---- smoke ----
    const PUFFS = 6, SMOKE_LIFE = 7;
    const smokeGeo = new THREE.IcosahedronGeometry(1, 0);
    const puffs = Array.from({ length: PUFFS }, () => {
      const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: 0x31445e, transparent: true, depthWrite: false }));
      scene.add(m);
      return m;
    });

    // ---- camera ----
    const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 120);
    const lookAt = new THREE.Vector3(0, 1.25, 0);

    // ---- every frame ----
    function update(t) {
      // fire
      const f = A.flicker(t);
      fireLight.intensity = 5 * f;
      fireLight.color.setRGB(1, 0.5 + 0.12 * (f - 1) * 3, 0.2);
      fireLight.position.x = 0.08 * A.noise1(t * 2, 21);
      fireLight.position.z = 0.08 * A.noise1(t * 2, 22);
      for (const fl of flames) {
        const s = fl.userData.seed;
        fl.scale.y = 0.85 + 0.35 * A.noise1(t * 4 + s * 10, s);
        fl.scale.x = fl.scale.z = 0.9 + 0.15 * A.noise1(t * 3 + s * 20, s + 40);
        fl.rotation.z = 0.18 * A.noise1(t * 2.5 + s, s + 80);
        fl.rotation.x = 0.18 * A.noise1(t * 2.5 + s, s + 90);
        fl.rotation.y = t * (0.6 + s * 0.1);
      }
      embersBed.material.color.setHex(f > 1.08 ? 0xc8561b : 0x9b3a1c);

      // embers
      const ep = embers.geometry.attributes.position, ec = embers.geometry.attributes.color, eb = embers.userData.base;
      for (let i = 0; i < EMBERS; i++) {
        const L = emberLife[i], k = t + emberOff[i];
        const e = A.ember(i * 1000 + Math.floor(k / L), k % L, L);
        ep.setXYZ(i, e.x, e.y, e.z);
        const a = e.alpha * (0.7 + 0.3 * A.noise1(t * 8 + i, 5));
        ec.setXYZ(i, eb.r * a, eb.g * a, eb.b * a);
      }
      ep.needsUpdate = ec.needsUpdate = true;

      // smoke
      for (let i = 0; i < PUFFS; i++) {
        const k = t + (i * SMOKE_LIFE) / PUFFS;
        const s = A.smoke(i * 1000 + Math.floor(k / SMOKE_LIFE), k % SMOKE_LIFE, SMOKE_LIFE);
        puffs[i].position.set(s.x, s.y, s.z);
        puffs[i].scale.setScalar(s.scale);
        puffs[i].rotation.set(k * 0.3, k * 0.2, 0);
        puffs[i].material.opacity = s.alpha;
      }

      // breathing
      [traveler, wizard, fighter].forEach((p, i) => {
        const b = A.breath(t, 3.6 + i * 0.5, i * 0.31);
        p.torso.scale.set(1 + 0.02 * b, 1 + 0.03 * b, 1 + 0.02 * b);
      });

      // traveler: looks at the others now and then, shifts on the cane
      const look = A.envelope(t, 16, 3, 5) - A.envelope(t, 16, 10, 4);
      traveler.head.rotation.y = 0.75 * look;
      const shift = A.envelope(t, 23, 13, 3);
      traveler.torso.rotation.z = -0.1 * shift;
      traveler.torso.rotation.x = traveler.lean - 0.1 * shift;

      // wizard: crystal pulses, reaches toward the fire
      const reach = A.envelope(t, 19, 6, 6);
      wizard.arms[0].rotation.x = -0.75 - 0.75 * reach;
      wizard.head.rotation.x = 0.2 * reach;
      const glow = 0.55 + 0.25 * A.breath(t, 2.4, 0) + 0.6 * reach;
      crystalLight.intensity = glow;
      crystal.scale.setScalar(0.85 + 0.3 * glow);
      crystal.rotation.y = t * 0.8;

      // fighter: nods off, jerks awake
      const d = A.doze(t, 26, 9, 9);
      fighter.head.rotation.x = 0.6 * d;
      fighter.torso.rotation.x = fighter.lean + 0.12 * d;

      // trees sway
      for (const c of canopies) {
        c.top.rotation.z = 0.025 * A.noise1(t * 0.35 + c.seed * 3.1, c.seed);
        c.top.rotation.x = 0.02 * A.noise1(t * 0.3 + c.seed * 1.7, c.seed + 500);
      }

      // stars twinkle
      starGroups.forEach((s, i) => { s.material.opacity = 0.55 + 0.45 * A.noise1(t * 1.3 + i * 9, 300 + i); });

      // fireflies: drift at the forest edge, blink
      const fp = flies.geometry.attributes.position, fc = flies.geometry.attributes.color, fb = flies.userData.base;
      for (let i = 0; i < FLIES; i++) {
        const a = i * 0.9 + 0.08 * t + A.noise1(t * 0.1, 600 + i);
        const r = 4.6 + 0.8 * A.noise1(t * 0.2, 700 + i);
        fp.setXYZ(i, Math.cos(a) * r, 0.9 + 0.5 * A.noise1(t * 0.3, 800 + i), Math.sin(a) * r - 1);
        const on = A.envelope(t, 5 + i * 1.3, i * 2.1, 2.2);
        fc.setXYZ(i, fb.r * on, fb.g * on, fb.b * on);
      }
      fp.needsUpdate = fc.needsUpdate = true;

      // camera drifts slowly
      camera.position.set(1.1 * Math.sin(t * 0.045), 1.9 + 0.12 * Math.sin(t * 0.031), 5.4);
      camera.lookAt(lookAt);
      moon.lookAt(camera.position);
      halo.lookAt(camera.position);
    }

    return { scene, camera, update };
  }

  window.CampScene = { build };
})();
