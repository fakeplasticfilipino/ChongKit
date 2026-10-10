# Campfire — walk-up interactions and secrets

The players open the Campfire on their own devices and play with it: walking, clicking, finding
surprises. This gives the walker things to do around the camp and secrets to find at the clearing's
edge, with a quiet tally of what each device has found. Still offline, still no menus.

Built in two parts from one spec: **part 1** the spot system and the camp interactions, **part 2** the
secrets and the tally.

## Controls

- While walking, the nearest **spot** in reach shows a small floating hint over it: `F · Pet`. **F**
  does it. On touch screens the hint is a button: tap it. No hint while seated, standing up or walking
  back to the seat.
- E stays Walk / Sit; WASD / arrows / Shift / 1–3 / the joystick are unchanged.
- During an action the walker stands still; moving cancels it (the prop eases back). Sitting lasts
  until the player moves or presses F again.
- Clicking the seated characters and the fire still starts their stories, as now.
- The tally (`3 / 13`) shows in the corner only while walking, fading with the other corner controls.

## Part 1: camp interactions

| Spot | Hint | What happens |
|---|---|---|
| Horse | Pet / Apple | Alternating each use. Pet: the walker strokes its neck; the horse lowers its head, nuzzles, snorts. Apple: the walker holds out an apple; the horse eats it, chewing sound |
| Stew pot | Stew | The walker ladles a bowl, then sits on the ground by the pot eating it (bowl steams, spoon sound) until they move |
| Fallen log, a rock at the edge | Sit | The walker sits; the follow camera lowers and settles; the seated ones glance over |
| Fire | Twig / Warm | Alternating each use. Twig: the existing twig toss (flare, sparks, sounds, same `land` event). Warm: hands held out to the fire, breath steams in winter |
| Tent | Peek | The walker bends into the doorway; the candle flickers brighter; they duck back out |
| A seated companion | Talk | If free (not in a story or talk): they turn to the walker, a short wordless murmur back and forth (the existing syllable sounds), ending in a nod or a laugh. If busy: a glance only |

Visitors: the owl on the lantern post snaps its head to a walker who comes within 1.5 m; the fox, if
sitting, gets up and trots off (its path ends early) when a walker comes within 2.5 m.

## Part 2: secrets

Thirteen secrets, each a spot near the treeline or behind bushes, out of the starting view, all
inside the walking edge and clear of the camera's circle (radius 4.7) where it matters for the view.
Twelve are always there; the seasonal one shows the current season's (`CampAnim.season`, `?season=`).

| Group | Secret | Hint | What happens |
|---|---|---|---|
| Nature | Mushroom ring | (none: step in) | Stepping inside makes the caps glow and sparkle, a soft chime |
| Nature | Sleeping hedgehog under a bush | Look | It uncurls, sniffs, curls back up |
| Nature | Bird's nest on a low branch | Look | A chick peeps up, cheeps, ducks |
| Relics | Mossy shrine | Pray | The walker bows; its candle lights itself and burns for a minute |
| Relics | Sword in a stump | Pull | The walker tugs twice; it doesn't budge; a creak |
| Relics | Carved initials on a tree | Read | The walker leans in; the carving catches the firelight |
| Spooky | Will-o'-wisp | (none: come close) | A pale light hovering at the edge drifts away and fades when approached, back a while later |
| Spooky | Skull in the leaves | Look | The walker crouches; a beetle crawls out of an eye |
| Spooky | Ring of standing stones | (none: step in) | A low hum swells; faint runes glow on the stones |
| Seasonal | Snowman (winter) | Look | Its stick arm drops off; the walker puts it back |
| Seasonal | Pumpkin (autumn) | Look | A candle inside flickers on; a grin glows |
| Seasonal | Flower crown (spring) | Wear | The walker wears it until they sit back down |
| Seasonal | Jar of fireflies (summer) | Open | The fireflies spill out and drift off into the trees |

**Found** means the action ran (or the walker stepped in / came close for the hintless ones). The
first find of each plays a small rising chime; repeats play the action without it.

## Tally

- Saved per device in localStorage `chongkit.campfire.found`: a JSON list of secret ids. Read through
  `CampAnim.readFound` (drops unknown ids and duplicates, returns `[]` for anything broken); written on
  each new find. If storage throws or is missing, the tally lives in memory for the visit only.
- Shown as `found / 13`; the four seasonal secrets each count once, so finding all thirteen takes a year.

## Code

- `anim.js` (pure, tested): `nearestSpot(x, z, spots)` (closest spot whose reach contains the point,
  ties to the first), action envelopes (`ACTIONS`: duration and keyframe timing per action),
  `inside(x, z, spot)` for the step-in secrets, `SECRETS` (ids, groups, seasons), `readFound(text)`.
- `interact.js` (global `CampInteract`): the camp spot list, the hint (one DOM element placed by
  projecting the spot to the screen; text set with `textContent`), F and tap, running an action:
  posing the walker, the prop's reaction, the sound events.
- `secrets.js` (global `CampSecrets`): builds the secrets' meshes (low-poly, flat-shaded, palette
  colours), their spots, their reactions, and the tally (element + storage).
- `walk.js`: `hold()` / `release()` so an action can keep the walker still; reports movement so an
  action can cancel; a sitting pose on spots.
- `scene.js`: the new props and secrets join the obstacle list where they block (shrine, stump,
  stones, snowman, pumpkin; not the mushrooms); visitors react to the walker.
- `audio.js`: snort, chewing, spoon on a bowl, tent flap, chime, hum, wisp whisper, creak, cheep —
  all generated, timing from `anim.js` events like the rest.
- CLAUDE.md's Campfire rule 3 gains the F key, the hint button and the tally; README and TRACKER updated.

## Tests

`nearestSpot` (out of reach, closest wins, ties), `inside`, action envelopes (start, end, cancel),
`SECRETS` (13 ids, one seasonal per season, all inside the walking edge), `readFound` (good list,
unknown ids, duplicates, broken JSON, non-list). Each interaction and secret checked by walking to it
in the browser pane.
