# Chong Die: design

Date: 2026-10-06 · Status: approved in chat, awaiting spec review

## What it is

Chong Die is ChongKit's fork of the official Owlbear Rodeo dice extension
([owlbear-rodeo/dice](https://github.com/owlbear-rodeo/dice), GPL-3.0). It keeps the 3D tray,
physics and party sync, and adds:

- an always-visible **command line** at the top of the tray that takes **Avrae-style** rolls (`!r …`);
- a **panel** of **tabs** and saved-roll **pills** that covers the tray;
- per tab, an **Instant** switch: pills either roll on click, or place their dice on the tray for you
  to throw.

It is an Owlbear tool like Chong's Tracker: system-agnostic, no Nimble text, Owlbear's look.

## Decisions (from the brainstorm)

| Topic | Decision |
|---|---|
| Where it lives | Inside ChongKit: source in `chong-die-src/`, built output in `chong-die/` |
| Build rule | Breaks "zero-install / no build step" on purpose; this one tool is a built TypeScript app |
| License | Stays GPL-3.0; source is public in the repo |
| Extra dice (reroll, explode) | Thrown physically in follow-up waves |
| Exploding dice look | The new die pops out of the exploded die's resting spot |
| Saved rolls | This browser only (localStorage), with Export/Import JSON |
| Instant vs place | A switch per tab |
| Panel after a roll | Stays hidden until you bring it back (sidebar button) |
| Command line | Always visible at the top; semi-transparent while dice roll |
| `!rr` / `!rrr` | Included |
| Odd dice sizes | d2 from a d4, d3 from a d6; any other size is a virtual die (flat chip, no 3D) |

Assumptions confirmed: everyone in the room sees rolls and results as today; saved rolls belong to
the player's browser; a typed command always rolls immediately.

## 1. Layout and interaction

```
┌──────┬───────────────────────────────┐
│ side │ [ !r 1d20+5 adv          ][★] │  ← command line, always on top
│ bar  ├───────────────────────────────┤
│      │ Attacks │ Spells │ Checks │ + │  ← tabs
│ dice │ ─────────────────── Instant ◉ │
│ style│ (Longsword) (Sneak Attack)    │  ← pills
│ hide │ (Fireball 8d6) (Init)         │
│ hist │                               │
│ ▤    │   …tray underneath…           │
└──────┴───────────────────────────────┘
```

- **Sidebar:** unchanged (dice style, hidden roll, history, party trays), plus a new **▤** button that
  shows/hides the panel. The upstream dice picker and roll controls stay usable for manual rolls.
- **Command line** (pinned top of the tray, over the 3D canvas):
  - Enter rolls immediately, panel open or not. `!r` is optional (`1d20+5` works).
  - ↑ / ↓ step through command history (this browser, last 50).
  - Parse errors show inline in red under the box; nothing rolls.
  - While dice are in motion it fades to ~40% opacity and passes clicks through to the tray; back to
    full on settle, hover or focus.
  - **★** saves the typed command as a pill in the current tab; asks for a name (default: the command).
- **Panel** (below the command line, covers the tray):
  - Tabs like the tracker's: **+** adds, double-click renames, **×** deletes (with confirm if it has
    pills), drag reorders.
  - Each tab has an **Instant** switch (default off = Place).
  - Pills wrap in rows. Click:
    - **Instant tab:** rolls the command now (same as typing it). Panel hides.
    - **Place tab:** the roll's wave-1 dice are loaded onto the tray (the upstream "selected dice"
      state), the panel hides, and the player throws with the normal Roll button / drag. Follow-up
      waves and the Avrae total still apply.
  - Right-click (long-press on touch) a pill: Edit (name, command), Delete.
  - Drag a pill to reorder, or onto another tab to move it.
  - Pill whose command no longer parses: red outline; clicking shows the error under the command line.
- **After a roll** the panel stays hidden; the result stays on the tray until the player brings the
  panel back with ▤.
- **Look:** Owlbear's dark MUI theme the extension already uses. No parchment, no `nimble.css`.

## 2. Roll engine (`chong-die-src/src/roll/`)

Pure TypeScript, no React, no three.js. Three steps:

### 2.1 Parse

Follows Avrae's `d20` library syntax:

| Feature | Syntax |
|---|---|
| Dice | `NdX`, `dX`, `d%` (= d100) |
| Keep / drop | `kh3`, `kl1`, `k>10`, `k<3`, `kN` (literal), `ph1`, `pl1`, `p<3` |
| Reroll | `rr1` (until not), `ro<3` (once), `ra6` (once, add) |
| Explode | `e6`, `e>5`; shorthand `dX!` = explode on max |
| Clamp | `mi2`, `ma5` |
| Math | `+ - * / // %`, parentheses, integer constants |
| Labels | `1d6[fire]` |
| Comment | trailing text after the expression: `!r 1d20+5 Perception` |
| Adv / dis | `adv` / `dis` keyword: the first d20 term becomes `2d20kh1` / `2d20kl1` |
| Repeat | `!rr N expr` rolls expr N times; `!rrr N expr DC` also checks each against DC |

Selectors `h`, `l`, `>`, `<` and literal numbers work wherever Avrae allows them. Unknown syntax is a
parse error with a short message (e.g. "Unknown die d0", "Expected a number after kh").
Limits: at most 100 dice in wave 1, N ≤ 25 for `!rr`/`!rrr`, X ≤ 1000.

