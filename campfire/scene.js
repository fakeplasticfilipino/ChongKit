// Campfire: builds the world (forest, fire, the figures from figures.js) and moves it.
// Browser global `CampScene`. Uses three.js (global THREE), anim.js (CampAnim) and figures.js (CampFigures).
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
    const flat = (r, seg, c, x, y, z) => { const m = mesh(new THREE.CircleGeometry(r, seg), c, x, y, z); m.rotation.x = -Math.PI / 2; m.castShadow = false; return m; };
    const rand = A.rng(42);
    const around = (rMin, rMax) => { const a = rand() * Math.PI * 2, r = rMin + rand() * (rMax - rMin); return [Math.cos(a) * r, Math.sin(a) * r, a]; };
    // keep props clear of the figures (and their seats) around the fire
    const SPOTS = [[-2.1, 0.35], [0, -2.25], [2.1, 0.35], [2.7, 0.05]];
    const clear = (x, z, d) => SPOTS.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > d);

    // ---- light ----
    scene.add(new THREE.HemisphereLight(0x4a6280, 0x101828, 0.42));
    const moonLight = new THREE.DirectionalLight(0x8fa6c4, 0.25);
    moonLight.position.set(10, 20, -14);
    scene.add(moonLight);
    const fireLight = new THREE.PointLight(0xff9a40, 3.2, 6.5, 2); // a small warm pool, like the reference
    fireLight.position.set(0, 0.8, 0);
    fireLight.castShadow = true;
    fireLight.shadow.mapSize.set(512, 512);
    fireLight.shadow.bias = -0.004;
    fireLight.shadow.camera.near = 0.3;
    scene.add(fireLight);

    // ---- ground: dark earth that breaks up into grass ----
    scene.add(flat(40, 24, 0x16241b, 0, 0, 0));
    scene.add(flat(3.3, 14, 0x150e0b, 0, 0.01, 0));
    for (let i = 0; i < 40; i++) {
      const [x, z] = around(2.4, 4.4);
      scene.add(flat(0.3 + rand() * 0.45, 6, [0x16241b, 0x213425, 0x24170f, 0x3a2416][i % 4], x, 0.012 + rand() * 0.008, z));
    }
    for (let i = 0; i < 12; i++) { // trodden patches by the fire
      const [x, z] = around(0.9, 2.4);
      scene.add(flat(0.2 + rand() * 0.3, 6, 0x24170f, x, 0.015, z));
    }
    for (let i = 0; i < 80; i++) { // grass tufts
      const [x, z] = around(2.6, 7.5);
      if (!clear(x, z, 0.7)) continue;
      const tuft = group(x, 0, z);
      for (let j = 0; j < 3; j++) {
        const blade = cone(0.03 + rand() * 0.03, 0.18 + rand() * 0.22, 3, rand() < 0.5 ? 0x213425 : 0x2f4a30, (rand() - 0.5) * 0.15, 0.1, (rand() - 0.5) * 0.15);
        blade.rotation.z = (rand() - 0.5) * 0.6;
        blade.castShadow = false;
        tuft.add(blade);
      }
      scene.add(tuft);
    }

    // ---- fire pit: stone ring, teepee of logs, coals ----
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const s = mesh(new THREE.DodecahedronGeometry(0.15 + rand() * 0.06), rand() < 0.6 ? 0x5e5650 : 0x3a2416, Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7);
      s.rotation.set(rand() * 3, rand() * 3, 0);
      scene.add(s);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const g = group(Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26);
      g.rotation.y = -a;
      const log = cyl(0.04, 0.055, 0.46, 5, i % 2 ? 0x24170f : 0x3a2416, 0, 0.17, 0);
      log.rotation.z = 0.75; // leans in to the middle, low so the flames show over it
      log.castShadow = false;
      g.add(log);
      scene.add(g);
    }
    for (let i = 0; i < 2; i++) {
      const l = cyl(0.07, 0.07, 0.95, 6, 0x24170f, 0, 0.08, 0);
      l.rotation.set(Math.PI / 2, 0.7 + i * 1.6, 0);
      l.castShadow = false;
      scene.add(l);
    }
    const embersBed = flat(0.45, 8, 0x9b3a1c, 0, 0.03, 0);
    embersBed.material = new THREE.MeshBasicMaterial({ color: 0x9b3a1c });
    scene.add(embersBed);
    const coals = [];
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2, r = 0.1 + rand() * 0.3;
      const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04 + rand() * 0.03), new THREE.MeshBasicMaterial({ color: 0x9b3a1c }));
      c.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r);
      scene.add(c);
      coals.push(c);
    }

    // ---- flames: a small pixel fire simulation on a sprite that always faces the camera ----
    const FW = 32, FH = 48;
    const fireCanvas = document.createElement('canvas');
    fireCanvas.width = FW; fireCanvas.height = FH;
    const fireCtx = fireCanvas.getContext('2d');
    const fireImg = fireCtx.createImageData(FW, FH);
    const fireTex = new THREE.CanvasTexture(fireCanvas);
    fireTex.magFilter = fireTex.minFilter = THREE.NearestFilter;
    fireTex.generateMipmaps = false;
    fireTex.colorSpace = THREE.SRGBColorSpace;
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, transparent: true, alphaTest: 0.5, depthWrite: false, fog: false }));
    flame.scale.set(1.0, 1.5, 1);
    flame.position.set(0, 0.72, 0);
    flame.renderOrder = 10; // after the solid things; it writes no depth, so it gets no outline
    scene.add(flame);
    const fireRGB = {};
    let fireFrame = -1;
    function drawFire(t, flare) {
      const frame = Math.floor(t * 20); // redrawn 20 times a second: flickery, like hand-drawn frames
      if (frame === fireFrame) return;
      fireFrame = frame;
      const ft = frame / 20, grow = 0.85 + 0.35 * (A.flicker(ft) - 1) / 0.26 * 0.5 + 0.4 * flare;
      const cells = [];
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) cells.push(A.fireHeat((x + 0.5) / FW - 0.5, 1 - (y + 0.5) / FH, ft, grow));
      const fireCells = cells;
      const d = fireImg.data;
      for (let i = 0; i < FW * FH; i++) {
        const c = A.fireColor(fireCells[i]);
        if (c === null) { d[i * 4 + 3] = 0; continue; }
        const rgb = fireRGB[c] || (fireRGB[c] = [(c >> 16) & 255, (c >> 8) & 255, c & 255]);
        d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = 255;
      }
      fireCtx.putImageData(fireImg, 0, 0);
      fireTex.needsUpdate = true;
    }

    // ---- seats and the figures ----
    function seatLog(x, z) {
      const l = cyl(0.17, 0.17, 1.1, 7, 0x55341d, x, 0.17, z);
      l.rotation.z = Math.PI / 2;
      l.rotation.y = Math.atan2(-x, -z);
      scene.add(l);
    }
    seatLog(-2.15, 0.35);
    seatLog(0, -2.3);
    scene.add(mesh(new THREE.DodecahedronGeometry(0.28), 0x5e5650, 2.15, 0.15, 0.35));
    const fig = CampFigures.build({ THREE, scene, mat, mesh, box, cyl, cone, group });
    const { traveler, wizard, samurai, crystal, crystalLight } = fig;

    // ---- props around the clearing ----
    function mushroom(x, z) {
      const s = rand() * 0.5 + 0.8;
      scene.add(cyl(0.015 * s, 0.02 * s, 0.08 * s, 4, 0xcfc8bb, x, 0.04 * s, z));
      scene.add(cone(0.055 * s, 0.045 * s, 6, rand() < 0.6 ? 0x9b3a1c : 0x96603a, x, 0.09 * s, z));
    }
    // fallen log with stubs and mushrooms
    const fallen = group(-3.6, 0, -2.6);
    fallen.rotation.y = 0.65;
    const trunk = cyl(0.2, 0.24, 2.4, 7, 0x3a2416, 0, 0.21, 0);
    trunk.rotation.z = Math.PI / 2;
    fallen.add(trunk);
    for (const [x, rz] of [[-0.5, 0.6], [0.6, -0.5]]) {
      const stub = cyl(0.04, 0.06, 0.35, 4, 0x3a2416, x, 0.45, 0);
      stub.rotation.z = rz;
      fallen.add(stub);
    }
    scene.add(fallen);
    for (let i = 0; i < 5; i++) mushroom(-3.6 + (rand() - 0.5) * 1.6, -2.2 + rand() * 0.3);
    for (let i = 0; i < 14; i++) { // rocks
      const [x, z] = around(3.2, 7);
      if (!clear(x, z, 0.8)) continue;
      const s = mesh(new THREE.DodecahedronGeometry(0.12 + rand() * 0.25), rand() < 0.7 ? 0x5e5650 : 0x31445e, x, 0.06, z);
      s.rotation.set(rand() * 3, rand() * 3, 0);
      s.scale.y = 0.6;
      scene.add(s);
    }
    for (let i = 0; i < 22; i++) { // ferns
      const [x, z] = around(4.4, 7.2);
      if (!clear(x, z, 1)) continue;
      const fern = group(x, 0, z);
      const col = rand() < 0.5 ? 0x213425 : 0x2f4a30;
      for (let j = 0; j < 6; j++) {
        const leaf = box(0.07, 0.015, 0.55, col, 0, 0.12, 0);
        leaf.geometry.translate(0, 0, 0.27);
        leaf.position.y = 0.05;
        leaf.rotation.set(-0.5 - rand() * 0.3, (j / 6) * Math.PI * 2 + rand() * 0.3, 0, 'YXZ');
        leaf.castShadow = false;
        fern.add(leaf);
      }
      scene.add(fern);
    }
    for (let i = 0; i < 16; i++) { // bushes
      const [x, z] = around(5.6, 7.6);
      const bush = group(x, 0, z);
      for (let j = 0; j < 3; j++) {
        const r = 0.3 + rand() * 0.3;
        bush.add(mesh(new THREE.IcosahedronGeometry(r, 0), [0x0d1612, 0x16241b, 0x213425][j], (rand() - 0.5) * 0.6, r * 0.8, (rand() - 0.5) * 0.6));
      }
      scene.add(bush);
    }

    // ---- the moon has one fixed place in the sky: up and to the right of the starting view ----
    const RADIUS = 4.7, PITCH0 = 0.12;
    const lookAt = new THREE.Vector3(0, 1.1, 0);
    const CAM0 = new THREE.Vector3(0, lookAt.y + Math.sin(PITCH0) * RADIUS, Math.cos(PITCH0) * RADIUS);
    const AZ = (12 * Math.PI) / 180, EL = (11 * Math.PI) / 180;
    const MOON_DIR = new THREE.Vector3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), -Math.cos(AZ) * Math.cos(EL));
    const MOON = CAM0.clone().addScaledVector(MOON_DIR, 100);
    // Trees in the line of sight to the moon are kept short enough to leave it in view.
    function underMoon(x, z, h, r) {
      const vx = x - CAM0.x, vz = z - CAM0.z;
      const len = Math.hypot(MOON_DIR.x, MOON_DIR.z), dx = MOON_DIR.x / len, dz = MOON_DIR.z / len;
      const along = vx * dx + vz * dz, perp = Math.abs(vx * dz - vz * dx);
      if (along <= 0 || perp - r > 1.2 + along * 0.09) return h;
      return Math.min(h, CAM0.y + along * Math.tan(EL - 0.05) - 0.4);
    }

    // ---- forest: a full ring, taller near the clearing so the sky shows above the far trees ----
    const canopies = [];
    function tree(x, z, h, r, old) {
      const t = group(x, 0, z);
      const bark = rand() < 0.5 ? 0x24170f : 0x3a2416;
      t.add(cyl(r * (old ? 0.2 : 0.13), r * (old ? 0.28 : 0.18), h * 0.5, old ? 8 : 6, bark, 0, h * 0.25, 0));
      if (old) {
        for (let k = 0; k < 5; k++) { // roots
          const a = (k / 5) * Math.PI * 2 + rand();
          const root = box(0.14, 0.12, 0.7, bark, Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3);
          root.rotation.y = -a + Math.PI / 2;
          root.rotation.x = 0.15;
          t.add(root);
        }
        t.add(box(0.08, 0.3, 0.03, 0x150e0b, 0, h * 0.18, r * 0.27)); // knot hole
      }
      const top = group(0, h * 0.3, 0);
      const cols = [0x0d1612, 0x16241b, 0x213425];
      for (let k = 0; k < 4; k++) {
        const c = cone(r * (1 - k * 0.2), h * (0.36 - k * 0.05), 7, cols[(k + (rand() * 3 | 0)) % 3], 0, h * (0.18 + k * 0.17), 0);
        c.rotation.y = rand() * 3;
        top.add(c);
      }
      t.add(top);
      canopies.push({ top, seed: canopies.length + 1 });
      scene.add(t);
    }
    for (let i = 0; i < 120; i++) {
      const [x, z] = around(7.2, 25);
      const near = Math.hypot(x, z) < 12;
      const r = 1.1 + rand() * 0.8;
      const h = underMoon(x, z, near ? 6 + rand() * 3.5 : 4.5 + rand() * 2.5, r);
      if (h > 2.4) tree(x, z, h, r);
    }
    for (let i = 0; i < 5; i++) { // big old trees around the clearing
      const a = (i / 5) * Math.PI * 2 + 0.4, r = 7.4;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = underMoon(x, z, 9 + rand() * 1.5, 1.7);
      if (h > 2.4) tree(x, z, h, 1.7, true);
    }

    // ---- sky: the moon stays up and to the right of the view ----
    const moon = new THREE.Mesh(new THREE.CircleGeometry(1.9, 12), new THREE.MeshBasicMaterial({ color: 0xd6e0ec, fog: false }));
    const halo = new THREE.Mesh(new THREE.CircleGeometry(3.6, 14), new THREE.MeshBasicMaterial({ color: 0x4a6280, fog: false, transparent: true, opacity: 0.35 }));
    moon.position.copy(MOON);
    halo.position.copy(MOON).addScaledVector(MOON_DIR, 1);
    scene.add(moon, halo);
    const starGroups = [];
    for (let g = 0; g < 4; g++) {
      const pos = [];
      for (let i = 0; i < 60; i++) {
        const a = rand() * Math.PI * 2, e = 0.15 + rand() * 1.3;
        pos.push(Math.cos(a) * Math.cos(e) * 45, Math.sin(e) * 45, Math.sin(a) * Math.cos(e) * 45);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd6e0ec, size: 1, sizeAttenuation: false, fog: false, transparent: true }));
      scene.add(pts);
      starGroups.push(pts);
    }

    // ---- particles: embers, bursts from pops, fireflies (additive, faded by darkening) ----
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
    const EMBERS = 36, BURSTS = 30, FLIES = 9;
    const embers = particles(EMBERS, 0xf8b347, 1.5);
    const sparks = particles(BURSTS, 0xffe08a, 1.5);
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
    const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 140);
    const fill = new THREE.DirectionalLight(0x8fa6c4, 0.16); // soft light from the viewer, so faces read
    scene.add(fill, fill.target);

    // ---- every frame: t = seconds; view = { yaw, pitch } from dragging ----
    function update(t, view) {
      // fire
      const f = A.flicker(t);
      fireLight.intensity = 3.2 * f;
      fireLight.color.setRGB(1, 0.62 + 0.3 * (f - 1), 0.36);
      fireLight.position.x = 0.08 * A.noise1(t * 2, 21);
      fireLight.position.z = 0.08 * A.noise1(t * 2, 22);
      drawFire(t, 0);
      embersBed.material.color.setHex(f > 1.08 ? 0xc8561b : 0x9b3a1c);
      coals.forEach((c, i) => c.material.color.setHex(A.noise1(t * 1.5 + i * 7, 200 + i) > 0.2 ? 0xc8561b : 0x6e2a1f));

      // embers, and bursts thrown up by the pops you hear
      const ep = embers.geometry.attributes.position, ec = embers.geometry.attributes.color, eb = embers.userData.base;
      for (let i = 0; i < EMBERS; i++) {
        const L = emberLife[i], k = t + emberOff[i];
        const e = A.ember(i * 1000 + Math.floor(k / L), k % L, L);
        ep.setXYZ(i, e.x, e.y, e.z);
        const a = e.alpha * (0.7 + 0.3 * A.noise1(t * 8 + i, 5));
        ec.setXYZ(i, eb.r * a, eb.g * a, eb.b * a);
      }
      ep.needsUpdate = ec.needsUpdate = true;
      const bp = sparks.geometry.attributes.position, bc = sparks.geometry.attributes.color, bb = sparks.userData.base;
      const burst = A.bursts(t);
      for (let i = 0; i < BURSTS; i++) {
        const e = burst[i];
        if (e) { bp.setXYZ(i, e.x, e.y, e.z); bc.setXYZ(i, bb.r * e.alpha, bb.g * e.alpha, bb.b * e.alpha); }
        else bc.setXYZ(i, 0, 0, 0);
      }
      bp.needsUpdate = bc.needsUpdate = true;

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
      [traveler, wizard, samurai].forEach((p, i) => {
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
      wizard.arms[0].sh.rotation.x = -0.5 - 0.6 * reach;
      wizard.arms[0].el.rotation.x = -0.7 + 0.55 * reach;
      wizard.head.rotation.x = 0.2 * reach;
      const glow = 0.55 + 0.25 * A.breath(t, 2.4, 0) + 0.6 * reach;
      crystalLight.intensity = glow;
      crystal.scale.setScalar(0.85 + 0.3 * glow);
      crystal.rotation.y = t * 0.8;

      // samurai: nods off, jerks awake
      const d = A.doze(t, 26, 9, 9);
      samurai.head.rotation.x = 0.6 * d;
      samurai.torso.rotation.x = samurai.lean + 0.12 * d;

      // trees sway with the wind
      const w = 0.4 + 1.2 * A.wind(t);
      for (const c of canopies) {
        c.top.rotation.z = 0.025 * w * A.noise1(t * 0.35 + c.seed * 3.1, c.seed);
        c.top.rotation.x = 0.02 * w * A.noise1(t * 0.3 + c.seed * 1.7, c.seed + 500);
      }

      // stars twinkle
      starGroups.forEach((s, i) => { s.material.opacity = 0.55 + 0.45 * A.noise1(t * 1.3 + i * 9, 300 + i); });

      // fireflies: drift at the forest edge, blink
      const fp = flies.geometry.attributes.position, fc = flies.geometry.attributes.color, fb = flies.userData.base;
      for (let i = 0; i < FLIES; i++) {
        const a = i * 0.7 + 0.08 * t + A.noise1(t * 0.1, 600 + i);
        const r = 4.8 + 0.8 * A.noise1(t * 0.2, 700 + i);
        fp.setXYZ(i, Math.cos(a) * r, 0.9 + 0.5 * A.noise1(t * 0.3, 800 + i), Math.sin(a) * r);
        const on = A.envelope(t, 5 + i * 1.3, i * 2.1, 2.2);
        fc.setXYZ(i, fb.r * on, fb.g * on, fb.b * on);
      }
      fp.needsUpdate = fc.needsUpdate = true;

      // camera: where you turned it, plus a slow drift
      const yaw = view.yaw + 0.18 * Math.sin(t * 0.045);
      const pitch = view.pitch + 0.02 * Math.sin(t * 0.031);
      camera.position.set(Math.sin(yaw) * Math.cos(pitch) * RADIUS, lookAt.y + Math.sin(pitch) * RADIUS, Math.cos(yaw) * Math.cos(pitch) * RADIUS);
      camera.lookAt(lookAt);
      moon.lookAt(camera.position);
      halo.lookAt(camera.position);
      fill.position.set(camera.position.x, camera.position.y + 2, camera.position.z);
    }

    return { scene, camera, update };
  }

  window.CampScene = { build };
})();
