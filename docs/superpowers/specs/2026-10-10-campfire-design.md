# Campfire — design

An ambience page for the table: the party around a campfire in a forest at night, pixel-art style,
drawn with three.js. Put it on a screen or TV and let it run. Art reference: a pixel scene of a
traveler, a wizard and a fighter around a fire under a moon.

## Page

- `campfire/index.html` → `/campfire/`, with a card on the landing page.
- The canvas fills the window. A small "← All tools" link and a ⛶ fullscreen button sit in a corner
  and fade after 3 s without mouse movement or touch.
- No Nimble text, so no license notice or footer (like Chong's Tracker). Own look: no `nimble.css`.
- Zero-install: three.js r153 (`three.min.js`, the UMD build, so it loads from `file://`) is copied
  into `campfire/vendor/` from Chong Die's dependency, with its MIT license. The only library on the
  site besides the Owlbear SDK; no build step.

## Scene

- A dirt clearing; a ring of stones and two logs around the fire.
- A ring of low-poly trees (trunk + stacked cones) fading into blue fog; moon and stars above.
- Three fixed seated figures from primitives: a **traveler** (coat, red scarf, leaning on a cane),
  a **wizard** (pointed hat, beard, robe, staff with a glowing crystal), a **fighter** (topknot,
  sword on the back, arms on knees).

## Pixel look

- The scene renders at ~180 px tall (width by aspect) into a render target, then a full-screen pass
  snaps every pixel to a fixed palette (sampled from the reference: night blues and greens, browns,
  fire oranges) with a light 4×4 ordered dither, drawn to the canvas with no smoothing.
- Flat-shaded low-poly materials give hard colour steps.

## Animation

- Fire: flame cones flicker and change shape; the fire's point light pulses in brightness and
  colour, so the light and shadows on the figures waver.
- Embers rise, drift and fade; smoke puffs rise, grow and thin out.
- Figures breathe. Idle moments on their own schedules: the traveler shifts on the cane and turns
  to look at the others; the wizard's crystal pulses and they reach a hand toward the fire; the
  fighter nods off and jerks awake.
- Treetops sway; stars twinkle; now and then fireflies drift at the forest edge.
- The camera drifts slowly side to side.

## Code

- `anim.js` (browser global `CampAnim`, CommonJS for tests): pure timing math — seeded random,
  smooth noise, flicker, breathing, idle envelopes, ember/smoke paths, render size, the palette.
  Tested in `campfire/tests/anim.test.js` (part of `npm test`).
- `scene.js` (global `CampScene`): builds the world and returns the parts that move.
- `app.js`: renderer, the pixel pass, the animation loop, the corner controls.
