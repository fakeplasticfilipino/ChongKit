// Campfire: the three seated figures (traveler, wizard, fighter), built from boxes, cones and cylinders.
// Browser global `CampFigures`. `kit` holds scene.js's helpers.
(function () {
  'use strict';

  const SKIN = 0x96603a, DARK = 0x150e0b, CLOTH_DARK = 0x24170f;

  function build(kit) {
    const { THREE, scene, mesh, box, cyl, cone, group } = kit;

    // A seated person facing the fire (front is +z). Returns the parts that move.
    function person(o) {
      const root = group(o.x, 0, o.z);
      root.rotation.y = Math.atan2(-o.x, -o.z);
      const hip = o.hip;
      for (const s of [-1, 1]) {
        root.add(box(0.15, 0.15, 0.42, o.legs, s * 0.11, hip, 0.18)); // thigh
        root.add(box(0.14, hip - 0.12, 0.14, o.legs, s * 0.11, hip / 2 + 0.06, 0.38)); // shin
        root.add(box(0.16, 0.2, 0.16, DARK, s * 0.11, 0.1, 0.39)); // boot
        root.add(box(0.15, 0.08, 0.26, DARK, s * 0.11, 0.04, 0.46)); // toe
      }
      const torso = group(0, hip, 0);
      torso.rotation.x = o.lean;
      root.add(torso);
      const head = group(0, 0.6, 0.02);
      head.add(box(0.24, 0.26, 0.24, SKIN, 0, 0.13, 0));
      head.add(box(0.05, 0.05, 0.04, SKIN, 0, 0.11, 0.13)); // nose
      torso.add(head);
      const arms = [-1, 1].map((s) => {
        const sh = group(s * 0.26, 0.52, 0);
        sh.rotation.x = -0.75;
        torso.add(sh);
        return sh;
      });
      scene.add(root);
      return { root, torso, head, arms, lean: o.lean };
    }
    const sleeve = (arm, color, bell) => {
      arm.add(bell ? cyl(0.06, 0.12, 0.48, 6, color, 0, -0.22, 0) : box(0.11, 0.48, 0.12, color, 0, -0.22, 0));
      arm.add(box(0.09, 0.1, 0.09, SKIN, 0, -0.5, 0));
    };

    // ---- traveler: brown jacket, white collar and red tie, leaning on a cane ----
    const tr = person({ x: -2.1, z: 0.35, hip: 0.4, lean: 0.15, legs: CLOTH_DARK });
    const JACKET = 0x3a2416;
    tr.torso.add(box(0.42, 0.58, 0.26, JACKET, 0, 0.29, 0));
    tr.torso.add(box(0.46, 0.12, 0.3, JACKET, 0, 0.04, 0)); // jacket hem
    tr.torso.add(box(0.13, 0.24, 0.02, 0xcfc8bb, 0, 0.45, 0.135)); // shirt
    tr.torso.add(box(0.045, 0.2, 0.02, 0x6e2a1f, 0, 0.42, 0.15)); // tie
    tr.torso.add(box(0.07, 0.045, 0.03, 0x6e2a1f, 0, 0.54, 0.15)); // knot
    for (const s of [-1, 1]) {
      const lapel = box(0.07, 0.26, 0.025, CLOTH_DARK, s * 0.095, 0.44, 0.145);
      lapel.rotation.z = s * 0.35;
      tr.torso.add(lapel);
    }
    tr.torso.add(box(0.3, 0.06, 0.28, CLOTH_DARK, 0, 0.6, 0)); // collar
    tr.head.add(box(0.26, 0.08, 0.26, CLOTH_DARK, 0, 0.27, -0.01)); // hair
    tr.head.add(box(0.26, 0.2, 0.06, CLOTH_DARK, 0, 0.16, -0.12));
    const fringe = box(0.2, 0.05, 0.06, CLOTH_DARK, 0.03, 0.24, 0.11);
    fringe.rotation.z = -0.25;
    tr.head.add(fringe);
    sleeve(tr.arms[0], JACKET);
    sleeve(tr.arms[1], JACKET);
    tr.arms[0].rotation.set(-0.95, 0, 0.05); // left hand on the knee
    tr.arms[1].rotation.set(-1.05, 0, 0.12); // right hand on the cane
    const cane = group(0.29, 0, 0.6);
    cane.rotation.x = -0.12;
    cane.add(cyl(0.022, 0.026, 0.98, 5, 0x55341d, 0, 0.49, 0));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.02, 4, 6, Math.PI), kit.mat(0x55341d));
    handle.position.set(-0.055, 0.98, 0);
    handle.castShadow = true;
    cane.add(handle);
    tr.root.add(cane);

    // ---- wizard: wide robe, long beard, drooping hat, gnarled staff with a glowing crystal ----
    const ROBE = 0x2c1a28, ROBE_HI = 0x45293e, BEARD = 0xcfc8bb;
    const wz = person({ x: 0, z: -2.25, hip: 0.4, lean: 0.12, legs: ROBE });
    wz.root.add(cyl(0.32, 0.78, 0.5, 10, ROBE, 0, 0.25, 0.15)); // robe spread on the ground
    wz.root.add(cyl(0.79, 0.81, 0.05, 10, ROBE_HI, 0, 0.025, 0.15)); // hem
    wz.torso.add(cyl(0.17, 0.27, 0.6, 8, ROBE, 0, 0.3, 0));
    wz.torso.add(box(0.36, 0.08, 0.3, ROBE_HI, 0, 0.58, 0)); // shoulders
    wz.torso.add(box(0.36, 0.05, 0.3, CLOTH_DARK, 0, 0.12, 0)); // rope belt
    const beard = cone(0.15, 0.5, 6, BEARD, 0, -0.14, 0.1);
    beard.rotation.x = Math.PI + 0.15;
    wz.head.add(beard);
    wz.head.add(box(0.18, 0.045, 0.04, BEARD, 0, 0.06, 0.13)); // moustache
    wz.head.add(box(0.2, 0.035, 0.03, BEARD, 0, 0.18, 0.125)); // eyebrows
    wz.head.add(box(0.28, 0.34, 0.06, 0x9a948c, 0, 0.06, -0.12)); // long hair
    const hat = group(0, 0.26, 0);
    hat.add(cyl(0.4, 0.4, 0.03, 12, ROBE_HI, 0, 0, 0));
    hat.add(cyl(0.13, 0.2, 0.22, 8, ROBE_HI, 0, 0.12, 0));
    hat.add(cyl(0.135, 0.205, 0.04, 8, CLOTH_DARK, 0, 0.04, 0)); // band
    const tip = cone(0.13, 0.36, 7, ROBE_HI, 0, 0.36, -0.08);
    tip.rotation.x = -0.6; // droops back
    hat.add(tip);
    wz.head.add(hat);
    sleeve(wz.arms[0], ROBE, true);
    sleeve(wz.arms[1], ROBE, true);
    wz.arms[1].rotation.set(-0.5, 0, -0.35); // right hand on the staff
    const staff = group(0.55, 0, 0.3);
    const WOOD = 0x55341d;
    [[0.035, 0.7, 0.35, 0.05], [0.032, 0.62, 1.0, -0.07], [0.03, 0.5, 1.55, 0.06]].forEach(([r, h, y, tilt]) => {
      const seg = cyl(r * 0.85, r, h, 5, WOOD, 0, y, 0);
      seg.rotation.z = tilt;
      staff.add(seg);
    });
    staff.add(box(0.07, 0.06, 0.07, WOOD, 0.01, 0.7, 0)); // knots
    staff.add(box(0.06, 0.05, 0.06, WOOD, -0.01, 1.3, 0));
    for (const s of [-1, 1]) { // the crook that cradles the crystal
      const prong = cyl(0.014, 0.022, 0.24, 4, WOOD, s * 0.05, 1.88, 0);
      prong.rotation.z = -s * 0.45;
      staff.add(prong);
    }
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0xf8b347 }));
    crystal.position.y = 1.95;
    staff.add(crystal);
    const crystalLight = new THREE.PointLight(0xf8b347, 0.6, 2.5, 2);
    crystalLight.position.y = 1.95;
    staff.add(crystalLight);
    wz.root.add(staff);

    // ---- fighter: red jacket with leather shoulder pads, hair in a bun, sword on the back, pack beside ----
    const RED = 0x6e2a1f, LEATHER = 0x55341d;
    const fi = person({ x: 2.1, z: 0.35, hip: 0.32, lean: 0.25, legs: CLOTH_DARK });
    fi.torso.add(box(0.42, 0.58, 0.26, RED, 0, 0.29, 0));
    fi.torso.add(box(0.44, 0.06, 0.28, CLOTH_DARK, 0, 0.06, 0)); // belt
    fi.torso.add(box(0.06, 0.06, 0.02, 0x9a948c, 0, 0.06, 0.145)); // buckle
    fi.torso.add(box(0.3, 0.07, 0.28, CLOTH_DARK, 0, 0.6, 0)); // collar
    fi.torso.add(box(0.06, 0.6, 0.02, LEATHER, 0.08, 0.32, 0.135)); // sword strap
    for (const s of [-1, 1]) {
      const pad = box(0.17, 0.08, 0.22, LEATHER, s * 0.25, 0.57, 0);
      pad.rotation.z = s * 0.3;
      fi.torso.add(pad);
    }
    fi.head.add(box(0.26, 0.08, 0.26, DARK, 0, 0.27, -0.01));
    fi.head.add(box(0.26, 0.2, 0.06, DARK, 0, 0.16, -0.12));
    fi.head.add(box(0.27, 0.12, 0.05, DARK, 0, 0.2, 0.1)); // fringe
    fi.head.add(mesh(new THREE.DodecahedronGeometry(0.085), DARK, 0, 0.33, -0.08)); // bun
    fi.head.add(box(0.1, 0.03, 0.1, RED, 0, 0.27, -0.08)); // hair tie
    sleeve(fi.arms[0], RED);
    sleeve(fi.arms[1], RED);
    fi.arms[0].rotation.set(-1.2, 0, 0.12); // arms on the knees
    fi.arms[1].rotation.set(-1.2, 0, -0.12);
    const sword = group(0.05, 0.3, -0.16);
    sword.rotation.z = 0.55;
    sword.add(box(0.06, 0.8, 0.02, 0x9a948c, 0, 0, 0));
    sword.add(box(0.07, 0.62, 0.03, LEATHER, 0, -0.08, -0.01)); // scabbard
    sword.add(box(0.22, 0.04, 0.05, LEATHER, 0, 0.42, 0));
    sword.add(box(0.04, 0.18, 0.04, CLOTH_DARK, 0, 0.53, 0));
    sword.add(box(0.06, 0.05, 0.06, 0x9a948c, 0, 0.64, 0)); // pommel
    fi.torso.add(sword);
    const pack = group(-0.62, 0, -0.3);
    pack.rotation.y = -0.4;
    pack.add(box(0.36, 0.42, 0.24, 0x3a2416, 0, 0.21, 0));
    pack.add(box(0.37, 0.12, 0.26, LEATHER, 0, 0.38, 0.01)); // flap
    pack.add(box(0.04, 0.42, 0.26, CLOTH_DARK, -0.1, 0.21, 0.01)); // straps
    pack.add(box(0.04, 0.42, 0.26, CLOTH_DARK, 0.1, 0.21, 0.01));
    const roll = cyl(0.11, 0.11, 0.46, 8, 0x31445e, 0, 0.53, 0);
    roll.rotation.z = Math.PI / 2;
    pack.add(roll);
    fi.root.add(pack);

    return { traveler: tr, wizard: wz, fighter: fi, crystal, crystalLight };
  }

  window.CampFigures = { build };
})();
