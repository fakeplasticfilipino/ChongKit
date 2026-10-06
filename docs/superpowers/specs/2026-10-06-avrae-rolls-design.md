# Avrae Version, clickable rolls, simpler Chong Die panel: design

Date: 2026-10-06 · Status: approved in chat, awaiting spec review

Three linked changes across three tools:

1. **Combat Generator:** an **Avrae Version** option that writes damage with the primary die split
   off and exploding (`4d8+2` → `1d8!+3d8+2`).
2. **Chong's Tracker:** dice in notes are underlined. Clicking one sends it to **Chong Die**, which
   places the dice or rolls them (by its own Instant switch).
3. **Chong Die:** minimalist panel controls (**+** and **⚡** icon buttons, no ★), and pills with a
   name, the dice and an optional description.

## Decisions (from the brainstorm)

| Topic | Decision |
|---|---|
| Option name | "Avrae Version" (checkbox in More options) |
| Which die explodes | The first dice term of each damage roll (Nimble's primary die) |
| Minions | Unchanged (they already say "no crits") |
| Text style | Compact: `1d8!+3d8+2` |
| Instant for tracker clicks | Chong Die's open tab decides (its ⚡) |
| Multi-attacks `(2×)` | Sent as `!rr 2 …`; text stays as it is |
| Editing notes with rolls | Read view with underlined rolls; click elsewhere in the note to edit |
| Chong Die controls | **+** (add roll) and **⚡** (Instant) icon buttons; ★ removed |
| Pills | Show name + dice; optional description on hover / long-press and in the dialog |

## 1. Combat Generator: Avrae Version

- New checkbox **Avrae Version** in More options, after Loot. Saved with the other setup choices in
  localStorage; ticking it redraws the **same** fight (text only, like Summary and Loot).
- `Gen.nimbleDice(text: string): string` in `generator.js`: in each damage expression, the first
  `NdX` term becomes `1dX!` followed by `+(N-1)dX` when N > 1. Rest of the text untouched.
  - `4d8+2` → `1d8!+3d8+2`; `1d6+2` → `1d6!+2`; `2d6` → `1d6!+1d6`; `(2×) 2d6+3` → `(2×) 1d6!+1d6+3`
  - Bestiary strings: every expression in the line is a separate roll, so each one's first term is
    split: `Stab (2×). 1d4+2 (or Sling, Range 8).` → `Stab (2×). 1d4!+2 (or Sling, Range 8).`
  - Applied in `asText` to: generic `Damage:` lines, the boss's two attacks, bestiary `Damage:` lines.
    **Not** to minions.
- Averages: the dice are the same, so the table average (which ignores crits and misses, p.30)
  is unchanged. README says `!` is Nimble's crit (primary die explodes) written in Avrae syntax,
  and that miss-on-1 can't be written there. Derived notation, not a guide number.
- Tests in `combat-generator/tests/generator.test.js`.
- The tracker's paste parser keeps working: Damage lines are note text (check with a test).

## 2. Chong's Tracker: clickable rolls

- **Read view** for entry notes and the tab note: the note text with every roll as an underlined
  link (`.roll`). Click a roll → send it. Click anywhere else in the note → the existing edit box
  (focused, caret at the end); blur → back to the read view. Empty notes show the edit box as now.
  User text is only ever set as text nodes.
- `ChongCore.findRolls(line: string): { start: number; end: number; command: string }[]` in
  `core.js`:
  - A roll is a dice expression: one or more terms joined by `+`/`-`, at least one `NdX` term
    (`dX`, `NdX!`, Avrae ops like `kh1` allowed), constants allowed: `1d8!+3d8+2`, `2d6+3`,
    `1d20`, `d%`.
  - A repeat `(N×)` (also `(Nx)`) earlier on the same line makes the command `!rr N <expr>`;
    otherwise `!r <expr>`. The underlined span is the expression only.
  - Tested in `chongs-tracker/tests/core.test.js` with generator lines (generic, bestiary, boss,
    minion, Avrae Version) and plain text with no dice.
- Version bump (`manifest.json` + every `?v=`).

## 3. The link between the two extensions

- Message: `OBR.broadcast.sendMessage("com.chongkit.chongdie/roll", { id, command }, { destination: "LOCAL" })`
  — this player's own screen only.
- Chong Die's background page listens on that channel, calls `OBR.action.open()`, and forwards the
  command to the dice window on `com.chongkit.chongdie/run` (LOCAL). If the window isn't loaded yet,
  the background page re-sends until the window acknowledges (`…/run-ack` with the same `id`) or 3 s
  pass. The dice window then:
  - its open tab's ⚡ on → rolls the command now (`startCommandRoll`, hidden switch respected);
  - off → `placeCommand` (dice on the tray, panel hidden); a command with only virtual dice rolls now.
  - a command that can't roll → the error under the command line.
- The background page answers the tracker on `com.chongkit.chongdie/ack` with the same `id`. With no
  ack within 1 s the tracker shows an Owlbear notification: "Install Chong Die to roll".
- **SDK upgrade:** Chong Die's `@owlbear-rodeo/sdk` is 1.3.9, which has no broadcast API. Upgrade
  it to the current major (3.x) and fix any breaking changes in the upstream plugin code
  (`src/plugin/*`, `background.ts`), keeping party trays and roll sync working. The tracker's
  vendored SDK already has broadcast with `destination`.

## 4. Chong Die: minimalist panel and richer pills

- Command line: the text box only (★ removed).
- Tab row: tabs, then **+** (add roll) and **⚡** (Instant toggle, primary colour when on, dim when
  off; tooltip "Instant"), then ⋯. No switch, no label.
- **+** opens the roll dialog: **Name**, **Roll**, **Description** (optional). Roll is prefilled
  with the command line's text if any.
- Pills show **name** and the **dice** (smaller, dimmer, monospace), e.g. **Longsword** `1d20+5`.
  The description shows as the pill's tooltip (hover) and on long-press (with the Edit / Delete
  menu); it is also editable in the dialog.
- Saved data: `Pill` gains `description?: string`. Old saves load unchanged (no version change);
  `validateSavedRolls` keeps a string description and drops anything else.
- Version 1.1.0, rebuild `chong-die/`.

## Testing

- Generator: `nimbleDice` cases above; Avrae Version leaves minions alone; same dice → same average.
- Tracker: `findRolls` cases; existing paste tests still pass with Avrae Version text.
- Chong Die (Vitest): description round trip and validation; a message handler unit
  (`handleIncomingRoll(command, instant)` → roll / place / error) tested without Owlbear.
- Manual in Owlbear: click a note roll with ⚡ on and off, with Chong Die closed, without Chong Die
  installed; party trays still work after the SDK upgrade.

## Out of scope

Miss-on-1 in the dice; clickable rolls outside notes; links from the Combat Generator web page
(it isn't inside Owlbear); account sync of pills.
