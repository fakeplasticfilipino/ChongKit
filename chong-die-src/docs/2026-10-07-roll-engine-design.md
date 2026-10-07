# Chong Die 3.0: the roll engine, rebuilt

Design spec, agreed in a brainstorm on 7 Oct 2026. It replaces the Avrae roll engine (`src/roll/`)
and the physics-decided dice. Read with `DESIGN.md` (how Chong Die works today) and the repo's
`CLAUDE.md` (the rules for Chong Die).

## Why

Two things the table needs can't be expressed today:

- **Crit dice with advantage** (Nimble's Improved Critical, "Roll crit dice with advantage", p.13 of
  the Nimble 5e rules hack). An explosion today is always exactly one new die.
- **Stacking advantage on any die** (Nimble p.16: each instance adds a die and removes the lowest,
  or the highest for disadvantage). It can be typed as `kh`/`kl`, but nothing builds it, and the
  Nimble outline can land on a dropped die.

A player also wants to automate his attacks from the command line. The root cause is that the
physics decides the values, so every rule beyond "one die, one value" becomes a back-and-forth with
the tray (waves). The rebuild moves every decision into the engine.

## Goals

- **CLI-first and system-agnostic.** The command language is the product; it knows general words,
  never a game system. Nimble is written in those words.
- **Intuitive.** Commands read aloud as plain words. A clean break from Avrae's syntax.
- **Engine-decided.** The engine rolls every number up front; the 3D tray only acts the record out.
- **Marks, not verdicts.** The engine shows the real total with marks (MISS, CRIT); the table
  decides what they mean.

## The rules the engine follows

From the Nimble 5e rules hack (printed pages), generalised:

- p.3: the leftmost damage die is the **Primary Die**. A 1 misses; its max is a crit, which rolls
  it again and adds it, with no limit. Only the Primary Die explodes in a plain attack.
- p.16: advantage and disadvantage: per instance, one extra die, remove the lowest (advantage) or
  the highest (disadvantage); instances cancel one for one before rolling; on a tie, remove dice
  from left to right.
- p.4: rushed attacks add disadvantage; p.13: Great Strike misses on 4 or less (2 or less for 2d6);
  p.16: eldritch blast treats every die as its own Primary Die; p.3: save spells neither miss nor
  crit; p.10: minions miss on a 1 and can't crit.

## The roll model

**Dice and order.** A roll is one or more dice groups. Within a group every die has a place in
order: first throw first, then advantage dice. Order stands in for "left to right".

**Advantage.** A group's advantage and disadvantage counters cancel first. The net count n adds n
dice, then drops the n lowest (advantage) or the n highest (disadvantage); on a tie the leftmost
tied die is dropped first. `2d6 adv3` is 5d6 keeping 2; `2d6 adv3 dis1` is 4d6 keeping 2.

**Primary Die.** The first die of a group still kept.

**Crit.** With `crit`, the dice that can crit are the group's Primary Die (or, with `crit each`,
every starting die) and every chain die. A die that can crit and shows its max is a crit; the roll
is marked CRIT.

**Chain dice.** A chain die is one more die, added to the total, that can crit. A die adds a chain
die when it meets a **source**:

- a crit (so chains continue while chain dice crit), or
- a starting rule such as `chain 5+`, which reads only the Primary Die. Chain dice themselves only
  chain on a crit.

**One chain die per die.** A die that meets several sources at once (a Primary Die showing 10 with
`crit chain 5+`) adds one chain die, not two. This is the table's ruling, not something the logic
forces: a 10 meets two sources. If the table ever wants the other reading, it is one rule in one
function.

A chain die is one die of the same size as the die that made it, or, with `chain adv`, an advantage
pick of that size (`chain adv` on a d10: 2d10 keep the higher); the kept die's value is the one
that can crit.

**Explode.** `explode` is a chain that is not a crit: dice in the group roll one more die on their
max, which can explode again, with no CRIT mark (Great Strike's extra die).

**Caps.** 100 dice in a roll and 20 chain dice; a roll that hits a cap stops adding and is marked
CAPPED.

**Marks.** `miss <range>` marks MISS when the group's Primary Die is in range. The total is always
the real sum of kept dice plus modifiers.

**The record.** The result is a complete record: every die's value, size, kind (start, advantage,
chain, explode), whether it was kept, whether it crit, which die it came from and the source that
made it; each group's Primary Die; the marks; and the total. Totals, marks, the tray, history and
sync all read this one record.

### Worked example: the chain player's attack

`1d10 crit chain 5+ chain adv` (his feat plus Improved Critical):

```
Primary d10 ─┬─ 10     → crit (and 5+): one chain die
             ├─ 5 to 9 → chain 5+:      one chain die
             └─ 1 to 4 → nothing more

chain die (2d10, keep the higher) ─┬─ kept 10 → crit: another chain die
                                   └─ else    → stop
```

## The command language

A command is dice groups joined by `+` or `-`, with plain numbers as modifiers. Rules follow the
group they belong to: in `1d4 nimble + 2d6 + 3` only the dagger can crit.

| Word | Means | Example |
|---|---|---|
| `NdS` | N dice of S sides | `2d6` |
| `adv`, `adv2`, `dis`, `dis3` | Advantage / disadvantage counters; they cancel first | `2d6 adv3` |
| `keep 3`, `keep low 1`, `drop 1` | Keep the highest / lowest, drop the lowest | `4d6 keep 3` |
| `crit` | Can-crit dice crit on their max and add chain dice | `1d8 crit` |
| `crit each` | Every starting die is its own Primary Die | `3d10 crit each` |
| `miss <range>` | Mark MISS when the Primary Die is in range | `2d6 crit miss 4-` |
| `chain <range>` | The Primary Die in range adds a chain die | `1d10 crit chain 5+` |
| `chain adv`, `chain adv2` | Chain dice roll with advantage | `… chain adv` |
| `explode` | Dice roll one more on their max, not a crit | `1d6 explode` |
| `xN` | Roll the whole command N times, separately | `1d20+5 x3` |
| `# text` | A note shown with the roll | `1d10 crit # longsword` |

