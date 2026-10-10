// Campfire: small touches: sparks that land and glow on the ground, the stew's smell curling up as wavy
// lines, music notes floating up from the guitar. Browser global `CampExtras`.
(function () {
  'use strict';
  const A = window.CampAnim;

  function build(kit) {
    const { THREE, scene, particles } = kit;

    // sparks that land on the ground and glow for a moment
    const SPARKS = 9;
    const ground = particles(SPARKS, 0xe8812c, 1.5);

    // the stew's smell: three wavy lines curling up from the pot
    const SMELL = 3, PTS = 10;
    const smell = Array.from({ length: SMELL }, () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(PTS * 3), 3));
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xcfc8bb, transparent: true, depthWrite: false }));
      l.frustumCulled = false;
      scene.add(l);
      return l;
    });

    // music notes: a ♪ drawn once, on sprites that float up and fade
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(9, 2, 2, 10); // stem
    x.fillRect(10, 2, 4, 2); // flag
    x.beginPath();
    x.ellipse(7, 12, 3, 2.3, -0.4, 0, Math.PI * 2);
    x.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    const notes = Array.from({ length: 6 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xf8b347, transparent: true, alphaTest: 0.3, depthWrite: false }));
      s.scale.set(0.16, 0.16, 1);
      s.visible = false;
      scene.add(s);
      return s;
    });

    // every frame. o: { fuel 0–1, pot (Vector3), musicAt: where the music comes from (Vector3 or null) }
    function update(t, o) {
      const gp = ground.geometry.attributes.position, gc = ground.geometry.attributes.color, gb = ground.userData.base;
      for (let i = 0; i < SPARKS; i++) {
        const k = Math.floor(t / 0.45) - i, r = A.rng(k * 37 + 101);
        const land = k * 0.45 + r() * 0.4, age = t - land, a = r() * Math.PI * 2, rad = 0.78 + r() * 0.9;
        const keep = r() < 0.35 + 0.65 * o.fuel; // fewer when the fire is low
        const glow = keep && age >= 0 && age < 1.6 ? Math.pow(1 - age / 1.6, 1.5) * (0.7 + 0.3 * A.noise1(t * 10 + i, 1400)) : 0;
        gp.setXYZ(i, Math.cos(a) * rad, 0.03, Math.sin(a) * rad);
        gc.setXYZ(i, gb.r * glow, gb.g * glow, gb.b * glow);
      }
      gp.needsUpdate = gc.needsUpdate = true;

      smell.forEach((l, i) => {
        const age = ((t / 3.2 + i / SMELL) % 1), p = l.geometry.attributes.position;
        for (let j = 0; j < PTS; j++) {
          const h = (j / (PTS - 1)) * (0.25 + 0.45 * age);
          p.setXYZ(j, o.pot.x + (i - 1) * 0.07 + 0.035 * Math.sin(h * 16 - t * 3 + i * 2), o.pot.y + 0.08 + h + 0.3 * age, o.pot.z + 0.02 * Math.cos(h * 11 + i));
        }
        p.needsUpdate = true;
        l.material.opacity = 0.32 * Math.sin(Math.PI * age);
      });

      const recent = o.musicAt ? A.events(t - 2.4, t).filter((e) => e.type === 'strum' && (e.beat === 0 || e.beat === 3)) : [];
      notes.forEach((s, i) => {
        const e = recent[recent.length - 1 - i];
        s.visible = !!e;
        if (!e) return;
        const age = t - e.time;
        s.position.set(o.musicAt.x + 0.15 * Math.sin(age * 3 + e.chord * 1.7 + e.beat), o.musicAt.y + 0.12 + age * 0.35, o.musicAt.z);
        s.material.opacity = 1 - age / 2.4;
      });
    }
    return { update };
  }

  window.CampExtras = { build };
})();
