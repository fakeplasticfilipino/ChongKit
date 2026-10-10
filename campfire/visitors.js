// Campfire: forest visitors: a fox that sits to watch the fire, a deer between the far trees, an owl on top of
// the lantern post. Their comings and goings are CampAnim.foxAt / deerAt; the owl hoots on CampAnim.owls.
// Browser global `CampVisitors`. `kit` holds scene.js's helpers.
(function () {
  'use strict';
  const A = window.CampAnim;
  const FOX = 0xc8561b, FOX_DK = 0x6e2a1f, WHITE = 0xe8e2d4, DARK = 0x150e0b, DEER = 0x96603a, DEER_DK = 0x744726;

  function build(kit) {
    const { THREE, scene, box, cone, group } = kit;
    const leg = (parent, x, y, z, h, w, color) => {
      const g = group(x, y, z);
      g.add(box(w, h, w, color, 0, -h / 2, 0));
      parent.add(g);
      return g;
    };

    // ---- the fox (front is +z) ----
    const fox = group(0, 0, 0);
    const foxBody = group(0, 0.3, 0);
    foxBody.add(box(0.2, 0.18, 0.5, FOX, 0, 0, 0));
    foxBody.add(box(0.14, 0.12, 0.2, WHITE, 0, -0.04, 0.16)); // chest
    fox.add(foxBody);
    const foxLegs = [[-0.06, 0.2], [0.06, 0.2], [-0.06, -0.18], [0.06, -0.18]].map(([x, z]) => leg(fox, x, 0.26, z, 0.26, 0.05, DARK));
    const foxHead = group(0, 0.42, 0.26);
    foxHead.add(box(0.17, 0.15, 0.16, FOX, 0, 0, 0));
    foxHead.add(box(0.08, 0.07, 0.14, FOX, 0, -0.03, 0.13)); // snout
    foxHead.add(box(0.035, 0.03, 0.03, DARK, 0, -0.01, 0.2)); // nose
    foxHead.add(box(0.1, 0.05, 0.05, WHITE, 0, -0.06, 0.1)); // white muzzle
    for (const s of [-1, 1]) {
      foxHead.add(cone(0.04, 0.1, 4, FOX_DK, s * 0.055, 0.12, -0.02)); // ears
      foxHead.add(box(0.025, 0.025, 0.02, 0xf8b347, s * 0.045, 0.03, 0.08)); // eyes catch the firelight
    }
    fox.add(foxHead);
    const foxTail = group(0, 0.32, -0.25);
    foxTail.add(box(0.11, 0.11, 0.3, FOX, 0, 0, -0.15));
    foxTail.add(box(0.1, 0.1, 0.08, WHITE, 0, 0, -0.32)); // white tip
    fox.add(foxTail);
    fox.visible = false;
    scene.add(fox);

    // ---- the deer ----
    const deer = group(0, 0, 0);
    const deerBody = group(0, 0.85, 0);
    deerBody.add(box(0.28, 0.32, 0.8, DEER, 0, 0, 0));
    deerBody.add(box(0.12, 0.1, 0.06, WHITE, 0, 0.08, -0.42)); // white tail
    deer.add(deerBody);
    const deerLegs = [[-0.09, 0.3], [0.09, 0.3], [-0.09, -0.3], [0.09, -0.3]].map(([x, z]) => leg(deer, x, 0.72, z, 0.72, 0.06, DEER_DK));
    const deerNeck = group(0, 0.95, 0.35);
    deerNeck.add(box(0.13, 0.45, 0.15, DEER, 0, 0.2, 0));
    const deerHead = group(0, 0.45, 0.04);
    deerHead.add(box(0.14, 0.14, 0.3, DEER, 0, 0, 0.08));
    deerHead.add(box(0.06, 0.05, 0.04, DARK, 0, -0.02, 0.24)); // nose
    const glint = new THREE.MeshBasicMaterial({ color: 0xf8b347 });
    for (const s of [-1, 1]) { // eyes that catch the firelight
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), glint);
      e.position.set(s * 0.07, 0.03, 0.12);
      deerHead.add(e);
    }
    const deerEars = [-1, 1].map((s) => {
      const e = group(s * 0.08, 0.06, -0.02);
      e.add(box(0.1, 0.05, 0.03, DEER, s * 0.05, 0, 0));
      deerHead.add(e);
      return e;
    });
    for (const s of [-1, 1]) { // antlers
      const a = group(s * 0.04, 0.08, 0);
      a.rotation.z = -s * 0.4;
      a.add(box(0.02, 0.28, 0.02, 0xcfc8bb, 0, 0.14, 0));
      a.add(box(0.02, 0.12, 0.02, 0xcfc8bb, s * -0.04, 0.2, 0.05));
      deerHead.add(a);
    }
    deerNeck.add(deerHead);
    deer.add(deerNeck);
    deer.visible = false;
    scene.add(deer);

    // ---- the owl, on top of the lantern post (lit from below by the lantern) ----
    const PERCH = new THREE.Vector3(1.55, 1.8, -5.25);
    const owl = group(PERCH.x, PERCH.y, PERCH.z);
    owl.rotation.y = Math.atan2(-PERCH.x, -PERCH.z) + 0.35; // toward the camp, a little toward you
    const owlBody = group(0, 0, 0);
    owlBody.add(box(0.2, 0.26, 0.18, 0x55341d, 0, 0.13, 0));
    owlBody.add(box(0.14, 0.16, 0.02, 0x96603a, 0, 0.11, 0.09)); // pale breast
    owl.add(owlBody);
    const owlHead = group(0, 0.27, 0);
    owlHead.add(box(0.2, 0.15, 0.17, 0x55341d, 0, 0.07, 0));
    owlHead.add(box(0.16, 0.11, 0.02, 0x96603a, 0, 0.06, 0.085)); // face disc
    const owlEyes = new THREE.MeshBasicMaterial({ color: 0xf8b347 });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), owlEyes);
      eye.position.set(s * 0.048, 0.07, 0.095);
      owlHead.add(eye);
      owlHead.add(cone(0.03, 0.07, 4, 0x3a2416, s * 0.07, 0.17, 0)); // ear tufts
    }
    owlHead.add(cone(0.015, 0.035, 4, 0x3a2416, 0, 0.035, 0.1)); // beak
    owl.add(owlHead);
    scene.add(owl);

    // ---- every frame. Returns where the fox and deer are, for the figures' glances. ----
    // fox / deer: where to look; foxLook / deerLook: how much it's worth looking (eases in and out)
    const out = { fox: null, deer: null, foxLook: 0, deerLook: 0, owl: PERCH };
    const foxAt = new THREE.Vector3(), deerAt = new THREE.Vector3();
    let spooked = null;
    function update(t, walker) {
      const f = A.foxAt(t);
      let fx = f;
      if (f && walker) {
        if (!spooked && f.sit > 0.5 && Math.hypot(f.x - walker.at[0], f.z - walker.at[1]) < 2.5) spooked = { t, x: f.x, z: f.z, yaw: Math.atan2(f.x - walker.at[0], f.z - walker.at[1]) };
      }
      if (spooked && (!f || t < spooked.t)) spooked = null; // the visit ended (or the clock jumped back)
      if (f && spooked) {
        const u = t - spooked.t;
        fx = u > 2.5 ? null : { ...f, x: spooked.x + Math.sin(spooked.yaw) * 2.4 * u, z: spooked.z + Math.cos(spooked.yaw) * 2.4 * u, yaw: spooked.yaw, sit: 0, walk: 1, local: -1 };
      }
      fox.visible = !!fx;
      out.fox = null;
      out.foxLook = 0;
      if (fx) {
        fox.position.set(fx.x, 0, fx.z);
        fox.rotation.y = fx.yaw;
        const step = Math.sin(t * 14) * fx.walk;
        foxLegs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? 1 : -1) * 0.5 * step; });
        foxLegs[2].rotation.x += -1.2 * fx.sit; // hind legs fold to sit
        foxLegs[3].rotation.x += -1.2 * fx.sit;
        foxBody.rotation.x = -0.55 * fx.sit;
        foxBody.position.y = 0.3 - 0.05 * fx.sit;
        foxHead.position.set(0, 0.42 + 0.14 * fx.sit, 0.26 - 0.06 * fx.sit);
        foxHead.rotation.y = fx.sit * 0.5 * Math.sin(t * 0.6 + Math.floor(t / 4) * 2.1); // looks around the camp
        foxHead.rotation.x = fx.walk * 0.1 * Math.sin(t * 14);
        foxTail.position.y = 0.32 - 0.22 * fx.sit;
        foxTail.rotation.set(0.4 * fx.sit, 0.5 * fx.sit * Math.sin(t * 1.3) + 0.3 * fx.walk * Math.sin(t * 7), 0); // swish
        out.fox = foxAt.set(fx.x, 0.4, fx.z);
        out.foxLook = A.win(fx.local, 6, 27, 1.2);
      }
      const d = A.deerAt(t);
      deer.visible = !!d;
      out.deer = null;
      out.deerLook = 0;
      if (d) {
        deer.position.set(d.x, d.bound ? 0.35 * Math.abs(Math.sin(t * 6)) : 0, d.z);
        deer.rotation.y = d.yaw;
        const step = Math.sin(t * (d.bound ? 12 : 5)) * (d.walk + d.bound);
        deerLegs.forEach((l, i) => { l.rotation.x = d.bound ? (i < 2 ? -0.7 : 0.7) * Math.abs(step) : (i === 0 || i === 3 ? 1 : -1) * 0.35 * step; });
        deerNeck.rotation.x = d.bound ? -0.2 : d.alert > 0.9 ? -0.25 : 0.2 - 0.6 * (1 - d.alert) * (d.walk ? 0 : 1) * 0.5;
        deerEars.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (0.3 + 0.4 * A.envelope(t + i, 3.1, 1, 0.4)); });
        out.deer = deerAt.set(d.x, 1.2, d.z);
        out.deerLook = A.win(d.local, 4.5, 16, 0.8);
      }
      // owl: snaps its head round, blinks, bobs when it hoots
      const near = walker && Math.hypot(walker.at[0] - PERCH.x, walker.at[1] - PERCH.z) < 1.5;
      const look = near ? Math.atan2(walker.at[0] - PERCH.x, walker.at[1] - PERCH.z) - owl.rotation.y : Math.round(A.noise1(t * 0.25, 1300) * 2.4) * 0.55;
      owlHead.rotation.y += (look - owlHead.rotation.y) * 0.35;
      const blink = A.envelope(t, 4.3, 2, 0.18) > 0.2 || A.envelope(t, 11.7, 6, 0.15) > 0.2;
      owlEyes.color.setHex(blink ? 0x55341d : 0xf8b347);
      const hoot = A.owls(t - 1.5, t).length ? 1 : 0;
      owlBody.scale.y = 1 + 0.08 * hoot * Math.abs(Math.sin(t * 9));
      owlHead.position.y = 0.27 + 0.02 * hoot * Math.abs(Math.sin(t * 9));
      return out;
    }

    return { update };
  }

  window.CampVisitors = { build };
})();