### 2.2 Plan

Walks the tree and lists the physical dice wave 1 needs:

- d4, d6, d8, d10, d12, d20: one 3D die each.
- d100: the existing d100 + d10 pair.
- d2: a d4 read as `ceil(v/2)`; d3: a d6 read as `ceil(v/2)`.
- Any other size: a **virtual die**, rolled with `crypto.getRandomValues`, shown as a flat chip in the
  breakdown.

Each planned die carries the id of the term it belongs to, so values map back to the tree.

### 2.3 Evaluate

Takes the landed values and applies, in Avrae's order: rerolls, explosions, clamps, keep/drop, then
math. When rerolls or explosions need more dice it returns **wave N+1**: a list of new dice, each
tagged with its parent die and why (reroll / explode). The tray throws that wave; exploding dice spawn
at the parent's resting position with upward velocity and spin ("pop out"). Repeats until no more
dice are needed. Cap: 20 extra dice per roll (then stops and marks the roll "capped").

Output: total, plus an Avrae-style breakdown string, e.g.
`1d20 (~~4~~, **17**) + 5 = 22` · Perception. Dropped dice struck through, rerolled dice shown as
replaced, exploded dice shown with `!`. `!rrr` lists each roll with ✓ / ✗ against the DC and a count
of successes.

## 3. Integration with the upstream code

- The upstream `Dice` / `DiceRoll` types stay; Chong Die rolls use `combination: "NONE"` and no
  bonus, and attach the command and wave data alongside. The total and breakdown come from the roll
  engine, not `getCombinedDiceValue`, for Chong Die rolls (upstream rolls keep their old display).
- **Waves in the roll store:** `useDiceRollStore` gets an "add wave" action that adds dice to the
  current roll with given throws (for explode: starting position = parent's final transform).
- **Sync:** the existing player-metadata sync already shares dice and throws. It also sends the
  command text and every wave's throws, so other players replay the waves and show the same total and
  breakdown. Physics is deterministic, so values match.
- **History:** upstream history shows Chong Die rolls with the command and total.

## 4. Repo layout and build

```
chong-die-src/               fork of owlbear-rodeo/dice (TypeScript, GPL-3.0)
  src/roll/                  parser, planner, evaluator (pure TS) + *.test.ts (Vitest)
  src/chong/                 command line, panel, tabs, pills, saved-rolls store
  LICENSE                    GPL-3.0 (kept)
  NOTICE.md                  upstream link + what ChongKit changed
chong-die/                   built output, committed → /ChongKit/chong-die/
  manifest.json              Owlbear install link (absolute /ChongKit/chong-die/ paths)
  index.html, popover.html, background.html, assets/…
  TRACKER.md                 status and backlog (not published)
```

- Build: `cd chong-die-src && yarn && yarn build`. Vite `base: "/ChongKit/chong-die/"`,
  `outDir: "../chong-die"` (without wiping `TRACKER.md`).
- `chong-die-src/node_modules/` gitignored. `_config.yml` excludes `chong-die-src/`,
  `chong-die/TRACKER.md` and `docs/superpowers/`.
- About 11 MB of models, environment map and audio committed once; hashed names stay stable for
  unchanged files, so a rebuild adds only changed chunks.
- `manifest.json` `version` bumps on every change.
- Tests: `cd chong-die-src && yarn test` (Vitest). The ChongKit `node --test` command is unchanged.

## 5. Saved rolls

localStorage key `chongkit.chongdie`:

```json
{
  "version": 1,
  "tabs": [
    { "id": "t1", "name": "Rolls", "instant": false,
      "pills": [ { "id": "p1", "name": "Longsword", "command": "!r 1d20+5" } ] }
  ],
  "history": ["!r 1d20+5", "…"]
}
```

- Missing or corrupt: starts with one empty "Rolls" tab.
- ⋯ menu at the end of the tab strip: Export (downloads JSON), Import (replaces after confirm). Bad
  imports are refused with a message. Over 1 MB refused.
- Every read and write wrapped in try/catch; the extension works without storage.

## 6. Docs and credit

- CLAUDE.md: a Chong Die section with its own rules (build exception, GPL, Owlbear look, roll engine in
  `src/roll/` with tests, bump version, how to pull upstream changes).
- README: what it is, install link, command syntax, build and test commands.
- Landing page: a Chong Die card.
- In-extension help/about: "Based on Owlbear Rodeo Dice (GPL-3.0)" with a link to the source.
- No Nimble notice or license footer (no Nimble text).

## 7. Testing

- **Vitest, roll engine:** every operator and selector, operator order, adv/dis, labels and comments,
  `!rr` / `!rrr`, d2/d3 mapping, virtual dice, wave generation for rr/ro/ra/e and `!`, the 20-die
  cap, limits, error messages, breakdown strings.
- **Vitest, saved rolls:** load/save, corrupt data fallback, import validation.
- **Manual in Owlbear:** typed roll, Place pill, Instant pill, explode pop-out, a reroll wave, two
  players seeing the same total, hidden rolls, command line fade.

## Out of scope

Account sync of saved rolls, character-sheet integration, Fate dice, custom dice styles, sharing pills
between players.
