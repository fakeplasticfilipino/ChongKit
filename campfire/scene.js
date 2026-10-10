// Campfire: builds the world (forest, fire, the figures from figures.js) and moves it.
// Browser global `CampScene`. Uses three.js (global THREE), anim.js (CampAnim) and figures.js (CampFigures).
(function () {
  'use strict';
  const A = window.CampAnim;

  // opts.season: 'winter' | 'spring' | 'summer' | 'autumn' (app.js picks it from the calendar)
  function build(THREE, opts) {
    const SEASON = (opts && opts.season) || 'autumn';
    const WINTER = SEASON === 'winter', AUTUMN = SEASON === 'autumn', SPRING = SEASON === 'spring';
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
    const SPOTS = [[-2.1, 0.35], [0, -2.25], [2.1, 0.35], [2.7, 0.05], [-3.4, -5.3], [2.6, -5.8], [3.3, -5.7], [1.55, -5.25], [-3.2, -4.6], [4.6, -5.5]]; // figures, seats, tent, horse, lantern post
    const clear = (x, z, d) => SPOTS.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > d);

    // ---- light ----
    const hemi = new THREE.HemisphereLight(0x4a6280, 0x101828, 0.42);
    scene.add(hemi);
    const NIGHT = new THREE.Color(0x05070c), LIGHTNING = new THREE.Color(0x31445e);
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
    scene.add(flat(40, 24, WINTER ? 0x31445e : 0x16241b, 0, 0, 0)); // snow lies blue at night
    scene.add(flat(3.3, 14, 0x150e0b, 0, 0.01, 0));
    for (let i = 0; i < 40; i++) {
      const [x, z] = around(2.4, 4.4);
      const patch = WINTER ? [0x4a6280, 0x31445e, 0x22304a, 0x24170f] : [0x16241b, 0x213425, 0x24170f, 0x3a2416];
      scene.add(flat(0.3 + rand() * 0.45, 6, patch[i % 4], x, 0.012 + rand() * 0.008, z));
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
        const grass = WINTER ? [0x31445e, 0x4a6280] : AUTUMN ? [0x213425, 0x55341d] : [0x213425, 0x2f4a30];
        const blade = cone(0.03 + rand() * 0.03, 0.18 + rand() * 0.22, 3, grass[rand() < 0.5 ? 0 : 1], (rand() - 0.5) * 0.15, 0.1, (rand() - 0.5) * 0.15);
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
    function drawFire(t, flare, fu) {
      const frame = Math.floor(t * 20); // redrawn 20 times a second: flickery, like hand-drawn frames
      if (frame === fireFrame) return;
      fireFrame = frame;
      const ft = frame / 20, grow = (0.4 + 0.6 * fu) * (0.85 + 0.35 * (A.flicker(ft) - 1) / 0.26 * 0.5) + 0.4 * flare;
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
    const { traveler, wizard, samurai, crystal, crystalLight, staff, hilt, blade, glint, stone, flute, pipe, pipeGlow, twig } = fig;
    const HEADS = new Map([traveler, wizard, samurai].map((p) => [p, p.root.localToWorld(new THREE.Vector3(0, 1.1, 0.1))]));
    const FIRE_AT = new THREE.Vector3(0, 0.4, 0);

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
    if (AUTUMN) for (let i = 0; i < 110; i++) { // fallen leaves on the ground
      const [x, z] = around(1.0, 7.5);
      const l = box(0.09, 0.01, 0.065, [0x9b3a1c, 0x744726, 0xc8561b, 0x55341d][i % 4], x, 0.02, z);
      l.rotation.y = rand() * 3;
      l.castShadow = false;
      scene.add(l);
    }
    if (SPRING) for (let i = 0; i < 70; i++) { // flowers in the grass
      const [x, z] = around(2.8, 7);
      if (!clear(x, z, 0.7)) continue;
      scene.add(box(0.045, 0.045, 0.045, [0xe8e2d4, 0xf8b347, 0x5e3a56][i % 3], x, 0.06 + rand() * 0.08, z));
    }
    for (let i = 0; i < 16; i++) { // bushes
      const [x, z] = around(5.6, 7.6);
      if (!clear(x, z, 1.3)) continue;
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
      const turned = AUTUMN && rand() < 0.35; // some trees turn red and gold in autumn
      const cols = turned ? [0x6e2a1f, 0x9b3a1c, 0x744726] : [0x0d1612, 0x16241b, 0x213425];
      for (let k = 0; k < 4; k++) {
        const ch = h * (0.36 - k * 0.05), cy = h * (0.18 + k * 0.17);
        const c = cone(r * (1 - k * 0.2), ch, 7, cols[(k + (rand() * 3 | 0)) % 3], 0, cy, 0);
        c.rotation.y = rand() * 3;
        top.add(c);
        if (WINTER) { // snow on each tier
          const cap = cone(r * (1 - k * 0.2) * 0.55, ch * 0.45, 7, 0x8fa6c4, 0, cy + ch * 0.29, 0);
          cap.rotation.y = c.rotation.y;
          top.add(cap);
        }
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
    const EMBERS = 36, BURSTS = 80, FLIES = { summer: 14, spring: 6 }[SEASON] || 0; // no fireflies in the cold
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

    // ---- night ambience: mist, clouds over the moon, a shooting star, eyes in the dark ----
    const blobCanvas = document.createElement('canvas');
    blobCanvas.width = blobCanvas.height = 64;
    const bc2 = blobCanvas.getContext('2d');
    const grad = bc2.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    bc2.fillStyle = grad;
    bc2.fillRect(0, 0, 64, 64);
    const blob = new THREE.CanvasTexture(blobCanvas);
    const mist = Array.from({ length: 18 }, () => {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: blob, color: 0x31445e, transparent: true, opacity: 0.16, depthWrite: false }));
      m.userData = { a: rand() * Math.PI * 2, r: 4.6 + rand() * 8, y: 0.35 + rand() * 0.5, v: (rand() - 0.5) * 0.012 };
      m.scale.set(4 + rand() * 4, 1.1 + rand() * 0.8, 1);
      scene.add(m);
      return m;
    });
    const clouds = Array.from({ length: 6 }, (_, i) => {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: blob, color: 0x101828, transparent: true, depthWrite: false, fog: false }));
      m.userData = { o: i / 6 * 1.2, v: 0.004 + rand() * 0.004, el: EL - 0.05 + rand() * 0.11, w: 0.1 + rand() * 0.08 };
      m.scale.set(m.userData.w * 2 * 95, 4 + rand() * 3, 1);
      m.renderOrder = 5;
      scene.add(m);
      return m;
    });
    const starLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xfff6d6, fog: false, transparent: true }));
    starLine.frustumCulled = false;
    starLine.visible = false;
    scene.add(starLine);
    const eyes = particles(2, 0xf8b347, 1.5);
    const eyesAt = new THREE.Vector3();
    let eyesSeen = -1;
    const skyPoint = (az, el, out) => out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(95).add(CAM0);

    // ---- showers: rain streaks and splashes (in winter it snows harder instead) ----
    const DROPS = 500, SPLASHES = 140;
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(DROPS * 6), 3));
    const rainLines = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8fa6c4, transparent: true, opacity: 0.55 }));
    rainLines.frustumCulled = false;
    scene.add(rainLines);
    const splashGeo = new THREE.BufferGeometry();
    splashGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SPLASHES * 3), 3));
    const splashes = new THREE.Points(splashGeo, new THREE.PointsMaterial({ color: 0x8fa6c4, size: 1, sizeAttenuation: false, transparent: true }));
    splashes.frustumCulled = false;
    scene.add(splashes);
    const dropRand = A.rng(99);
    const drops = Array.from({ length: DROPS }, () => [(dropRand() - 0.5) * 18, (dropRand() - 0.5) * 18, 7 + dropRand() * 3, dropRand() * 9.5]);

    // ---- the camp: tripod and stew, tent, horse, lantern (camp.js) ----
    const camp = CampProps.build({ THREE, scene, mat, mesh, box, cyl, cone, group, flat, rand, particles, blob });
    const visitors = CampVisitors.build({ THREE, scene, box, cyl, cone, group });
    const extras = CampExtras.build({ THREE, scene, particles });
    const NAMES = new Map([[traveler, 'traveler'], [wizard, 'wizard'], [samurai, 'samurai']]);
    const fluteTip = new THREE.Vector3();
    const NOWHERE = new THREE.Vector3(0, 0.4, 20);

    // ---- the season's weather: falling leaves in autumn; snow and steaming breath in winter ----
    const LEAVES = AUTUMN ? 30 : 0, FLAKES = WINTER ? 650 : 0;
    const leafGeo = new THREE.PlaneGeometry(0.09, 0.065);
    const leaves = Array.from({ length: LEAVES }, (_, i) => {
      const m = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ color: [0x9b3a1c, 0xc8561b, 0x744726, 0xe8812c][i % 4], side: THREE.DoubleSide, flatShading: true, roughness: 1 }));
      scene.add(m);
      return m;
    });
    const leafLife = Array.from({ length: LEAVES }, () => 9 + rand() * 6), leafOff = Array.from({ length: LEAVES }, () => rand() * 15);
    let snow = null;
    if (FLAKES) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(FLAKES * 3), 3));
      snow = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd6e0ec, size: 1, sizeAttenuation: false }));
      snow.frustumCulled = false;
      scene.add(snow);
    }
    const breaths = WINTER ? [traveler, wizard, samurai].map(() => {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: blob, color: 0x9a948c, transparent: true, depthWrite: false }));
      scene.add(m);
      return m;
    }) : [];

    // ---- the wizard's smoke rings: two puffs of three rings ----
    const ringGeo = new THREE.TorusGeometry(0.055, 0.016, 4, 8);
    const rings = Array.from({ length: 6 }, () => {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x9a948c, transparent: true, depthWrite: false }));
      m.visible = false;
      scene.add(m);
      return m;
    });
    const tmp = new THREE.Vector3(), twigFrom = new THREE.Vector3(), mouth = new THREE.Vector3();
    let twigHeld = false;

    // Where a figure's head should turn: a weighted mix of targets; weights below 1 ease in from looking ahead.
    function lookAtMix(p, list) {
      let sw = 0, yaw = 0;
      for (const [w, target] of list) {
        if (w <= 0) continue;
        tmp.copy(target);
        p.root.worldToLocal(tmp);
        sw += w;
        yaw += w * Math.atan2(tmp.x, tmp.z);
      }
      return sw ? Math.max(-1.2, Math.min(1.2, yaw / Math.max(1, sw))) : 0;
    }

    // ---- camera ----
    const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 140);
    const fill = new THREE.DirectionalLight(0x8fa6c4, 0.16); // soft light from the viewer, so faces read
    scene.add(fill, fill.target);

    // ---- every frame: t = seconds; view = { yaw, pitch } from dragging ----
    function update(t, view) {
      // fire
      const f = A.flicker(t);
      const fl = A.flare(t); // a twig landed, the logs settled, or the wizard stoked it
      const rain = A.rainAt(t), wet = WINTER ? 0 : rain; // a shower (snow in winter)
      const fu = A.fuel(t) * (1 - 0.3 * wet); // burns down over the evening; the rain damps it
      fireLight.intensity = 3.2 * f * (0.35 + 0.65 * fu) + 2.4 * fl;
      fireLight.distance = 6.5 * (0.65 + 0.35 * fu);
      fireLight.color.setRGB(1, 0.62 + 0.3 * (f - 1), 0.36);
      fireLight.position.x = 0.08 * A.noise1(t * 2, 21);
      fireLight.position.z = 0.08 * A.noise1(t * 2, 22);
      drawFire(t, fl, fu);
      embersBed.material.color.setHex(f > 1.08 ? 0xc8561b : 0x9b3a1c);
      coals.forEach((c, i) => c.material.color.setHex(A.noise1(t * 1.5 + i * 7, 200 + i) > 0.2 ? 0xc8561b : 0x6e2a1f));

      // embers, and bursts thrown up by the pops you hear
      const ep = embers.geometry.attributes.position, ec = embers.geometry.attributes.color, eb = embers.userData.base;
      for (let i = 0; i < EMBERS; i++) {
        const L = emberLife[i], k = t + emberOff[i];
        const e = A.ember(i * 1000 + Math.floor(k / L), k % L, L);
        ep.setXYZ(i, e.x, e.y, e.z);
        const a = e.alpha * (0.7 + 0.3 * A.noise1(t * 8 + i, 5)) * (i < EMBERS * (0.3 + 0.7 * fu) ? 1 : 0);
        ec.setXYZ(i, eb.r * a, eb.g * a, eb.b * a);
      }
      ep.needsUpdate = ec.needsUpdate = true;
      const bp = sparks.geometry.attributes.position, bc = sparks.geometry.attributes.color, bb = sparks.userData.base;
      const burst = A.bursts(t).concat(A.showers(t));
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
        puffs[i].material.opacity = s.alpha * (1 + 1.5 * wet); // the rain makes it smoke
      }

      // breathing
      [traveler, wizard, samurai].forEach((p, i) => {
        const b = A.breath(t, 3.6 + i * 0.5, i * 0.31);
        p.torso.scale.set(1 + 0.02 * b, 1 + 0.03 * b, 1 + 0.02 * b);
      });

      const tw = A.story('twig', t), pp = A.story('pipe', t), kt = A.story('katana', t);
      const vis = visitors.update(t); // the fox, the deer, the owl
      const fl3 = A.story('flute', t), wt = A.story('whet', t);
      const ta = A.talkAt(t); // two of them talking
      const talkW = ta ? A.win(ta.local, 0.2, A.TALK.dur - 0.3, 0.4) : 0;
      const recentSyl = ta ? A.events(t - 0.16, t).filter((e) => e.type === 'syl') : [];
      const laughE = A.events(t - 1.3, t).find((e) => e.type === 'laugh');
      const laugh = laughE ? Math.sin(Math.PI * (t - laughE.time) / 1.3) : 0;
      // who looks at whom while talking / playing
      const social = (p) => {
        const me = NAMES.get(p), list = [];
        if (ta) {
          if (me === ta.speaker) list.push([talkW, HEADS.get(ta.listener === 'traveler' ? traveler : ta.listener === 'wizard' ? wizard : samurai)]);
          else if (me === ta.listener) list.push([talkW, HEADS.get(ta.speaker === 'traveler' ? traveler : ta.speaker === 'wizard' ? wizard : samurai)]);
          else list.push([talkW * 0.6, HEADS.get(ta.speaker === 'traveler' ? traveler : ta.speaker === 'wizard' ? wizard : samurai)]);
        }
        if (me !== 'traveler') list.push([A.win(fl3, 1, 13, 1), HEADS.get(traveler)]);
        return list;
      };
      const chat = (p) => { // a little head bob on each syllable; a nod on each reply; a laugh shakes everyone
        const me = NAMES.get(p);
        let bob = 0;
        for (const e of recentSyl) if (e.who === me) bob = e.reply ? 0.14 : -0.06;
        p.torso.position.y = p.torso.userData.y0 + 0.02 * laugh * Math.abs(Math.sin(t * 22));
        return bob - 0.12 * laugh;
      };
      for (const p of [traveler, wizard, samurai]) if (p.torso.userData.y0 === undefined) p.torso.userData.y0 = p.torso.position.y;
      const dz = kt < 0 ? A.dozeAt(t) : 0;
      const stoke = A.stokes(t - A.STOKE_DUR, t + A.STOKE_LEAD)[0];
      const sk = stoke === undefined ? -1 : t - (stoke - A.STOKE_LEAD); // seconds into the wizard's stoke
      const watchFire = A.win(sk, 1.2, 4.5, 0.4);
      const snapAgo = A.since('doze', A.SNAP, t);

      // traveler: shifts on the cane; now and then tosses a twig on the fire
      const shift = A.win(A.story('shift', t), 0, 3, 0.75);
      const lean = A.win(tw, 0.3, 3.4, 0.5);
      traveler.torso.rotation.z = -0.1 * shift;
      traveler.torso.rotation.x = traveler.lean - 0.1 * shift + 0.22 * lean + 0.15 * wet; // hunches in the rain
      const [tsx, tsz, tel] = A.keyframes(tw < 0 ? -1 : tw, [[0.6, -0.5, 0.05, -0.7], [1.2, 0.45, 0.25, -0.35], [1.55, -1.5, 0.1, -0.15], [2.3, -1.1, 0.05, -0.4], [3.4, -0.5, 0.05, -0.7]]);
      traveler.arms[0].sh.rotation.set(tsx, 0, tsz);
      traveler.arms[0].el.rotation.x = tel;
      const play = A.win(fl3, 0, A.STORIES.flute.dur, 1.2); // the flute: both hands up to the lips
      if (play > 0) {
        const [l, r] = traveler.arms;
        l.sh.rotation.set(tsx + (-1.3 - tsx) * play, 0, tsz + (0.6 - tsz) * play);
        l.el.rotation.x = tel + (-1.2 - tel) * play;
        r.sh.rotation.set(-0.75 + (-1.25 + 0.75) * play, 0, -0.05 + (-0.15 + 0.05) * play);
        r.el.rotation.x = -0.6 + (-1.0 + 0.6) * play;
      } else {
        traveler.arms[1].sh.rotation.set(-0.75, 0, -0.05);
        traveler.arms[1].el.rotation.x = -0.6;
      }
      flute.visible = fl3 >= 0.9 && fl3 < 13.2;
      if (flute.visible) traveler.head.localToWorld(fluteTip.set(0.35, 0.07, 0.16));
      traveler.torso.rotation.z += 0.05 * play * Math.sin(t * 1.6); // sways to the tune
      if (tw >= 0.8 && tw < 1.55) { // in hand
        traveler.arms[0].el.localToWorld(twigFrom.set(0, -0.3, 0));
        twig.position.copy(twigFrom);
        twig.rotation.set(0, traveler.root.rotation.y, 1.2);
        twig.visible = twigHeld = true;
      } else if (tw >= 1.55 && tw < A.TWIG_LAND) { // flying
        if (!twigHeld) traveler.arms[0].el.localToWorld(twigFrom.set(0, -0.3, 0));
        const u = (tw - 1.55) / (A.TWIG_LAND - 1.55);
        twig.position.lerpVectors(twigFrom, FIRE_AT, u);
        twig.position.y += 0.7 * 4 * u * (1 - u);
        twig.rotation.z = 1.2 + u * 7;
        twig.visible = true;
      } else { twig.visible = twigHeld = false; }
      traveler.head.rotation.y = lookAtMix(traveler, [
        [A.win(kt, 1.5, 9.5, 0.6), HEADS.get(samurai)],
        [A.win(pp, 3.8, 8.6, 0.5), HEADS.get(wizard)],
        [A.win(tw, 0.9, 3.4, 0.3), FIRE_AT],
        [A.win(snapAgo, 0.15, 2.6, 0.3), HEADS.get(samurai)],
        [A.win(sk, 0.2, 1.5, 0.3), HEADS.get(wizard)],
        [watchFire, FIRE_AT],
        [vis.foxLook, vis.fox || NOWHERE],
        ...social(traveler),
      ]) + 0.12 * A.noise1(t * 0.2, 61) * (1 - talkW);
      traveler.head.rotation.x = chat(traveler) - 0.1 * play;

      // wizard: crystal pulses; warms a hand at the fire; smokes a pipe and blows rings
      const reach = A.win(A.story('reach', t), 0, 6, 1.5);
      const sl = A.story('stir', t), stir = A.win(sl, 0.3, 5.7, 0.6); // a flick of the hand, and the ladle stirs itself
      const [wsx, wsz, wel] = A.keyframes(pp < 0 ? -1 : pp, [[0, -0.5, 0.05, -0.7], [1.2, -1.3, 0.6, -1.2], [9.6, -1.3, 0.6, -1.2], [10.8, -0.5, 0.05, -0.7]]);
      wizard.arms[0].sh.rotation.set(wsx - 0.6 * reach - 0.75 * stir, 0, wsz + 0.18 * stir * Math.sin(sl * 6));
      wizard.arms[0].el.rotation.x = wel + 0.55 * reach + 0.6 * stir;
      const hold = A.smooth((wet - 0.2) / 0.3); // holds on to the hat in the rain
      if (hold > 0) {
        const a0 = wizard.arms[0];
        a0.sh.rotation.set(a0.sh.rotation.x + (-0.4 - a0.sh.rotation.x) * hold, 0, a0.sh.rotation.z + (-2.3 - a0.sh.rotation.z) * hold);
        a0.el.rotation.x += (-1.5 - a0.el.rotation.x) * hold;
      }
      camp.update(t, { stir, sl, wind: A.wind(t), fuel: fu });
      extras.update(t, { fuel: fu, pot: camp.POT, fluteTip: flute.visible ? fluteTip : null });
      pipe.visible = pp >= 1.0 && pp < 10.0;
      const inhale = Math.max(A.win(pp, 2.0, 3.8, 0.4), A.win(pp, 5.6, 7.3, 0.4));
      pipeGlow.material.color.setHex(inhale > 0.5 ? 0xffe08a : inhale > 0.1 ? 0xe8812c : 0x9b3a1c);
      wizard.head.rotation.x = 0.2 * reach - 0.1 * inhale + chat(wizard);
      if (ta && ta.speaker === 'wizard') wizard.arms[0].sh.rotation.x -= 0.3 * talkW * (0.6 + 0.4 * Math.sin(t * 2.3)); // talks with a hand
      // the stoke: the staff rises, the crystal flares, the fire roars back
      const raise = A.win(sk, 0, A.STOKE_LEAD + A.STOKE_DUR - 1, 0.7);
      staff.position.y = 0.25 * raise;
      staff.rotation.x = 0.25 * raise;
      wizard.arms[1].sh.rotation.x = -1.0 - 0.5 * raise;
      wizard.head.rotation.y = lookAtMix(wizard, [
        [raise, FIRE_AT],
        [stir, camp.POT],
        ...social(wizard),
        [A.win(kt, 2.5, 8.5, 0.6), HEADS.get(samurai)],
        [A.win(tw, 0.6, 2.0, 0.3), HEADS.get(traveler)],
        [A.win(tw, 2.0, 3.6, 0.3), FIRE_AT],
      ]);
      wizard.head.localToWorld(mouth.set(0, 0.07, 0.25)); // the mouth, for the rings
      rings.forEach((r, i) => {
        const puff = i < 3 ? 0 : 1;
        const a2 = A.since('pipe', A.PUFFS[puff] + (i % 3) * 0.35, t);
        r.visible = a2 < 3.5;
        if (!r.visible) return;
        r.position.set(mouth.x + 0.1 * a2, mouth.y + 0.3 * a2, mouth.z + 0.05 * a2);
        r.scale.setScalar(1 + 0.9 * a2);
        r.material.opacity = 0.6 * (1 - a2 / 3.5);
        r.lookAt(camera.position);
      });
      const glow = 0.55 + 0.25 * A.breath(t, 2.4, 0) + 0.6 * reach + 4 * A.win(sk, 1.1, 2.6, 0.25);
      crystalLight.intensity = glow;
      crystal.scale.setScalar(0.85 + 0.3 * glow);
      crystal.rotation.y = t * 0.8;

      // samurai: nods off and jerks awake; draws the katana and looks it over
      const [ksx, ksz, kel, kdown] = kt >= 0 || wt < 0
        ? A.keyframes(kt < 0 ? -1 : kt, [[0, -0.35, 0.08, -0.85, 0], [1.4, -0.95, 0.32, -0.5, 0.35], [9.8, -0.95, 0.32, -0.5, 0.35], [11.4, -0.35, 0.08, -0.85, 0]])
        : A.keyframes(wt, [[0, -0.35, 0.08, -0.85, 0], [0.9, -0.95, 0.32, -0.5, 0.4], [7, -0.95, 0.32, -0.5, 0.4], [8, -0.35, 0.08, -0.85, 0]]);
      // the whetstone: a stroke along the blade on each rasp
      let stroke = 0;
      for (const at of A.RASPS) if (wt >= at && wt < at + 0.9) stroke = wt - at < 0.35 ? (wt - at) / 0.35 : 1 - (wt - at - 0.35) / 0.55;
      samurai.arms.forEach(({ sh, el }, i) => {
        sh.rotation.set(ksx, 0, (i ? -1 : 1) * ksz);
        el.rotation.x = kel;
      });
      const out = (kt >= A.DRAW && kt < A.SHEATHE) || (wt >= 0.9 && wt < 7.2);
      stone.visible = wt >= 1.2 && wt < 6.8;
      stone.position.x = -0.1 + 0.5 * stroke;
      samurai.arms[1].sh.rotation.z += -0.3 * stroke * (stone.visible ? 1 : 0);
      blade.visible = out;
      hilt.visible = !out;
      const sweep = Math.max(A.win(kt, 3, 5, 0.01) ? (kt - 3) / 2 : 0, A.win(kt, 6.5, 8, 0.01) ? (kt - 6.5) / 1.5 : 0);
      glint.visible = out && sweep > 0;
      glint.position.set(-0.15 + 0.6 * sweep, 0, 0.008);
      samurai.head.rotation.x = 0.6 * dz + kdown + chat(samurai);
      samurai.torso.rotation.x = samurai.lean + 0.12 * dz;
      samurai.head.rotation.y = (1 - dz) * lookAtMix(samurai, [
        [watchFire, FIRE_AT],
        [vis.deerLook, vis.deer || NOWHERE],
        [vis.foxLook * 0.6, vis.fox || NOWHERE],
        ...social(samurai),
        [A.win(tw, 0.6, 2.2, 0.3), HEADS.get(traveler)],
        [A.win(pp, 4.0, 6.0, 0.4), HEADS.get(wizard)],
      ]);

      // mist drifts between the trees
      for (const m of mist) {
        const u = m.userData, a = u.a + u.v * t;
        m.position.set(Math.cos(a) * u.r, u.y + 0.1 * A.noise1(t * 0.05 + u.r, 70), Math.sin(a) * u.r);
      }
      // clouds cross the moon; the moonlight dims as they pass
      let cover = 0;
      for (const c of clouds) {
        const u = c.userData, off = ((u.o + u.v * t) % 1.2) - 0.6;
        skyPoint(AZ + off, u.el, c.position);
        c.material.opacity = 0.85 * A.smooth((0.6 - Math.abs(off)) / 0.15);
        cover = Math.max(cover, (1 - A.smooth(Math.hypot(off, u.el - EL) / u.w)) * c.material.opacity);
      }
      cover = Math.max(cover, rain); // rain clouds hide the moon
      moonLight.intensity = 0.25 * (1 - 0.7 * cover);
      moon.visible = rain < 0.6;
      halo.material.opacity = 0.35 * (1 - 0.8 * cover);
      // a shooting star, and eyes glinting in the forest
      const recent = A.events(t - 6, t);
      const star = recent.filter((e) => e.type === 'star').pop();
      const sAge = star ? t - star.time : 9;
      starLine.visible = sAge < 1.1;
      if (starLine.visible) {
        const r = A.rng(Math.floor(star.time * 10));
        const dir = r() < 0.5 ? -1 : 1, az0 = AZ - dir * (0.12 + r() * 0.06), el0 = EL + 0.03 + r() * 0.04; // through the gap by the moon
        const p = starLine.geometry.attributes.position, head = Math.min(1, sAge / 0.8), tail = Math.max(0, head - 0.35);
        skyPoint(az0 + dir * 0.24 * head, el0 - 0.06 * head, tmp); p.setXYZ(0, tmp.x, tmp.y, tmp.z);
        skyPoint(az0 + dir * 0.24 * tail, el0 - 0.06 * tail, tmp); p.setXYZ(1, tmp.x, tmp.y, tmp.z);
        p.needsUpdate = true;
        starLine.material.opacity = 1 - A.smooth((sAge - 0.8) / 0.3);
      }
      const glintE = recent.filter((e) => e.type === 'eyes').pop();
      const eAge = glintE ? t - glintE.time : 99;
      if (glintE && eyesSeen !== glintE.time) { // place them across the fire from wherever you're looking
        eyesSeen = glintE.time;
        const r = A.rng(Math.floor(glintE.time * 10));
        const yaw = view.yaw + Math.PI + (r() - 0.5) * 1.0;
        eyesAt.set(Math.sin(yaw) * 8.5, 0.75, Math.cos(yaw) * 8.5);
      }
      const on = eAge < 6 && ((eAge > 0.5 && eAge < 2) || (eAge > 2.15 && eAge < 4.2) || (eAge > 4.35 && eAge < 5.3)) ? 0.9 : 0;
      const ep2 = eyes.geometry.attributes.position, ec2 = eyes.geometry.attributes.color, eb2 = eyes.userData.base;
      tmp.set(Math.cos(Math.atan2(eyesAt.z, eyesAt.x) + Math.PI / 2), 0, Math.sin(Math.atan2(eyesAt.z, eyesAt.x) + Math.PI / 2)).multiplyScalar(0.07);
      ep2.setXYZ(0, eyesAt.x + tmp.x, eyesAt.y, eyesAt.z + tmp.z);
      ep2.setXYZ(1, eyesAt.x - tmp.x, eyesAt.y, eyesAt.z - tmp.z);
      for (let i = 0; i < 2; i++) ec2.setXYZ(i, eb2.r * on, eb2.g * on, eb2.b * on);
      ep2.needsUpdate = ec2.needsUpdate = true;
      if (eAge < 6) samurai.head.rotation.y = lookAtMix(samurai, [[A.win(eAge, 1, 5, 0.4), eyesAt]]) || samurai.head.rotation.y;

      // the season's weather
      const wx = 0.6 * (A.wind(t) - 0.3); // the wind pushes leaves and snow sideways
      leaves.forEach((m, i) => {
        const L = leafLife[i], k = t + leafOff[i];
        const p = A.leaf(i * 1000 + Math.floor(k / L), k % L, L);
        m.position.set(p.x + wx * (k % L) * 0.3, p.y, p.z);
        m.rotation.set(p.spin, p.spin * 0.7, p.spin * 0.4);
        m.visible = p.alpha > 0;
      });
      if (snow) {
        const sp = snow.geometry.attributes.position;
        for (let i = 0; i < FLAKES; i++) {
          const p = A.snowflake(i, t);
          sp.setXYZ(i, p.x + wx * (8 - p.y) * 0.4, p.y, p.z);
        }
        sp.needsUpdate = true;
        snow.geometry.setDrawRange(0, Math.floor(FLAKES * (0.55 + 0.45 * rain))); // a snow squall instead of rain
      }
      breaths.forEach((m, i) => { // breath steams out on each exhale
        const p = [traveler, wizard, samurai][i];
        const c = ((t / (3.6 + i * 0.5) + i * 0.31) % 1 + 1) % 1, u = c < 0.5 ? -1 : (c - 0.5) * 2;
        m.visible = u >= 0;
        if (!m.visible) return;
        p.head.localToWorld(mouth.set(0, 0.07 + 0.1 * u, 0.2 + 0.3 * u));
        m.position.copy(mouth);
        m.scale.setScalar(0.12 + 0.3 * u);
        m.material.opacity = 0.35 * Math.sin(Math.PI * u);
      });

      // trees sway with the wind
      const w = 0.4 + 1.2 * A.wind(t);
      for (const c of canopies) {
        c.top.rotation.z = 0.025 * w * A.noise1(t * 0.35 + c.seed * 3.1, c.seed);
        c.top.rotation.x = 0.02 * w * A.noise1(t * 0.3 + c.seed * 1.7, c.seed + 500);
      }

      // stars twinkle
      starGroups.forEach((s, i) => { s.material.opacity = (0.55 + 0.45 * A.noise1(t * 1.3 + i * 9, 300 + i)) * (1 - rain); });

      // the shower: streaks fall slanting with the wind, splashes flicker on the ground; lightning far off
      const rp = rainGeo.attributes.position, n = Math.floor(DROPS * wet);
      for (let i = 0; i < DROPS; i++) {
        const [x, z, top, ph] = drops[i];
        if (i >= n) { rp.setXYZ(i * 2, 0, -50, 0); rp.setXYZ(i * 2 + 1, 0, -50, 0); continue; }
        const y = top - ((t * 9 + ph) % (top + 0.5));
        rp.setXYZ(i * 2, x + wx * 0.4 * (top - y), y, z);
        rp.setXYZ(i * 2 + 1, x + wx * 0.4 * (top - y) - wx * 0.12, y + 0.35, z);
      }
      rp.needsUpdate = true;
      const spp = splashGeo.attributes.position;
      for (let i = 0; i < SPLASHES; i++) {
        const show = i < SPLASHES * wet && dropRand() < 0.5;
        spp.setXYZ(i, show ? (dropRand() - 0.5) * 12 : 0, show ? 0.03 : -50, show ? (dropRand() - 0.5) * 12 : 0);
      }
      spp.needsUpdate = true;
      const fl2 = WINTER ? 0 : A.flash(t);
      hemi.intensity = 0.42 * (1 - 0.3 * wet) + 2.2 * fl2;
      scene.background.copy(NIGHT).lerp(LIGHTNING, fl2);

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

    // ---- clicking: who (or what) is under the pointer, and what they do ----
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const fireHit = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 4)); // an unseen target around the fire and pot
    fireHit.position.set(0, 0.6, 0);
    fireHit.updateMatrixWorld();
    const PICKS = [[traveler.root, 'traveler'], [wizard.root, 'wizard'], [samurai.root, 'samurai'], [fireHit, 'fire']];
    function pick(x, y) { // x, y: -1 … 1 across the canvas
      ray.setFromCamera(ndc.set(x, y), camera);
      const hit = ray.intersectObjects(PICKS.map((p) => p[0]), true)[0];
      for (let o = hit && hit.object; o; o = o.parent) {
        const p = PICKS.find((q) => q[0] === o);
        if (p) return p[1];
      }
      return null;
    }
    let wizardTurn = 0, travelerTurn = 0, samuraiTurn = 0;
    // Start their story now (unless they're busy): the traveler tosses a twig, the wizard smokes or stirs,
    // the samurai draws the katana, the fire gets stoked.
    function act(who, t) {
      const busy = (names) => names.some((n) => A.story(n, t) >= 0);
      const wizardBusy = busy(['reach', 'pipe', 'stir']) || A.stokes(t - A.STOKE_DUR, t + A.STOKE_LEAD).length > 0;
      if (who === 'traveler' && !busy(['twig', 'flute'])) A.trigger(travelerTurn++ % 2 ? 'flute' : 'twig', t);
      else if (who === 'wizard' && !wizardBusy) A.trigger(wizardTurn++ % 2 ? 'stir' : 'pipe', t);
      else if (who === 'samurai' && !busy(['katana', 'whet'])) A.trigger(samuraiTurn++ % 2 ? 'whet' : 'katana', t);
      else if (who === 'fire' && !wizardBusy) A.trigger('stoke', t);
      else return false;
      return true;
    }

    return { scene, camera, update, pick, act };
  }

  window.CampScene = { build };
})();