Ranges are written one way everywhere: `5+` (5 or more), `4-` (4 or less), `1-2` (1 to 2), `6`
(exactly 6).

Combinations that are errors, so no command means two things:

- `adv` / `dis` with `keep` / `drop` in the same group: advantage is already a keep rule.
- `chain` or `chain adv` without `crit` in the same group: a chain die is defined by being able to
  crit. A die that should roll more without critting is `explode`.

**Saved names.** `name = text` defines a name; a name expands where it is used, and names may use
names:

```
nimble = crit miss 1
atk    = 1d10 nimble chain 5+ chain adv
atk +3        rolls  1d10 crit miss 1 chain 5+ chain adv +3
```

`nimble` ships as a built-in saved name the user can edit; the engine contains no Nimble. The
expanded text is what rolls, syncs, and goes into history and the result text.

**Left out on purpose:** rerolls (the table rolls again), multiplication and division (halving for
armor is the table's call), and a DC / target check. Each could be added later as one word.

## Architecture

A pipeline of small pure TypeScript modules in `src/roll/`, replacing the Avrae engine:

```
text ──expand──▶ text ──parse──▶ plan ──roll──▶ record ──▶ tray, totals, history, sync
```

- `expand.ts`: replaces saved names with their text, repeatedly; a loop (`a = b`, `b = a`) is an
  error naming the names.
- `parse.ts`: text to a plan (groups, dice, rules, modifiers, note). The only module that knows the
  words. An unknown word is an error that points at it.
- `roll.ts`: plan plus a random source to a record. The random source is passed in: tests give a
  fixed sequence, the app gives the browser's `crypto.getRandomValues`. Every rule of the roll model
  is one small function here.
- `record.ts`: the record type, and the totals and marks read from it.
- `format.ts`: a record as text, e.g.
  `1d10 (7) + chain 2d10kh1 (10, ~~4~~) + chain (3) = 20 · CRIT`.

**Sync.** The roller's app rolls once and shares the finished record (the `chong` metadata, with a
format version). Every player's tray acts out that same record. There are no waves and no
recomputing; whoever rolls is trusted, as now. A record in another format (a player who hasn't
updated) shows as its text with no dice, never as an error that stops the tray.

**Removed:** the Avrae parser and evaluator, the wave runner, reading values back from the physics,
right-click / long-press exploding, and the ⋯ → Nimble rules switch (the record says which die is
primary and whether it crit, so the outline shows whenever a roll uses `crit` or `miss`).

**Kept:** the 3D tray and dice styles, hold to roll, the Rolls panel, tabs, pills, history, hidden
rolls, other players' trays, export / import, and the Chong's Tracker channel.

## The tray

The tray acts out a record.

- **Landing on the record's face.** The roller's tray simulates each throw invisibly first, sees
  which face would land on top, turns the die's visible model so the record's face takes its place,
  and plays the same throw for real. Other players receive the final positions, as now. This rests
  on Rapier replaying a throw identically on one machine; a spike settles it first. Fallback: let the
  die settle, then give it a short, quick turn onto the record's face.
- **Primary Die:** today's outline (purple; dark red when the Primary Die is in the miss range; gold
  on a crit), placed by the record, not by where the die lands.
- **Dropped dice** fade. **Chain dice** pop out of the die that made them, one after another, after
  it settles (today's `popThrow`); an advantage chain die pops as a pair and the dropped one fades.
- **Marks and total** show with the result text.
- **Hold to roll** stays; dice picked by hand become a command like any roll.

## Moving over

Nothing is saved yet, so nothing is converted: saved rolls start empty under the new syntax.

- **Chong's Tracker:** `findRolls` (`chongs-tracker/core.js`) and the shared
  `chongs-tracker/tests/roll-examples.json` move to the new syntax in the same change (both sides
  test that file). The channels (`…/roll`, `…/ack`) don't change.
- **Version:** `public/manifest.json` → 3.0.0.
- **CLAUDE.md:** the Chong Die rule "an optional, simple Nimble switch… nothing automatic" is
  rewritten: the engine knows general words only; Nimble lives in the editable `nimble` saved name;
  other systems' rules may be added as words.

## Testing

Vitest, as now (`npm test` runs it).

- Every word, against fixed dice sequences, checking the exact record.
- The rules text's own examples: Grudge's battleaxe 8, 8, 1 (p.3); Glow's 4d6 crit rolling only the
  Primary Die (p.3); the greataxe with advantage and with disadvantage 2, ties removed from the left
  (p.16); a rushed attack's 1d4 with disadvantage 2 (p.4).
- The chain player's attack, every branch: 1, 2 to 4, 5 to 9, 10, a run of crits, the advantage
  pair's dropped die.
- The one-chain-die rule, both caps, saved-name loops, unknown words, and a record of another
  format shown as text.

## Order of work

Each step is its own commit, checked before the next.

1. **Spike** (throwaway): land a die on a chosen face; choose pre-simulation or the quick turn.
2. **Engine:** expand, parse, roll, record, format, with their tests. No tray yet.
3. **Tray:** acts out records; the waves, physics reading and right-click exploding go.
4. **Chong's Tracker and sync:** the tracker's parser and shared examples; the record's format
   version.
5. **Docs:** DESIGN.md, README's syntax table, NOTICE.md (GPL changes), CLAUDE.md, the trackers.
