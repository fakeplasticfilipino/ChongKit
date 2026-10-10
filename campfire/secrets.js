// Campfire: secrets at the clearing's edge (CampAnim.SECRETS), what they do, and the tally of the ones this device
// has found. Browser global `CampSecrets`. kit: scene.js's helpers + { season, blob, people, onFind(id, first) }.
(function () {
  'use strict';
  const A = window.CampAnim;
  const KEY = 'chongkit.campfire.found'; // the tally's storage
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
    // update(t, walker, rx, ev). Only the current season's seasonal secret is listed (A.secretsFor).
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
      // ---- spooky ----
      wisp() { // a pale light hovering at the edge; it slips away when someone comes close, back a while later
        const [x, z] = P('wisp'), d = Math.hypot(x, z), ox = x / d, oz = z / d; // outward: away from the fire
        const OPACITY = 0.85;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.blob, color: 0x8fa6c4, transparent: true, opacity: OPACITY, depthWrite: false, fog: false }));
        s.scale.setScalar(0.28);
        s.position.set(x, 0.9, z);
        scene.add(s);
        // goneAt: when it last fled (null: never); the tally counts each flight as a find.
        const w = parts.wisp = { sprite: s, goneAt: null };
        return (t, walker) => {
          const away = w.goneAt === null ? Infinity : t - w.goneAt;
          if (away > 90 && walker && Math.hypot(walker.at[0] - x, walker.at[1] - z) < 2.0) {
            w.goneAt = t;
            if (window.CampAudio && window.CampAudio.whisper) window.CampAudio.whisper();
            return;
          }
          if (away <= 90 && away >= 3) { s.visible = false; return; } // gone, until it drifts back
          s.visible = true;
          const u = away < 3 ? away / 3 : 0, bob = 0.08 * Math.sin(t * 1.7) + 0.04 * A.noise1(t * 0.6, 1340);
          s.position.set(x + ox * 0.8 * u, 0.9 + bob + 0.2 * u, z + oz * 0.8 * u);
          s.material.opacity = OPACITY * (1 - u) * (0.85 + 0.15 * A.noise1(t * 3, 1341));
        };
      },
      skull() { // half-sunk in the leaves; a beetle lives in one eye
        const [x, z] = P('skull'), g = facing(group(x, 0, z));
        g.add(box(0.16, 0.12, 0.18, BONE, 0, 0.03, 0)); // the cranium, half under the leaves
        g.add(box(0.1, 0.04, 0.06, BONE, 0, -0.01, 0.1)); // the cheekbones
        for (const ex of [-0.04, 0.04]) g.add(box(0.04, 0.035, 0.012, DARK, ex, 0.04, 0.091)); // eye sockets
        [[-0.12, 0.1, 0], [0.14, -0.06, 1], [0.02, -0.14, 2], [-0.1, -0.1, 1], [0.1, 0.12, 0]].forEach(([lx, lz, j], i) => {
          const leaf = box(0.12, 0.012, 0.08, LEAF[j], lx, 0.006 + 0.004 * i, lz);
          leaf.rotation.y = i * 1.3;
          g.add(leaf);
        });
        const beetle = box(0.026, 0.014, 0.036, DARK, -0.04, 0.04, 0.08);
        beetle.visible = false;
        g.add(beetle);
        scene.add(g);
        parts.skull = { beetle };
        return (t, walker, rx) => {
          const k = rx.spot === 'secret:skull' && rx.name === 'look' ? A.win(rx.local, 0.8, A.ACTIONS.look.dur - 0.2, 0.9) : 0;
          beetle.visible = k > 0.02;
          if (!beetle.visible) return;
          // out of the left eye, down the face onto the leaves, and back in
          beetle.position.set(-0.04 + 0.015 * Math.sin(t * 6) * k, 0.04 - 0.03 * k, 0.08 + 0.1 * k);
          beetle.rotation.y = 0.4 * Math.sin(t * 4);
        };
      },
      stones() { // five standing stones in a 0.6 m ring, open toward the fire so the walker fits in
        const [x, z] = P('stones'), g = facing(group(x, 0, z)), R = 0.6;
        // The walker (radius 0.28) can't pass between stones (0.15) spaced evenly on a 0.6 m ring, so the
        // gap facing the fire is wider (110 degrees) and the other four share the rest.
        const GAP = (110 * Math.PI) / 180, step = (Math.PI * 2 - GAP) / 4, ry = g.rotation.y;
        const runeMat = basic(DARK); // all the runes glow together: one shared material
        for (let i = 0; i < 5; i++) {
          const a = GAP / 2 + i * step, sx = Math.sin(a) * R, sz = Math.cos(a) * R;
          const st = group(sx, 0, sz), h = 0.55 + 0.03 * ((i * 3) % 5);
          st.rotation.y = a + Math.PI; // local +z faces the middle of the ring
          st.add(box(0.2, h, 0.14, STONE, 0, h / 2, 0));
          if (i % 2 === 0) st.add(box(0.12, 0.06, 0.02, MOSS, -0.03, h * 0.3, 0.075));
          for (const [rw, rh, rx2, ryy] of [[0.025, 0.09, 0, 0.62], [0.06, 0.02, 0, 0.7], [0.02, 0.05, 0.035, 0.5]]) {
            const rune = new THREE.Mesh(new THREE.PlaneGeometry(rw, rh), runeMat);
            rune.position.set(rx2, h * ryy, 0.072);
            st.add(rune);
          }
          g.add(st);
          obstacles.push([x + sx * Math.cos(ry) + sz * Math.sin(ry), z - sx * Math.sin(ry) + sz * Math.cos(ry), 0.15]);
        }
        scene.add(g);
        const dark = new THREE.Color(DARK), glow = new THREE.Color(0x8fd0e8);
        // inside: is the walker standing in the ring now; enteredAt: when they last stepped in (the tally counts it)
        const s = parts.stones = { runeMat, level: 0, inside: false, enteredAt: null };
        return (t, walker) => {
          const inside = !!walker && Math.hypot(walker.at[0] - x, walker.at[1] - z) < 0.35;
          if (inside && !s.inside) s.enteredAt = t;
          s.inside = inside;
          const was = s.level;
          s.level += ((inside ? 1 : 0) - s.level) * 0.04;
          if (s.level < 0.002) s.level = 0;
          if (window.CampAudio) window.CampAudio.hum = s.level;
          if (s.level === 0 && was === 0) return; // idle: nothing to recolour
          runeMat.color.copy(dark).lerp(glow, s.level * (0.8 + 0.2 * A.noise1(t * 2, 1350)));
        };
      },
      // ---- seasonal (only the current season's is built) ----
      snowman() { // winter: its stick arm drops off when looked at, then the walker puts it back
        const [x, z] = P('season'), g = facing(group(x, 0, z)), snow = new THREE.MeshStandardMaterial({ color: 0xd6e0ec, flatShading: true, roughness: 1 });
        for (const [r, y] of [[0.26, 0.24], [0.19, 0.6], [0.13, 0.88]]) {
          const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), snow);
          ball.position.y = y;
          g.add(ball);
        }
        g.add(box(0.03, 0.03, 0.02, DARK, -0.05, 0.92, 0.12), box(0.03, 0.03, 0.02, DARK, 0.05, 0.92, 0.12)); // coal eyes
        const nose = cone(0.025, 0.12, 4, CAP, 0, 0.87, 0.17);
        nose.rotation.x = Math.PI / 2;
        g.add(nose);
        for (const by of [0.66, 0.56]) g.add(box(0.03, 0.03, 0.02, DARK, 0, by, 0.185)); // buttons
        const stick = () => { const a = group(0, 0, 0); a.add(box(0.34, 0.025, 0.025, BARK, 0.17, 0, 0)); a.add(box(0.08, 0.02, 0.02, BARK, 0.28, 0.04, 0)); return a; };
        const left = stick();
        left.position.set(-0.17, 0.66, 0);
        left.rotation.set(0, Math.PI, 0.45);
        const right = stick();
        right.position.set(0.17, 0.66, 0);
        right.rotation.z = 0.45;
        g.add(left, right);
        scene.add(g);
        obstacles.push([x, z, 0.3]);
        parts.snowman = { arm: right };
        let was = 0;
        return (t, walker, rx) => {
          const k = rx.spot === 'secret:snowman' && rx.name === 'look' ? A.win(rx.local, 0.5, A.ACTIONS.look.dur - 0.3, 0.45) : 0;
          if (k === 0 && was === 0) return;
          was = k;
          right.position.set(0.17 + 0.12 * k, 0.66 - 0.63 * k, 0.05 * k); // falls to the snow beside it
          right.rotation.set(0, -0.6 * k, 0.45 * (1 - k));
        };
      },
      pumpkin() { // autumn: a carved pumpkin; looked at, a candle inside flickers on and stays lit a minute
        const [x, z] = P('season'), g = facing(group(x, 0, z));
        const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), new THREE.MeshStandardMaterial({ color: CAP, flatShading: true, roughness: 1 }));
        body.scale.set(1.15, 0.8, 1.05);
        body.position.y = 0.19;
        g.add(body);
        g.add(cyl(0.025, 0.035, 0.09, 5, 0x3d4a1e, 0, 0.42, 0)); // stem
        const face = basic(DARK); // the eyes and the grin light up together
        for (const [w, h, fx, fy] of [[0.07, 0.06, -0.08, 0.25], [0.07, 0.06, 0.08, 0.25], [0.03, 0.035, 0, 0.18], [0.2, 0.04, 0, 0.12], [0.04, 0.03, -0.06, 0.1], [0.04, 0.03, 0.06, 0.1]]) {
          const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), face);
          f.position.set(fx, fy, 0.25);
          g.add(f);
        }
        const light = new THREE.PointLight(0xff9a40, 0, 2.2, 2);
        light.position.set(0, 0.25, 0.4);
        g.add(light);
        scene.add(g);
        obstacles.push([x, z, 0.3]);
        const p = parts.pumpkin = { light, face, litUntil: -Infinity };
        let wasLit = false;
        return (t, walker, rx) => {
          if (rx.spot === 'secret:pumpkin' && rx.name === 'look' && rx.local > 0.8) p.litUntil = t + 60; // stays lit a minute after
          const lit = t < p.litUntil;
          if (!lit && !wasLit) return;
          wasLit = lit;
          const fl = 0.8 + 0.2 * A.noise1(t * 7, 1360);
          light.intensity = lit ? 0.45 * fl : 0;
          face.color.setHex(!lit ? DARK : fl > 0.93 ? 0xffe08a : GLOW);
        };
      },
      crown() { // spring: a crown of flowers on a stone; worn by the walker until they sit back down
        const [x, z] = P('season'), g = facing(group(x, 0, z));
        g.add(cyl(0.2, 0.26, 0.16, 6, STONE, 0, 0.08, 0)); // the stone it rests on
        scene.add(g);
        obstacles.push([x, z, 0.25]);
        const crown = group(x, 0.19, z);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 4, 10), new THREE.MeshStandardMaterial({ color: 0x3d6a2e, flatShading: true, roughness: 1 }));
        ring.rotation.x = Math.PI / 2;
        crown.add(ring);
        const PETALS = [0xe8e2d4, 0xd88aa8, 0xf8d347, 0xb7a8e8];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          crown.add(box(0.04, 0.03, 0.04, PETALS[i % 4], Math.cos(a) * 0.11, 0.015, Math.sin(a) * 0.11));
        }
        scene.add(crown);
        const head = new THREE.Vector3();
        const c = parts.crown = { crown, worn: null }; // worn: the walker's name while it's on their head
        return (t, walker, rx) => {
          if (walker && !c.worn && rx.spot === 'secret:crown' && rx.name === 'wear' && rx.local > 1.0) c.worn = walker.who;
          if (c.worn && (!walker || walker.who !== c.worn)) { // they sat back down: it goes back on its stone
            c.worn = null;
            crown.position.set(x, 0.19, z);
            crown.rotation.set(0, 0, 0);
          }
          if (!c.worn) return;
          kit.people[c.worn].head.getWorldPosition(head);
          crown.position.set(head.x, head.y + 0.18, head.z);
          crown.rotation.y = walker.yaw || 0;
        };
      },
      jar() { // summer: a jar of fireflies; opened, they spill up and drift off into the trees (until the page reloads)
        const [x, z] = P('season'), g = facing(group(x, 0, z));
        g.add(cyl(0.18, 0.22, 0.22, 7, BARK, 0, 0.11, 0)); // a stump to stand it on
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 7), new THREE.MeshBasicMaterial({ color: 0x9fb7a0, transparent: true, opacity: 0.35, depthWrite: false }));
        glass.position.y = 0.295;
        g.add(glass);
        const cork = box(0.07, 0.04, 0.07, 0x744726, 0, 0.39, 0);
        g.add(cork);
        scene.add(g);
        obstacles.push([x, z, 0.22]);
        const N = 8, flies = particles(N, 0xb7d65a, 1.5), jy = 0.295;
        const fp = flies.geometry.attributes.position, fc = flies.geometry.attributes.color, b = flies.userData.base;
        const dir = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2 + 0.4 * Math.sin(i * 7.3)); // where each drifts off to
        const j = parts.jar = { cork, flies, openedAt: null, empty: false };
        let tick = -1;
        return (t, walker, rx, ev) => {
          if (j.empty) return;
          if (j.openedAt === null) for (const e of ev) if (e.act && e.name === 'open' && e.type === 'uncork') { j.openedAt = e.time; cork.visible = false; }
          if (j.openedAt === null) { // milling about in the jar: redrawn 12 times a second is plenty
            const k = Math.floor(t * 12);
            if (k === tick) return;
            tick = k;
            for (let i = 0; i < N; i++) {
              const a = t * (0.6 + 0.1 * i) + i * 2.1, blink = 0.5 + 0.5 * Math.sin(t * (1.3 + 0.2 * i) + i);
              fp.setXYZ(i, x + Math.cos(a) * 0.035, jy + 0.06 * Math.sin(t * 0.7 + i * 1.7), z + Math.sin(a) * 0.035);
              fc.setXYZ(i, b.r * blink, b.g * blink, b.b * blink);
            }
          } else {
            const u = (t - j.openedAt) / 6;
            if (u >= 1) { // all gone: dark from now on
              for (let i = 0; i < N; i++) fc.setXYZ(i, 0, 0, 0);
              j.empty = true;
            } else {
              for (let i = 0; i < N; i++) {
                const ui = Math.min(1, u * (1 + 0.15 * (i % 3))), r = 2.2 * ui * ui, wob = 0.15 * Math.sin(t * 3 + i);
                fp.setXYZ(i, x + Math.cos(dir[i]) * r + wob, jy + 0.1 + 1.6 * ui + 0.1 * Math.sin(t * 2 + i), z + Math.sin(dir[i]) * r - wob);
                const k = (1 - ui) * (0.6 + 0.4 * Math.sin(t * 5 + i));
                fc.setXYZ(i, b.r * k, b.g * k, b.b * k);
              }
            }
          }
          fp.needsUpdate = fc.needsUpdate = true;
        };
      },
    };

    const updates = list.filter((s) => BUILD[s.id]).map((s) => BUILD[s.id]());
    const spots = list.filter((s) => s.act && BUILD[s.id]).map((s) => {
      const [x, z] = P(s.place);
      return { id: 'secret:' + s.id, secret: s.id, x, z, r: 1.0, y: 1.0, acts: [s.act] };
    });

    // The tally: ids found on this device, saved in localStorage (in memory only when storage is off).
    const tally = document.getElementById('tally');
    let found = [];
    try { found = A.readFound(localStorage.getItem(KEY)); } catch (e) { found = []; }
    const show = () => { if (tally) tally.textContent = found.length + ' / ' + A.SECRETS.length; };
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
    // Edge-triggered: each run of an action, each step into a ring, each flight of the wisp counts once.
    let lastFound = '', ringIn = false, stonesAt = null, wispAt = null;

    let lastT = null;
    function update(t, walker, rx) {
      rx = rx || {};
      if (rx.spot && rx.spot.startsWith('secret:') && rx.local > 0.5) {
        const key = rx.spot + '@' + Math.floor(t - rx.local);
        if (key !== lastFound) { lastFound = key; find(rx.spot.slice(7)); }
      }
      const m = parts.mushrooms, inM = !!(m && walker && Math.hypot(walker.at[0] - m.x, walker.at[1] - m.z) < 0.65);
      if (inM && !ringIn) find('mushrooms');
      ringIn = inM;
      const st = parts.stones;
      if (st && st.enteredAt !== stonesAt) { stonesAt = st.enteredAt; if (stonesAt !== null) find('stones'); }
      const w = parts.wisp;
      if (w && w.goneAt !== wispAt) { wispAt = w.goneAt; if (wispAt !== null) find('wisp'); }
      const ev = lastT !== null && t > lastT ? A.events(Math.max(lastT, t - 61), t) : []; // the moments since last frame
      lastT = t;
      for (const u of updates) u(t, walker, rx, ev);
    }
    return { spots, obstacles, update, parts, found: () => found.slice() };
  }

  window.CampSecrets = { build };
})();
