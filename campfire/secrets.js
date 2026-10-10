// Campfire: secrets at the clearing's edge (CampAnim.SECRETS), what they do, and the tally of the ones this device
// has found. Browser global `CampSecrets`. kit: scene.js's helpers + { season, onFind(id, first) }.
(function () {
  'use strict';
  const A = window.CampAnim;
  const KEY = 'chongkit.campfire.found'; // the tally's storage (used once the tally lands)
  const MOSS = 0x2f5a3a, STONE = 0x3a3f4a, BARK = 0x3a2416, CAP = 0xc8561b, GLOW = 0xf8b347, BONE = 0xe8e2d4, DARK = 0x150e0b;
  const LEAF = [0x0d1612, 0x16241b, 0x213425], SPINE = 0x24170f, FUR = 0x96603a, STEEL = 0x8fa6c4;

  function build(kit) {
    const { THREE, scene, box, cyl, cone, group, particles } = kit;
    const list = A.secretsFor(kit.season);
    const P = (name) => A.SECRET_PLACES[name];
    const parts = {}; // id → what moves
    const obstacles = [];
    const facing = (g) => { g.rotation.y = Math.atan2(-g.position.x, -g.position.z); return g; }; // local +z faces the fire
    const basic = (c) => new THREE.MeshBasicMaterial({ color: c });

    // Each secret: a builder that adds its meshes (filling parts[id], obstacles) and returns its per-frame
    // update(t, walker, rx, ev). Secrets without a builder yet (spooky, seasonal) are skipped.
    const BUILD = {
      // ---- nature ----
      mushrooms() {
        const [x, z] = P('mushrooms'), g = group(x, 0, z), caps = [];
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2, m = new THREE.MeshStandardMaterial({ color: CAP, flatShading: true, roughness: 1, emissive: 0x000000 });
          const cap = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.06, 5), m);
          cap.position.set(Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6);
          g.add(cyl(0.015, 0.02, 0.08, 4, BONE, cap.position.x, 0.04, cap.position.z), cap);
          caps.push(m);
        }
        scene.add(g);
        const m = parts.mushrooms = { caps, sparks: particles(8, GLOW, 1), x, z, level: 0 };
        return (t, walker) => {
          const glow = walker && Math.hypot(walker.at[0] - x, walker.at[1] - z) < 0.65 ? 1 : 0;
          m.level += (glow - m.level) * 0.08;
          m.caps.forEach((c) => c.emissive.setHex(m.level > 0.5 ? GLOW : m.level > 0.15 ? CAP : 0x000000));
          // sparks rise over the ring while it glows (like camp.js's moths)
          const sp = m.sparks.geometry.attributes.position, sc = m.sparks.geometry.attributes.color, b = m.sparks.userData.base;
          for (let i = 0; i < 8; i++) {
            const ph = (t * 0.35 + i / 8) % 1, a = (i / 8) * Math.PI * 2 + 0.6 * A.noise1(t * 0.5 + i, 1300 + i);
            const r = 0.45 + 0.12 * A.noise1(t * 0.7 + i * 2, 1310 + i);
            sp.setXYZ(i, x + Math.cos(a) * r, 0.12 + ph * 0.8, z + Math.sin(a) * r);
            const k = m.level > 0.1 ? m.level * (1 - ph) : 0;
            sc.setXYZ(i, b.r * k, b.g * k, b.b * k);
          }
          sp.needsUpdate = sc.needsUpdate = true;
        };
      },
      hedgehog() { // asleep under a bush, curled up
        const [x, z] = P('hedgehog'), g = facing(group(x, 0, z));
        [[-0.25, 0.26, -0.35, 0.3], [0.2, 0.22, -0.4, 0.26], [0, 0.32, -0.6, 0.34]].forEach(([bx, by, bz, r], j) => {
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), new THREE.MeshStandardMaterial({ color: LEAF[j], flatShading: true, roughness: 1 }));
          leaf.position.set(bx, by, bz);
          g.add(leaf);
        });
        const body = group(0, 0, 0);
        body.add(box(0.2, 0.12, 0.24, 0x55341d, 0, 0.06, 0));
        for (const [sx, sz] of [[-0.06, -0.05], [0.06, -0.05], [0, 0.04], [0, -0.1]]) {
          const s = cone(0.05, 0.07, 4, SPINE, sx, 0.13, sz);
          s.rotation.x = -0.4;
          body.add(s);
        }
        const snout = group(0, 0.05, 0.1);
        snout.add(box(0.06, 0.05, 0.08, FUR, 0, 0, 0));
        snout.add(box(0.025, 0.025, 0.02, DARK, 0, 0.005, 0.045)); // nose
        body.add(snout);
        g.add(body);
        scene.add(g);
        obstacles.push([x - 0.45 * Math.sin(g.rotation.y), z - 0.45 * Math.cos(g.rotation.y), 0.35]); // the bush
        parts.hedgehog = { body, snout };
        return (t, walker, rx) => {
          const uncurl = rx.spot === 'secret:hedgehog' ? A.win(rx.local, 0.4, 3.4, 0.4) : 0;
          body.scale.y = 1 + 0.3 * uncurl;
          snout.position.z = 0.1 + 0.08 * uncurl;
          snout.rotation.y = 0.3 * uncurl * Math.sin(t * 5); // sniffing about
          snout.position.y = 0.05 + 0.01 * uncurl * Math.sin(t * 13);
        };
      },
      nest() { // on a low branch of a dead sapling
        const [x, z] = P('nest'), g = facing(group(x, 0, z));
        g.add(cyl(0.08, 0.12, 1.7, 6, BARK, 0, 0.85, -0.35));
        const branch = box(0.06, 0.06, 0.5, BARK, 0, 1.0, -0.12);
        branch.rotation.x = 0.15;
        g.add(branch);
        g.add(cyl(0.13, 0.08, 0.08, 6, 0x55341d, 0, 1.05, 0.08)); // the nest
        g.add(cyl(0.09, 0.09, 0.01, 6, DARK, 0, 1.09, 0.08)); // its hollow
        const base = 1.06, chick = group(0, base, 0.08);
        chick.add(box(0.06, 0.06, 0.06, FUR, 0, 0, 0));
        const beak = cone(0.015, 0.035, 4, GLOW, 0, 0.005, 0.045);
        beak.rotation.x = Math.PI / 2;
        chick.add(beak);
        g.add(chick);
        scene.add(g);
        obstacles.push([x - 0.35 * Math.sin(g.rotation.y), z - 0.35 * Math.cos(g.rotation.y), 0.2]); // the sapling's trunk
        parts.nest = { chick };
        return (t, walker, rx) => {
          const up = rx.spot === 'secret:nest' ? A.win(rx.local, 0.8, 2.8, 0.2) : 0;
          chick.position.y = base + 0.06 * up;
          chick.rotation.z = 0.25 * up * Math.sin(t * 9); // looking about, cheeping
        };
      },
      // ---- relics ----
      shrine() { // a mossy stone shrine with a candle in its niche
        const [x, z] = P('shrine'), g = facing(group(x, 0, z));
        g.add(box(0.5, 0.55, 0.4, STONE, 0, 0.27, 0));
        const roof = cone(0.42, 0.25, 4, STONE, 0, 0.67, 0);
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
        g.add(box(0.3, 0.05, 0.22, MOSS, 0.06, 0.62, 0.02), box(0.2, 0.12, 0.05, MOSS, -0.14, 0.08, 0.19)); // moss
        g.add(box(0.26, 0.26, 0.02, DARK, 0, 0.3, 0.2)); // the niche
        g.add(box(0.04, 0.08, 0.04, BONE, 0, 0.21, 0.22)); // candle
        const flame = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.045, 0.025), basic(GLOW));
        flame.position.set(0, 0.28, 0.22);
        flame.visible = false;
        g.add(flame);
        const light = new THREE.PointLight(0xff9a40, 0, 2.5, 2);
        light.position.set(0, 0.35, 0.35);
        g.add(light);
        scene.add(g);
        obstacles.push([x, z, 0.45]);
        parts.shrine = { light, flame };
        let litAt = -Infinity;
        return (t, walker, rx, ev) => {
          for (const e of ev) if (e.act && e.name === 'pray' && e.type === 'kindle') litAt = e.time;
          const lit = t >= litAt && t - litAt < 60;
          const fl = 0.85 + 0.15 * A.noise1(t * 7, 1320);
          light.intensity = lit ? 0.4 * fl : 0;
          flame.visible = lit;
          if (lit) { flame.scale.y = 0.8 + 0.4 * fl; flame.material.color.setHex(fl > 0.95 ? 0xffe08a : GLOW); }
        };
      },
      sword() { // stuck fast in a stump
        const [x, z] = P('sword'), g = facing(group(x, 0, z));
        g.add(cyl(0.28, 0.33, 0.35, 7, BARK, 0, 0.17, 0));
        g.add(cyl(0.27, 0.27, 0.01, 7, 0x744726, 0, 0.355, 0)); // the cut face
        const blade = group(0, 0.35, 0);
        blade.add(box(0.05, 0.5, 0.015, STEEL, 0, 0.2, 0));
        blade.add(box(0.22, 0.04, 0.05, 0x5e5650, 0, 0.47, 0)); // crossguard
        blade.add(box(0.035, 0.16, 0.035, BARK, 0, 0.57, 0)); // grip
        blade.add(box(0.05, 0.05, 0.05, 0x744726, 0, 0.67, 0)); // pommel
        blade.rotation.x = 0.08;
        g.add(blade);
        scene.add(g);
        obstacles.push([x, z, 0.4]);
        parts.sword = { blade };
        let strainAt = -Infinity;
        return (t, walker, rx, ev) => {
          for (const e of ev) if (e.act && e.name === 'pull' && e.type === 'strain') strainAt = e.time;
          blade.rotation.z = 0.04 * Math.sin(t * 40) * (t >= strainAt && t - strainAt < 0.4 ? 1 : 0);
        };
      },
      initials() { // a dead tree with letters cut into its bark
        const [x, z] = P('initials'), g = facing(group(x, 0, z));
        g.add(cyl(0.2, 0.28, 2.2, 7, BARK, 0, 1.1, 0));
        const snag = box(0.07, 0.5, 0.07, BARK, 0.15, 1.8, 0);
        snag.rotation.z = -0.6;
        g.add(snag);
        const markMat = basic(DARK), mark = group(0, 1.0, 0.255);
        mark.rotation.x = -0.02;
        for (const [w, h, mx, my] of [[0.015, 0.1, -0.05, 0], [0.04, 0.015, -0.035, 0.045], [0.04, 0.015, -0.035, -0.045], [0.015, 0.1, 0.03, 0], [0.04, 0.015, 0.05, 0.02]]) {
          const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.01), markMat);
          s.position.set(mx, my, 0);
          mark.add(s);
        }
        g.add(mark);
        scene.add(g);
        obstacles.push([x, z, 0.35]);
        parts.initials = { mark, markMat };
        const dark = new THREE.Color(DARK), lit = new THREE.Color(CAP);
        return (t, walker, rx) => {
          const k = rx.spot === 'secret:initials' && rx.name === 'read' ? A.win(rx.local, 0.6, A.ACTIONS.read.dur - 0.3, 0.5) : 0;
          markMat.color.copy(dark).lerp(lit, k * (0.85 + 0.15 * A.noise1(t * 5, 1330)));
        };
      },
    };

    const updates = list.filter((s) => BUILD[s.id]).map((s) => BUILD[s.id]());
    const spots = list.filter((s) => s.act && BUILD[s.id]).map((s) => {
      const [x, z] = P(s.place);
      return { id: 'secret:' + s.id, secret: s.id, x, z, r: 1.0, y: 1.0, acts: [s.act] };
    });

    let lastT = null;
    function update(t, walker, rx) {
      const ev = lastT !== null && t > lastT ? A.events(Math.max(lastT, t - 61), t) : []; // the moments since last frame
      lastT = t;
      for (const u of updates) u(t, walker, rx || {}, ev);
    }
    return { spots, obstacles, update, parts };
  }

  window.CampSecrets = { build };
})();
