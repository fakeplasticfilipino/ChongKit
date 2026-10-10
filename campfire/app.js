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

  const world = CampScene.build(THREE);
  const target = new THREE.WebGLRenderTarget(320, 180, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });

  // The pixel pass: every pixel snaps to the nearest palette colour, with a light 4×4 ordered dither.
  const palette = A.PALETTE.map((c) => new THREE.Vector3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255));
  while (palette.length < 32) palette.push(palette[0].clone());
  const pass = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: target.texture },
      palette: { value: palette },
      count: { value: A.PALETTE.length },
      dither: { value: 0.035 },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tScene; uniform vec3 palette[32]; uniform int count; uniform float dither;
      varying vec2 vUv;
      float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
      float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      void main() {
        vec3 c = texture2D(tScene, vUv).rgb;
        c = pow(max(c, 0.0), vec3(1.0 / 2.2)); // linear → screen
        c += (bayer4(gl_FragCoord.xy) - 0.5) * dither;
        vec3 best = palette[0]; float bd = 1e9;
        for (int i = 0; i < 32; i++) {
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
    world.camera.aspect = s.w / s.h;
    // Narrower than 16:9 (phones, portrait): widen the view so all three still fit side to side.
    const wide = 2 * Math.atan(Math.tan((46 * Math.PI) / 360) * (16 / 9));
    world.camera.fov = world.camera.aspect >= 16 / 9 ? 46 : Math.min(110, (360 / Math.PI) * Math.atan(Math.tan(wide / 2) / world.camera.aspect));
    world.camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function frame(ms) {
    world.update(ms / 1000);
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
