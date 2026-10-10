// Campfire: the three seated figures (traveler, wizard, samurai), built from boxes, cones and cylinders.
// Pixel-art proportions: big heads with eyes, elbows so the poses read. Browser global `CampFigures`.
// `kit` holds scene.js's helpers.
(function () {
  'use strict';

  const SKIN = 0xa8704a, DARK = 0x150e0b, CLOTH_DARK = 0x24170f, WHITE = 0xe8e2d4, BONE = 0xcfc8bb;
  const RED = 0xb03a28, GOLD = 0xc09040, BROWN = 0x55341d, BROWN_DK = 0x3a2416;

  function build(kit) {
    const { THREE, scene, mesh, box, cyl, cone, group } = kit;
    const tilt = (m, x, y, z) => { m.rotation.set(x || 0, y || 0, z || 0); return m; };

    // A leg: hip → thigh (along +z) → knee → shin (down) → foot. Seated, the thigh runs forward lifted by
    // kneeUp and the knee turns back so the shin stands straight; standing, the hip turns the thigh down.
    function leg(root, s, o) {
      const sp = o.spread || 0.11, L = o.thigh || 0.42, a = o.kneeUp || 0, w = o.legW || 0.15;
      const shin = o.hip + Math.sin(a) * L - 0.06;
      const hip = group(s * sp, o.hip, 0);
      hip.add(box(w, w, L, o.legs, 0, 0, L / 2));
      const knee = group(0, 0, L);
      knee.add(box(w * (o.flare || 0.95), shin, w * 0.95, o.legs, 0, -shin / 2, -0.03));
      if (o.foot) o.foot(knee, -(shin + 0.06)); // the ground, from the knee
      hip.add(knee);
      root.add(hip);
      hip.rotation.x = -a;
      knee.rotation.x = a;
      return { hip, knee, sitHip: -a, sitKnee: a, standY: L + shin + 0.06 };
    }

    // A head: face, nose, eyes, ears. Hair and hats are added per character.
    function head(parent, skin) {
      const h = group(0, 0.62, 0.02);
      h.add(box(0.28, 0.3, 0.27, skin, 0, 0.15, 0));
      h.add(box(0.05, 0.06, 0.05, skin, 0, 0.12, 0.155)); // nose
      h.add(box(0.08, 0.02, 0.02, 0x55341d, 0, 0.065, 0.137)); // mouth
      for (const s of [-1, 1]) {
        h.add(box(0.045, 0.04, 0.02, DARK, s * 0.07, 0.165, 0.137)); // eye
        h.add(box(0.04, 0.07, 0.06, skin, s * 0.15, 0.14, 0)); // ear
      }
      parent.add(h);
      return h;
    }

    // An arm: shoulder → upper arm → elbow → forearm → hand. Turn `sh` and `el` to pose it.
    function arm(torso, s, o) {
      const sh = group(s * 0.25, 0.52, 0);
      const up = 0.26, lo = 0.25;
      sh.add(o.bell ? cyl(0.065, 0.08, up, 6, o.sleeve, 0, -up / 2, 0) : box(0.12, up, 0.13, o.sleeve, 0, -up / 2, 0));
      const el = group(0, -up, 0);
      el.add(o.bell ? cyl(0.08, 0.15, lo, 7, o.sleeve, 0, -lo / 2, 0) : box(0.11, lo, 0.12, o.sleeve, 0, -lo / 2, 0));
      if (o.cuff) el.add(box(0.115, 0.04, 0.125, o.cuff, 0, -lo + 0.01, 0));
      el.add(box(0.1, 0.1, 0.1, o.skin, 0, -lo - 0.05, 0)); // hand
      sh.add(el);
      torso.add(sh);
      return { sh, el };
    }

    // A seated person facing the fire (front is +z). Returns the parts that move.
    function person(o) {
      const root = group(o.x, 0, o.z);
      root.rotation.y = Math.atan2(-o.x, -o.z) + (o.turn || 0); // turn: three-quarters toward the viewer
      const legs = [-1, 1].map((s) => leg(root, s, o));
      const torso = group(0, o.hip, 0);
      torso.rotation.x = o.lean;
      root.add(torso);
      torso.add(box(0.1, 0.08, 0.1, o.skin, 0, 0.6, 0.01)); // neck
      const hd = head(torso, o.skin);
      const arms = [-1, 1].map((s) => arm(torso, s, o));
      scene.add(root);
      return { root, torso, head: hd, arms, legs, lean: o.lean, sitY: o.hip, standY: legs[0].standY, seat: { x: o.x, z: o.z, yaw: root.rotation.y } };
    }

    // ================= traveler: brown frock coat, white shirt, red tie, cane =================
    const HAIR = 0x4a2c18;
    const boot = (knee, gy) => {
      knee.add(box(0.17, 0.2, 0.17, DARK, 0, gy + 0.1, -0.02));
      knee.add(box(0.18, 0.05, 0.18, BROWN_DK, 0, gy + 0.2, -0.02)); // boot cuff
      knee.add(box(0.16, 0.08, 0.26, DARK, 0, gy + 0.04, 0.06));
    };
    const tr = person({ x: -2.1, z: 0.35, turn: -0.65, hip: 0.42, lean: 0.18, legs: CLOTH_DARK, skin: SKIN, sleeve: BROWN, cuff: WHITE, foot: boot });
    const tt = tr.torso;
    tt.add(box(0.42, 0.58, 0.25, BROWN, 0, 0.29, 0));
    tt.add(box(0.46, 0.36, 0.06, BROWN, 0, -0.1, -0.12)); // coat tails over the log
    for (const s of [-1, 1]) {
      tt.add(box(0.06, 0.26, 0.42, BROWN, s * 0.22, -0.02, 0.1)); // coat skirt over the hips
      tt.add(tilt(box(0.08, 0.28, 0.03, BROWN_DK, s * 0.1, 0.43, 0.133), 0, 0, s * 0.35)); // lapel
      tt.add(tilt(box(0.06, 0.05, 0.03, WHITE, s * 0.05, 0.56, 0.13), 0, 0, s * 0.6)); // shirt collar point
      tt.add(box(0.12, 0.03, 0.02, BROWN_DK, s * 0.12, 0.13, 0.128)); // pocket flap
    }
    tt.add(box(0.14, 0.26, 0.02, WHITE, 0, 0.44, 0.127)); // shirt
    tt.add(box(0.05, 0.22, 0.02, RED, 0, 0.41, 0.14)); // tie
    tt.add(box(0.07, 0.05, 0.03, RED, 0, 0.53, 0.14)); // knot
    tt.add(box(0.32, 0.07, 0.27, BROWN_DK, 0, 0.6, -0.01)); // coat collar
    tt.add(box(0.035, 0.035, 0.02, GOLD, 0.07, 0.22, 0.13)); // buttons
    tt.add(box(0.035, 0.035, 0.02, GOLD, 0.07, 0.1, 0.13));
    const th = tr.head;
    th.add(box(0.3, 0.08, 0.29, HAIR, 0, 0.32, -0.01)); // hair
    th.add(box(0.3, 0.24, 0.07, HAIR, 0, 0.2, -0.13));
    th.add(tilt(box(0.22, 0.07, 0.08, HAIR, 0.04, 0.3, 0.12), 0, 0, -0.2)); // swept fringe
    for (const s of [-1, 1]) {
      th.add(box(0.035, 0.11, 0.05, HAIR, s * 0.14, 0.16, 0.07)); // sideburns
      th.add(box(0.07, 0.025, 0.02, HAIR, s * 0.07, 0.205, 0.138)); // eyebrows
    }
    tr.arms[0].sh.rotation.set(-0.5, 0, 0.05); // left hand on the knee
    tr.arms[0].el.rotation.x = -0.7;
    tr.arms[1].sh.rotation.set(-0.75, 0, -0.05); // right hand on the cane
    tr.arms[1].el.rotation.x = -0.6;
    const cane = group(0.25, 0, 0.56);
    cane.add(cyl(0.022, 0.026, 0.66, 5, BROWN, 0, 0.33, 0));
    cane.add(mesh(new THREE.DodecahedronGeometry(0.045), GOLD, 0, 0.68, 0)); // knob
    cane.add(cyl(0.03, 0.02, 0.04, 5, DARK, 0, 0.02, 0)); // tip
    tr.root.add(cane);
    tr.root.updateMatrixWorld();
    cane.applyMatrix4(tr.root.matrixWorld); // leave it leaning at the log, even when the traveler walks off
    scene.add(cane);
    // a wooden flute, held to the lips while playing
    const flute = group(0.17, 0.065, 0.16);
    flute.add(tilt(cyl(0.016, 0.016, 0.36, 5, BROWN_DK, 0, 0, 0), 0, 0, Math.PI / 2));
    for (let k = 0; k < 4; k++) flute.add(box(0.012, 0.01, 0.01, DARK, -0.02 + k * 0.05, 0.016, 0)); // finger holes
    flute.visible = false;
    tr.head.add(flute);

    // ================= wizard: wide purple robe, long white beard, drooping hat, gnarled staff =================
    const ROBE = 0x2c1a28, ROBE_MID = 0x45293e, ROBE_HI = 0x5e3a56, BEARD = 0xcfc8bb, HAIR_W = 0x9a948c;
    const shoes = (knee, gy) => knee.add(box(0.13, 0.07, 0.16, DARK, 0, gy + 0.035, 0.06));
    const wz = person({ x: 0, z: -2.25, hip: 0.42, lean: 0.12, legs: ROBE, skin: SKIN, sleeve: ROBE_MID, bell: true, foot: shoes });
    const sitRobe = [cyl(0.34, 0.82, 0.52, 10, ROBE, 0, 0.26, 0.12), cyl(0.83, 0.85, 0.05, 10, ROBE_HI, 0, 0.025, 0.12)]; // spread on the ground, hem
    sitRobe.forEach((m) => wz.root.add(m));
    const longRobe = group(0, 0, 0); // hangs to the ground when standing
    longRobe.add(cyl(0.26, 0.44, wz.standY, 10, ROBE, 0, wz.standY / 2, 0));
    longRobe.add(cyl(0.45, 0.46, 0.05, 10, ROBE_HI, 0, 0.025, 0));
    longRobe.visible = false;
    wz.root.add(longRobe);
    wz.robes = { sit: sitRobe, stand: longRobe };
    const wt = wz.torso;
    wt.add(cyl(0.18, 0.28, 0.6, 8, ROBE_MID, 0, 0.3, 0));
    wt.add(cyl(0.21, 0.31, 0.15, 8, ROBE_HI, 0, 0.55, 0)); // mantle
    wt.add(box(0.05, 0.42, 0.03, ROBE_HI, 0, 0.26, 0.235)); // robe trim down the front
    wt.add(cyl(0.255, 0.27, 0.05, 8, 0x96603a, 0, 0.13, 0)); // rope belt
    wt.add(box(0.1, 0.12, 0.06, BROWN_DK, 0.16, 0.05, 0.21)); // pouch
    wt.add(box(0.03, 0.14, 0.02, 0x96603a, -0.08, 0.04, 0.27)); // rope end
    const wh = wz.head;
    wh.add(tilt(cone(0.17, 0.52, 6, BEARD, 0, -0.13, 0.12), Math.PI + 0.15, 0, 0)); // beard
    wh.add(box(0.26, 0.13, 0.08, BEARD, 0, 0.05, 0.12)); // cheeks
    wh.add(box(0.22, 0.05, 0.04, BEARD, 0, 0.1, 0.16)); // moustache
    for (const s of [-1, 1]) {
      wh.add(box(0.1, 0.04, 0.04, BEARD, s * 0.07, 0.205, 0.145)); // bushy eyebrows
      wh.add(box(0.04, 0.32, 0.2, HAIR_W, s * 0.15, 0.06, -0.03)); // long hair at the sides
    }
    wh.add(box(0.32, 0.38, 0.08, HAIR_W, 0, 0.04, -0.13)); // long hair at the back
    const hat = group(0, 0.3, 0);
    hat.add(cyl(0.45, 0.45, 0.03, 12, ROBE_MID, 0, 0, 0)); // brim
    hat.add(cyl(0.14, 0.21, 0.24, 8, ROBE_MID, 0, 0.13, 0)); // crown
    hat.add(cyl(0.155, 0.22, 0.05, 8, 0x96603a, 0, 0.04, 0)); // band
    hat.add(box(0.07, 0.07, 0.02, GOLD, 0, 0.04, 0.2)); // buckle
    hat.add(tilt(cyl(0.06, 0.14, 0.22, 7, ROBE_MID, 0, 0.33, -0.04), -0.35, 0, 0));
    hat.add(tilt(cone(0.06, 0.22, 6, ROBE_MID, 0, 0.45, -0.15), -1.05, 0, 0)); // the tip droops back
    wh.add(hat);
    // a pipe, out only while smoking
    const pipe = group(0, 0.06, 0.15);
    pipe.add(tilt(box(0.022, 0.022, 0.18, BROWN_DK, 0, -0.01, 0.09), 0.12, 0, 0)); // stem
    pipe.add(cyl(0.04, 0.032, 0.07, 6, BROWN, 0, 0.0, 0.19)); // bowl
    const pipeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0x9b3a1c }));
    pipeGlow.position.set(0, 0.035, 0.19);
    pipe.add(pipeGlow);
    pipe.visible = false;
    wh.add(pipe);
    wz.arms[0].sh.rotation.set(-0.5, 0, 0.05); // left hand on the knee (reaches toward the fire)
    wz.arms[0].el.rotation.x = -0.7;
    wz.arms[1].sh.rotation.set(-1.0, 0, 0.4); // right hand up on the staff
    wz.arms[1].el.rotation.x = -1.2;
    const staff = group(0.4, 0, 0.47);
    const WOOD = 0x55341d;
    [[0.036, 0.7, 0.35, 0.05], [0.033, 0.62, 1.0, -0.07], [0.03, 0.5, 1.55, 0.06]].forEach(([r, h, y, z]) => {
      staff.add(tilt(cyl(r * 0.85, r, h, 5, WOOD, 0, y, 0), 0, 0, z));
    });
    staff.add(box(0.075, 0.06, 0.075, WOOD, 0.01, 0.7, 0)); // knots
    staff.add(box(0.065, 0.05, 0.065, WOOD, -0.01, 1.3, 0));
    staff.add(tilt(cyl(0.012, 0.018, 0.2, 4, WOOD, 0.07, 1.62, 0), 0, 0, -0.8)); // a twig
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 4, 8), kit.mat(WOOD));
    loop.position.y = 1.92;
    loop.castShadow = true;
    staff.add(loop); // the gnarled loop that holds the crystal
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.065), new THREE.MeshBasicMaterial({ color: 0xf8b347 }));
    crystal.position.y = 1.92;
    staff.add(crystal);
    const crystalLight = new THREE.PointLight(0xf8b347, 0.6, 2.5, 2);
    crystalLight.position.y = 1.92;
    staff.add(crystalLight);
    wz.root.add(staff);

    // ================= samurai: topknot, red lacquered armour, hakama, katana on the back =================
    const KIMONO = 0x6e2a1f, HAKAMA = 0x22304a, LACE = 0x24170f, OBI = 0x3a3f4a;
    const tabi = (knee, gy) => {
      knee.add(box(0.14, 0.09, 0.22, BONE, 0, gy + 0.055, 0.04)); // tabi socks
      knee.add(box(0.15, 0.025, 0.25, DARK, 0, gy + 0.012, 0.04)); // sandal
    };
    const sm = person({ x: 2.1, z: 0.35, turn: 0.65, hip: 0.3, lean: 0.3, kneeUp: 0.55, thigh: 0.4, spread: 0.13, legW: 0.19, flare: 1.2, legs: HAKAMA, skin: SKIN, sleeve: KIMONO, foot: tabi });
    const st = sm.torso;
    st.add(box(0.42, 0.56, 0.26, KIMONO, 0, 0.28, 0));
    for (const s of [-1, 1]) st.add(tilt(box(0.05, 0.3, 0.02, BONE, s * 0.06, 0.45, 0.135), 0, 0, -s * 0.45)); // white collar V
    st.add(box(0.1, 0.14, 0.02, DARK, 0, 0.47, 0.13));
    st.add(box(0.44, 0.3, 0.28, RED, 0, 0.26, 0)); // dō: chest armour
    for (let k = 0; k < 3; k++) st.add(box(0.45, 0.018, 0.29, LACE, 0, 0.16 + k * 0.08, 0)); // lacing rows
    st.add(box(0.45, 0.07, 0.29, OBI, 0, 0.07, 0)); // obi
    for (const s of [-1, 1]) {
      st.add(tilt(box(0.17, 0.17, 0.03, RED, s * 0.1, -0.03, 0.15), -0.3, 0, 0)); // kusazuri: hip plates
      st.add(box(0.03, 0.17, 0.2, RED, s * 0.23, -0.03, 0));
      const sode = group(s * 0.3, 0.56, 0); // sode: shoulder plates
      sode.rotation.z = s * 0.35;
      for (let k = 0; k < 3; k++) {
        sode.add(box(0.045, 0.07, 0.25, RED, 0, -k * 0.08, 0));
        sode.add(box(0.05, 0.012, 0.26, LACE, 0, -k * 0.08 - 0.042, 0));
      }
      st.add(sode);
    }
    // katana across the back, hilt over the shoulder
    const katana = group(0, 0.3, -0.17);
    katana.rotation.z = -0.6;
    katana.add(box(0.06, 0.85, 0.035, DARK, 0, 0, 0)); // saya
    katana.add(box(0.065, 0.05, 0.04, GOLD, 0, -0.42, 0)); // kojiri
    const hilt = group(0, 0, 0); // hidden while the blade is out
    hilt.add(cyl(0.065, 0.065, 0.016, 8, GOLD, 0, 0.44, 0)); // tsuba
    for (let k = 0; k < 4; k++) hilt.add(box(0.045, 0.05, 0.04, k % 2 ? BONE : LACE, 0, 0.48 + k * 0.05, 0)); // wrapped hilt
    hilt.add(box(0.05, 0.03, 0.045, GOLD, 0, 0.68, 0)); // kashira
    katana.add(hilt);
    st.add(katana);
    // the drawn blade, held across the lap to look it over
    const blade = group(0.05, 0.42, 0.4);
    blade.add(box(0.72, 0.035, 0.012, 0xcfc8bb, 0.12, 0, 0)); // steel
    blade.add(box(0.7, 0.012, 0.014, 0x9a948c, 0.12, -0.012, 0)); // the edge's shadow
    blade.add(tilt(cyl(0.06, 0.06, 0.014, 8, GOLD, -0.25, 0, 0), 0, 0, Math.PI / 2)); // tsuba
    for (let k = 0; k < 4; k++) blade.add(box(0.05, 0.045, 0.04, k % 2 ? BONE : LACE, -0.28 - k * 0.05, 0, 0)); // hilt
    const glint = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.02), new THREE.MeshBasicMaterial({ color: 0xfff6d6 }));
    blade.add(glint);
    const stone = box(0.1, 0.035, 0.05, 0x5e5650, 0, 0.03, 0.012); // the whetstone
    stone.visible = false;
    blade.add(stone);
    blade.visible = false;
    st.add(blade);
    st.add(tilt(box(0.035, 0.6, 0.02, LACE, 0.02, 0.3, 0.145), 0, 0, 0.6)); // sageo cord across the chest
    // wakizashi at the hip
    const waki = group(-0.25, 0.1, 0.02);
    waki.rotation.set(1.35, 0, 0.15);
    waki.add(box(0.045, 0.5, 0.03, DARK, 0, -0.1, 0));
    waki.add(cyl(0.05, 0.05, 0.014, 8, GOLD, 0, 0.16, 0));
    waki.add(box(0.04, 0.14, 0.035, BONE, 0, 0.24, 0));
    st.add(waki);
    const sh2 = sm.head;
    sh2.add(box(0.3, 0.07, 0.29, DARK, 0, 0.32, -0.01)); // hair
    sh2.add(box(0.3, 0.26, 0.07, DARK, 0, 0.18, -0.13));
    sh2.add(box(0.2, 0.06, 0.08, DARK, 0, 0.28, 0.12)); // hairline
    for (const s of [-1, 1]) {
      sh2.add(box(0.04, 0.18, 0.2, DARK, s * 0.15, 0.2, -0.03));
      sh2.add(tilt(box(0.045, 0.14, 0.04, DARK, s * 0.11, 0.24, 0.14), 0, 0, s * 0.25)); // loose strands
      sh2.add(box(0.075, 0.025, 0.02, DARK, s * 0.07, 0.205, 0.138)); // eyebrows
    }
    sh2.add(box(0.08, 0.08, 0.24, DARK, 0, 0.39, -0.02)); // chonmage: the topknot along the crown
    sh2.add(box(0.085, 0.085, 0.04, BONE, 0, 0.39, -0.12)); // its tie
    sh2.add(mesh(new THREE.DodecahedronGeometry(0.06), DARK, 0, 0.37, -0.17));
    sm.arms.forEach(({ sh, el }, i) => { // forearms on the knees
      sh.rotation.set(-0.35, 0, (i ? -1 : 1) * 0.08);
      el.rotation.x = -0.85;
    });
    const pack = group(-0.62, 0, -0.3);
    pack.rotation.y = -0.4;
    pack.add(box(0.36, 0.42, 0.24, BROWN_DK, 0, 0.21, 0));
    pack.add(box(0.37, 0.12, 0.26, BROWN, 0, 0.38, 0.01)); // flap
    pack.add(box(0.04, 0.42, 0.26, CLOTH_DARK, -0.1, 0.21, 0.01)); // straps
    pack.add(box(0.04, 0.42, 0.26, CLOTH_DARK, 0.1, 0.21, 0.01));
    pack.add(tilt(cyl(0.11, 0.11, 0.46, 8, 0x96603a, 0, 0.53, 0), 0, 0, Math.PI / 2)); // straw mat roll
    sm.root.add(pack);
    sm.root.updateMatrixWorld();
    pack.applyMatrix4(sm.root.matrixWorld); // stays on the ground when the samurai walks off
    scene.add(pack);

    // a twig the traveler tosses on the fire
    const twig = group(0, 0, 0);
    twig.add(box(0.3, 0.03, 0.03, BROWN, 0, 0, 0));
    twig.add(tilt(box(0.1, 0.02, 0.02, BROWN, 0.06, 0.03, 0), 0, 0, 0.6));
    twig.visible = false;
    scene.add(twig);

    return { traveler: tr, wizard: wz, samurai: sm, crystal, crystalLight, staff, hilt, blade, glint, stone, flute, pipe, pipeGlow, twig };
  }

  window.CampFigures = { build };
})();
