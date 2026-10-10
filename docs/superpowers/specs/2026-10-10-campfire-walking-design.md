# Campfire — walking around the camp

Take one of the three characters, stand them up, and walk around the clearing. A limited area on
purpose: the clearing and the camp's edge, up to the treeline.

## Controls

- **Walk** button in the corner (fades like the others), or **E**: the last character you clicked (the
  traveler if none) stands up and you control them. Press again (or the button, now **Sit**) and they
  walk back to their seat and sit down.
- **WASD / arrow keys** move, relative to the camera; **Shift** runs. On touch screens a joystick
  appears bottom-left while walking. Dragging still turns the camera (now around the walker).
- Clicking the others still starts their stories.

## How it looks

- The camera follows behind, low and close, easing in from the campfire view and back out.
- Legs get real hips and knees: seated poses stay as they are, standing straightens them, walking swings
  them (arms swing too). The wizard's robe hangs long when standing; the staff comes along. The
  traveler's cane stays leaning at the log; the samurai's pack stays on the ground.
- While someone walks, their own stories, talks and sounds pause; the others carry on, and turn to look
  at the walker when they come close.
- Footsteps: leaves crunching in autumn, snow squeaking in winter, soft grass otherwise.

## Limits

- Blocked by the fire, the seats and seated characters, the tent, the horse, the lantern post, the
  fallen log and the bushes; an invisible edge at the treeline.
- Walking back to the seat steers straight there, sliding around obstacles; if it takes too long the
  character simply settles into the seat.

## Code

- `anim.js`: `collide` (push a circle out of others and keep it inside the edge) and `gait` (leg and
  arm swing for a step phase), tested.
- `figures.js`: jointed legs (hip → thigh → knee → shin → foot) with seated and standing poses.
- `walk.js` (global `CampWalk`): input, the walker's state (standing up, walking, going back, sitting
  down), moving and posing the walker, the follow camera, footsteps.
- `scene.js`: obstacles, pausing the walker's stories, others looking at the walker.
