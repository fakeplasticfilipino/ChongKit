# Chong Die 4.0: a simpler command language

Design spec, agreed in a brainstorm on 8 Oct 2026. It replaces the command language of
`2026-10-07-roll-engine-design.md` (3.0); the engine's architecture (engine decides, tray acts the
record out, stages, outlines, faces) is unchanged. Read with `DESIGN.md` and the repo's `CLAUDE.md`.

## Why

3.x's words are hard to read at the table: `miss 4-` looks like subtraction (and needs tokenizer
tricks so `4-+3` splits), `crit` and `chain` are two words for one idea, and `keep`, `drop`,
`explode`, `crit each`, saved names and `# notes` were never used. Pills already save commands.

## Goals

- **One pattern:** every word is a word glued to an optional number (`adv3`, `crit5-10`, `x2`).
- **Simple and dumb:** a handful of words, no hidden rules beyond the chain rule below.
- **System-agnostic** still: Nimble is `1d10+3 crit miss`, written in general words.
- **No connection to Chong's Tracker.** Rolls are copied from notes by hand.

## The language

```
1d10+3 crit miss          Nimble attack
1d10 + 3 crit miss adv3   4d10, keep the highest, +3
1d10+3 crit miss critadv  chain dice rolled with advantage
2d6+1d4-1                 plain dice and modifiers
1d10+3 crit miss x2       the whole roll twice
```

A command is dice (`NdS`, `dS`, `d%`) and whole numbers joined by `+`/`-` (spaces optional), plus
words anywhere after the first dice. Case doesn't matter.

| Word | Bare | With a number | Meaning |
|---|---|---|---|
| `adv` / `dis` | 1 | `adv3` | Add that many dice to the first group; drop that many lowest (`dis`: highest). `adv` and `dis` cancel (net). |
| `crit` | the die's max | `crit10`, `crit5-10` | The Primary Die in this range crits and starts a chain. |
| `miss` | 1 | `miss1`, `miss1-4` | The Primary Die in this range: the roll is marked MISS. |
| `critadv` | 1 | `critadv2` | Each chain die is rolled as 1+N dice, the highest kept (a pick counts as one chain die). |
| `xN` | (error) | `x3` | Roll the whole command N times (1 to 25). |

- **Words act on the first dice group** of the command. Other dice and numbers are only added.
  `1d10 + 1d6 + 3 crit adv` gives the d10 advantage and checks its Primary Die; the d6 is plain.
- **Primary Die:** the first die of the first group still kept after `adv`/`dis`.
- **Ranges** are `N` or `N-M` (N ≤ M), glued to the word. A `-` inside `crit`/`miss` is always the
  range: `crit5-2` is an error; `crit5 -2` is crit on 5, then subtract 2.

### The chain rule (the table's, non-negotiable)

- The `crit` range is checked **only on the Primary Die**. Landing in it is a crit (gold outline,
  CRIT mark) and starts a chain: one chain die (or a `critadv` pick) of the same size.
- A chain die chains again **only on its maximum** (also a crit), never on the range.
- Caps as in 3.x: 100 dice per command, 20 chain dice; hitting either marks CAPPED.

### Errors (EngineError, shown under the command line)

- A word twice (`crit crit5`, `adv adv2`); `x` twice.
- A range outside the die (`crit11` on a d10, `miss0`), or backwards (`miss3-1`).
- `crit` and `miss` ranges that overlap (`crit miss1` on a d1; `crit5-10 miss1-5`).
- `critadv` without `crit`; bare `x`.
- A word before any dice; unknown words (including the removed ones and `#`); a sign with nothing
  after it; no dice; more than 100 dice.

### Removed

`keep`, `low`, `drop`, `chain`, `each`, `explode`, the `5+` / `4-` / `1-2` range words, saved names
(`name = text`, the built-in `nimble`, `expand.ts`), `# notes`. Old pills and history that no longer
parse just show their error (never hosted: no migration).

## Engine

- `parse.ts`: rewritten as a scanner over dice, numbers, signs and the words above (the only module
  that knows the words). The Plan gets roll-level options `{ adv, dis, crit: Range | null, miss:
  Range | null, critAdv, times }`; groups are just `{ sign, count, size }`. `splitRange` and the
  `miss`/`chain` lookbehind go; `range.ts` parses only `N` / `N-M`.
- `roll.ts`: crit = Primary Die in the crit range; chain dice crit (and chain) on their max only;
  `keep`/`drop`/`explode`/`each` removed. Labels stay (`4d10kh1`).
- `format.ts` / `record.ts`: no notes, no explode. The record becomes `v: 4` (`ChongRollMeta` too);
  a v3 roll from another tray shows as text, as any other format does.
- `expand.ts` deleted.

## Chong Die app

- Saved names removed: `name = …` in `CommandLine`, names in `chongStore` / `savedRolls`
  (dropped on load), `BUILT_IN_NAMES`. Pills, tabs and history stay.
- Tracker link removed: `channels.ts`, `incoming.ts`, `IncomingRolls.tsx`, their tests,
  `trackerRolls.test.ts`, the roll listener in `background.ts` (it keeps opening the popover).
  `TrayError` stays only if something else still raises tray errors.
- **Rolls panel width:** `PANEL_WIDTH` 360 → 280 px, fixed. (The tray is at most 350 px since
  Owlbear caps the window at 700 px tall, so "tray + 20" would have made it wider, not thinner.)
- Version 4.0.0; DESIGN.md, NOTICE.md, rebuild `chong-die/`, `chong-die/TRACKER.md`.

## Chong's Tracker

Remove `findRolls`, the clickable rolls and the "Install Chong Die to roll" message in `app.js`,
`tests/roll-examples.json` and its tests. Bump `manifest.json` version and every `?v=`. Update
`chongs-tracker/TRACKER.md`.

## Repo docs

`CLAUDE.md`: drop Tracker rule 9; Chong Die rule 1 says Nimble is `1d10+3 crit miss` (no built-in
name); "Contracts" keeps only the `chong` metadata (`v: 4`). README: the new words. This spec
replaces the 3.0 spec's language sections.

## Testing

Vitest (`npm test` at the root runs everything):

- parse: every word bare and numbered, glued and spaced signs, ranges, each error above,
  words after the modifier, words acting on the first group only.
- roll: crit on the range starts a chain; a chain die chains only on max (a range value doesn't);
  `critadv` picks; adv/dis net and Primary Die; miss mark; caps.
- layout: `PANEL_WIDTH` is 280; `windowWidth(700, true)` is 630.
- Tracker: `npm test` still passes with the roll tests removed.
