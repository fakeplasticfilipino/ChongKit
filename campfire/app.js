// Campfire: renders the scene small, snaps it to the palette, and runs the loop.
(function () {
  'use strict';
  const A = window.CampAnim;
  const canvas = document.getElementById('scene');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  } catch (e) {
    document.body.classList.add('nogl');
    return;
  }
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap; // hard-edged shadows suit pixels

  // The season comes from the calendar; ?season=winter (spring, summer, autumn) previews another.
  const params = new URLSearchParams(location.search);
  const season = A.SEASONS.includes(params.get('season')) ? params.get('season') : A.season(new Date().getMonth());
  const world = CampScene.build(THREE, { season });
  CampAudio.season = season;
  const target = new THREE.WebGLRenderTarget(384, 216, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  target.depthTexture = new THREE.DepthTexture(384, 216); // for the outlines

  // The pixel pass: a dark outline around near things (where the depth jumps), then every pixel
  // snaps to the nearest palette colour, with a light 4×4 ordered dither.
  const MAXP = 48;
  const palette = A.PALETTE.map((c) => new THREE.Vector3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255));
  while (palette.length < MAXP) palette.push(palette[0].clone());
  const pass = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: target.texture },
      palette: { value: palette },
      count: { value: A.PALETTE.length },
      dither: { value: 0.035 },
      tDepth: { value: target.depthTexture },
      near: { value: world.camera.near },
      far: { value: world.camera.far },
      texel: { value: new THREE.Vector2(1 / 384, 1 / 216) },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tScene; uniform vec3 palette[48]; uniform int count; uniform float dither;
      uniform sampler2D tDepth; uniform float near; uniform float far; uniform vec2 texel;
      varying vec2 vUv;
      float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
      float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      float dist(vec2 uv) {
        float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
        return 2.0 * near * far / (far + near - z * (far - near));
      }
      void main() {
        float d = dist(vUv);
        float n = min(min(dist(vUv + vec2(texel.x, 0.0)), dist(vUv - vec2(texel.x, 0.0))),
                      min(dist(vUv + vec2(0.0, texel.y)), dist(vUv - vec2(0.0, texel.y))));
        if (n < 9.0 && d - n > 0.3 + 0.08 * n) { gl_FragColor = vec4(0.059, 0.043, 0.039, 1.0); return; } // outline
        vec3 c = texture2D(tScene, vUv).rgb;
        c = pow(max(c, 0.0), vec3(1.0 / 2.2)); // linear → screen
        vec2 q = (vUv - 0.5) * vec2(texel.y / texel.x, 1.0);
        c *= 1.0 - 0.55 * smoothstep(0.35, 0.95, length(q)); // dark corners, like the reference
        c += (bayer4(gl_FragCoord.xy) - 0.5) * dither;
        vec3 best = palette[0]; float bd = 1e9;
        for (int i = 0; i < 48; i++) {
          if (i >= count) break;
          vec3 d = (c - palette[i]) * vec3(0.9, 1.1, 0.7);
          float dd = dot(d, d);
          if (dd < bd) { bd = dd; best = palette[i]; }
        }
        gl_FragColor = vec4(best, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const post = new THREE.Scene();
  post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pass));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function resize() {
    const s = A.renderSize(window.innerWidth, window.innerHeight);
    renderer.setSize(s.w, s.h, false);
    target.setSize(s.w, s.h);
    pass.uniforms.texel.value.set(1 / s.w, 1 / s.h);
    world.camera.aspect = s.w / s.h;
    // Narrower than 16:9 (phones, portrait): widen the view so all three still fit side to side.
    const wide = 2 * Math.atan(Math.tan((44 * Math.PI) / 360) * (16 / 9));
    world.camera.fov = world.camera.aspect >= 16 / 9 ? 44 : Math.min(110, (360 / Math.PI) * Math.atan(Math.tan(wide / 2) / world.camera.aspect));
    world.camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Turning around the fire: drag (mouse or finger) to circle it; it eases to a stop and stays there.
  let view = { yaw: 0, pitch: 0.12, vyaw: 0, vpitch: 0 };
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now(), sx: e.clientX, sy: e.clientY, t0: performance.now() };
    view.vyaw = view.vpitch = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  // Where the pointer is, as -1 … 1 across the canvas (for picking).
  const toNdc = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1];
  };
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) { canvas.style.cursor = e.pointerType === 'mouse' && world.pick(...toNdc(e)) ? 'pointer' : ''; return; } // something to click
    if (e.pointerId !== drag.id) return;
    const now = performance.now(), dt = Math.max(1, now - drag.at) / 1000;
    const dyaw = (-(e.clientX - drag.x) / window.innerWidth) * Math.PI * 1.3;
    const dpitch = ((e.clientY - drag.y) / window.innerHeight) * 1.2;
    view.yaw += dyaw;
    view.pitch = Math.min(A.PITCH_MAX, Math.max(A.PITCH_MIN, view.pitch + dpitch));
    view.vyaw = 0.6 * view.vyaw + 0.4 * (dyaw / dt); // remembered for the glide after letting go
    view.vpitch = 0.6 * view.vpitch + 0.4 * (dpitch / dt);
    drag.x = e.clientX; drag.y = e.clientY; drag.at = now;
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (performance.now() - drag.at > 80) view.vyaw = view.vpitch = 0; // held still before letting go
    const click = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6 && performance.now() - drag.t0 < 500;
    drag = null;
    if (click && e.type === 'pointerup') { // a click, not a drag: whoever's under it does something
      view.vyaw = view.vpitch = 0;
      const who = world.pick(...toNdc(e));
      if (who) world.act(who, last);
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Sound is always on; browsers only allow it after the first click, tap or key.
  ['pointerdown', 'keydown', 'touchend'].forEach((e) => window.addEventListener(e, CampAudio.start, { passive: true }));

  // ?at=SECONDS starts the clock there (for checking a story without waiting for it)
  const START = Number(params.get('at')) || 0;
  let last = 0;
  function frame(ms) {
    const t = START + ms / 1000, dt = Math.min(0.1, t - last || 0);
    last = t;
    if (!drag) view = A.orbit(view, dt);
    world.update(t, view);
    CampAudio.update(t);
    renderer.setRenderTarget(target);
    renderer.render(world.scene, world.camera);
    renderer.setRenderTarget(null);
    renderer.render(post, postCam);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Corner controls fade out when the mouse rests.
  let idle;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(() => document.body.classList.add('idle'), 3000);
  }
  ['mousemove', 'pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, wake, { passive: true }));
  wake();

  const fs = document.getElementById('fullscreen');
  if (!document.fullscreenEnabled) fs.hidden = true;
  fs.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });
})();
