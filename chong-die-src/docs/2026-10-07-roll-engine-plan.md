# Chong Die 3.0 roll engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Chong Die's Avrae engine and physics-decided dice with a plain-word, engine-decided roll language whose 3D tray only acts out a finished record.

**Architecture:** A new pure engine in `src/engine/` (expand → parse → roll → record → format) is built and tested beside the old `src/roll/`, then the app is switched over to it in one task and `src/roll/` is deleted. The roller's app rolls once and syncs the record; every tray lands each die on the record's face and reveals chain dice in stages.

**Tech Stack:** TypeScript, React 18, three.js / @react-three/fiber, @react-three/rapier, zustand, Vitest; Owlbear Rodeo SDK.

**Spec:** `chong-die-src/docs/2026-10-07-roll-engine-design.md` (read it first; this plan argues from it).

## Global Constraints

- All paths below are relative to the ChongKit repo root. Commands run from `chong-die-src/` unless they start with `cd`.
- Before starting and before every push: `git pull --rebase origin main`. Commit and push straight to `main`; no branches, no pull requests.
- Before every commit: `npm test` from the repo root (Node 22+), all green.
- A task that changes anything the app loads (Tasks 7 to 10): bump `chong-die-src/public/manifest.json` → `version`, then `npx yarn@1.22.22 build`, and commit the rebuilt `chong-die/` with the source. The build empties `chong-die/` except `TRACKER.md`.
- The final version is `3.0.0`.
- GPL-3.0: list every change in `chong-die-src/NOTICE.md`; keep `LICENSE` and the ⋯ → About credit.
- Look stays Chong's Tracker's (`src/chong/look.ts`); no `nimble.css`.
- Caps, from the spec: 100 dice in a roll (every die, kept or dropped, all repetitions), 20 chain and explode dice in a roll.
- Channels `com.chongkit.chongdie/roll`, `…/ack`, `…/run`, `…/run-ack` do not change.
- Random numbers in the app come only from `crypto.getRandomValues`; every engine function takes its random source as a parameter.
- The engine contains no game system: `nimble` exists only as a built-in, editable saved name, `nimble = crit miss 1`.
- The table's ruling, kept as one rule in one function: a die that meets several chain sources adds one chain die.

## Review Focus

1. Commands typed without spaces or in capitals (`2D6+3`, `1d10crit`): `+` and `-` split groups with or without spaces; words and `d` are case-insensitive; a word glued to dice (`1d10crit`) is an error that names it. Test in Task 2.
2. Shorthand dice: `d20` means `1d20`, `d%` means `1d100`. Test in Task 2.
3. A saved name that collides with a word or dice (`crit = …`, `d6 = …`, `2d6 = …`), or loops: refused with a message. Test in Task 3.
4. A die that always rolls its max (`1d1 crit`, `1d1 explode`): the chain stops at 20 and the roll is marked CAPPED, never hangs. Test in Task 5.
5. A command over 100 dice before anything is rolled (`60d6 adv50`, `30d6 x4`): an error at parse time, not a half-finished roll. Test in Task 2.

---

## File structure

```
chong-die-src/src/engine/          new pure engine (replaces src/roll/)
  types.ts      Range, GroupPlan, Plan, RolledDie, GroupResult, RepRecord, RollRecord, Rng, EngineError
  range.ts      parseRange, inRange
  parse.ts      text → Plan (the only module that knows the words); stageZeroSizes
  expand.ts     saved names → text; checkName
  roll.ts       Plan + Rng → RollRecord (every rule of the roll model)
  record.ts     totals, marks, revealStages, primaryDie
  format.ts     RollRecord → { total, lines }
  faces.ts      facesFor (logical value → 3D faces), toPhysical, rollFair
  index.ts      re-exports
  *.test.ts     one test file per module
chong-die-src/src/chong/
  rollMeta.ts   ChongRollMeta v3 (record + 3D parts); display; highlights   (rewritten)
  rollRunner.ts startCommandRoll, staged reveal                             (rewritten)
  place.ts      placeCounts from stageZeroSizes                              (modified)
  savedRolls.ts names map, built-in nimble                                  (modified)
  CommandLine.tsx  `name = text` saves a name; no `!r` placeholder          (modified)
chong-die-src/src/dice/
  PhysicsDice.tsx   lands on a forced face                                   (modified)
  InteractiveDice.tsx  right-click / long-press explode removed             (modified)
chong-die-src/src/helpers/faceSymmetry.ts  symmetry rotation onto a face    (new)
chongs-tracker/core.js, tests/roll-examples.json   new syntax                (modified)
```

---

### Task 1: Spike: land a die on a chosen face (throwaway)

**Files:**
- Create (throwaway, not committed): `chong-die-src/spike/` anything
- Modify: `chong-die-src/DESIGN.md` (the decision only)

The output is a decision, not code. Polyhedral dice are face-transitive, so for any two faces there is a rotation of the solid onto itself taking one to the other; applying it to the visible model, not the collider, moves the numbers and leaves the physics untouched. The question is when it can be applied unseen.

- [ ] **Step 1:** In a scratch copy of `PhysicsDice.tsx`, find each die model's locators (`getValueFromDiceGroup` reads `locator.name.slice(12)` under the `dice` object) and, for a d6, d10 and d20, compute the symmetry rotation that takes the locator of face T to the locator that ended up on top. Apply it to the mesh at the moment the die settles. Check by eye that the silhouette doesn't change and the top face now reads T.
- [ ] **Step 2:** Try pre-simulation: run the same throw in a separate headless Rapier world (`@dimforge/rapier3d-compat`, already a dependency of `@react-three/rapier`) with the tray's colliders and every die of the stage, read the top locator, apply the symmetry rotation to the mesh before the visible throw, and play it. Record whether 20 throws of 1 to 6 dice land with the same top face in both runs.
- [ ] **Step 3:** Write the decision into `DESIGN.md` under a new "Faces" heading: **pre-simulation** if Step 2 matched 20 of 20, else **settle-then-turn** (a 250 ms slerp of the mesh from identity to the symmetry rotation after the die settles). Delete `spike/`.
- [ ] **Step 4: Commit**

```bash
git add chong-die-src/DESIGN.md
git commit -m "Chong Die 3.0 spike: how a die lands on the record's face"
git push origin main
```

---

### Task 2: Engine types, ranges and the parser

**Files:**
- Create: `src/engine/types.ts`, `src/engine/range.ts`, `src/engine/parse.ts`, `src/engine/index.ts`
- Test: `src/engine/range.test.ts`, `src/engine/parse.test.ts`

**Interfaces:**
- Produces:
  - `type Range = { min: number; max: number }` (inclusive; `max` may be `Infinity`, `min` may be `-Infinity`)
  - `parseRange(word: string): Range | null` and `inRange(v: number, r: Range): boolean`
  - `interface GroupPlan { sign: 1 | -1; count: number; size: number; adv: number; dis: number; keep: { n: number; low: boolean } | null; drop: number; crit: "none" | "primary" | "each"; miss: Range | null; chain: Range[]; chainAdv: number; explode: boolean }`
  - `interface Plan { text: string; groups: GroupPlan[]; modifier: number; times: number; note: string | null }`
  - `class EngineError extends Error` (`name = "EngineError"`)
  - `parse(text: string): Plan`
  - `stageZeroSizes(plan: Plan): number[]` (one entry per die of the first throw, all repetitions: count plus net advantage dice per group)
  - constants `MAX_DICE = 100`, `MAX_FOLLOW = 20`, `MAX_TIMES = 25`, `MAX_SIDES = 1000`

Grammar (decided here; the spec fixes the words):
- Tokens: `+` and `-` are their own tokens with or without spaces; everything else splits on whitespace; matching is case-insensitive. Everything after `#` is the note.
- A group starts with dice `NdS`, `dS` (count 1) or `d%` (size 100), and owns every word after it until the next `+` / `-`. A plain integer between signs is a modifier.
- Words: `adv`, `advN`, `dis`, `disN`, `keep N`, `keep low N`, `drop N`, `crit`, `crit each`, `miss <range>`, `chain <range>`, `chain adv`, `chain advN`, `explode`, `xN` (once per command, anywhere).
- Errors (`EngineError`, message quoting the offending text): unknown word (`Unknown word "chian"`), a word before any dice, `adv`/`dis` with `keep`/`drop` in one group, `chain` without `crit` in its group, a range that doesn't parse, `xN` outside 1..25, sides outside 1..1000, more than 100 dice in `stageZeroSizes`, a trailing `+`/`-`, an empty command.

- [ ] **Step 1: Write the failing tests**

```ts
// range.test.ts
expect(parseRange("5+")).toEqual({ min: 5, max: Infinity });
expect(parseRange("4-")).toEqual({ min: -Infinity, max: 4 });
expect(parseRange("1-2")).toEqual({ min: 1, max: 2 });
expect(parseRange("6")).toEqual({ min: 6, max: 6 });
expect(parseRange("x")).toBeNull();

// parse.test.ts
test("the chain player's attack", () => {
  const p = parse("1d10 crit chain 5+ chain adv +3 # longsword");
  expect(p.groups).toEqual([{ sign: 1, count: 1, size: 10, adv: 0, dis: 0, keep: null, drop: 0,
    crit: "primary", miss: null, chain: [{ min: 5, max: Infinity }], chainAdv: 1, explode: false }]);
  expect(p.modifier).toBe(3);
  expect(p.note).toBe("longsword");
  expect(p.times).toBe(1);
});
test("groups, signs and modifiers", () => {
  const p = parse("1d4 crit miss 1 + 2d6 - 1d4 + 3");
  expect(p.groups.map((g) => [g.sign, g.count, g.size, g.crit])).toEqual([[1, 1, 4, "primary"], [1, 2, 6, "none"], [-1, 1, 4, "none"]]);
  expect(p.modifier).toBe(3);
});
test("no spaces and capitals", () => {           // Review Focus 1
  expect(parse("2D6+3")).toMatchObject({ modifier: 3, groups: [{ count: 2, size: 6 }] });
  expect(() => parse("1d10crit")).toThrow(/1d10crit/);
});
test("shorthand dice", () => {                     // Review Focus 2
  expect(parse("d20").groups[0]).toMatchObject({ count: 1, size: 20 });
  expect(parse("d%").groups[0]).toMatchObject({ count: 1, size: 100 });
});
test("counters and keep", () => {
  expect(parse("2d6 adv3 dis1").groups[0]).toMatchObject({ adv: 3, dis: 1 });
  expect(parse("4d6 keep 3").groups[0].keep).toEqual({ n: 3, low: false });
  expect(parse("2d20 keep low 1").groups[0].keep).toEqual({ n: 1, low: true });
});
test("errors name the problem", () => {
  expect(() => parse("1d10 chian 5+")).toThrow('Unknown word "chian"');
  expect(() => parse("2d6 adv keep 1")).toThrow(EngineError);
  expect(() => parse("1d10 chain 5+")).toThrow(/crit/);
  expect(() => parse("crit 1d6")).toThrow(EngineError);
  expect(() => parse("1d6 +")).toThrow(EngineError);
  expect(() => parse("1d6 x26")).toThrow(EngineError);
});
test("over 100 dice is refused before rolling", () => {   // Review Focus 5
  expect(() => parse("60d6 adv50")).toThrow(/100/);
  expect(() => parse("30d6 x4")).toThrow(/100/);
  expect(stageZeroSizes(parse("2d6 adv3 x2"))).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx yarn@1.22.22 vitest run src/engine/range.test.ts src/engine/parse.test.ts`
Expected: FAIL, the modules don't exist.

- [ ] **Step 3: Implement** `types.ts`, `range.ts`, `parse.ts`, `index.ts` with the interfaces above (`index.ts` re-exports every engine module as later tasks add them).
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit** (`npm test` from the root first)

```bash
git add chong-die-src/src/engine
git commit -m "Chong Die 3.0 engine: types, ranges, parser"
git push origin main
```

---

### Task 3: Saved names

**Files:**
- Create: `src/engine/expand.ts`
- Test: `src/engine/expand.test.ts`

**Interfaces:**
- Consumes: `parse`, `EngineError` (Task 2)
- Produces:
  - `const BUILT_IN_NAMES: Record<string, string> = { nimble: "crit miss 1" }`
  - `checkName(name: string): string | null`: null if usable, else why (not `[a-z][a-z0-9_]*`, a word of the language, or dice like `d6` / `2d6`)
  - `expand(text: string, names: Record<string, string>): string`: replaces every whole word that is a name with its text (case-insensitive, recursively), collapses spaces; a loop throws `EngineError` naming the names (`Saved names loop: a → b → a`)
  - `parseDefinition(text: string): { name: string; text: string } | null`: `atk = 1d10 crit` → `{ name: "atk", text: "1d10 crit" }`; `atk =` → `{ name: "atk", text: "" }` (delete)

- [ ] **Step 1: Write the failing tests**

```ts
const names = { ...BUILT_IN_NAMES, atk: "1d10 nimble chain 5+ chain adv" };
expect(expand("atk +3", names)).toBe("1d10 crit miss 1 chain 5+ chain adv +3");
expect(expand("2d6 nimble # note with nimble", names)).toBe("2d6 crit miss 1 # note with nimble"); // notes untouched
expect(() => expand("a", { a: "b", b: "a" })).toThrow("Saved names loop: a → b → a");
expect(checkName("crit")).toMatch(/word/);          // Review Focus 3
expect(checkName("d6")).toMatch(/dice/);
expect(checkName("2d6")).not.toBeNull();
expect(checkName("atk")).toBeNull();
expect(parseDefinition("atk = 1d10 crit")).toEqual({ name: "atk", text: "1d10 crit" });
expect(parseDefinition("1d10 crit")).toBeNull();
```

- [ ] **Step 2: Run** `npx yarn@1.22.22 vitest run src/engine/expand.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `expand.ts`; export it from `index.ts`.
- [ ] **Step 4: Run again.** Expected: PASS.
- [ ] **Step 5: Commit** `Chong Die 3.0 engine: saved names` (`npm test` first; push).

---

### Task 4: Rolling: dice, advantage, keep, the Primary Die, marks

**Files:**
- Create: `src/engine/roll.ts`, `src/engine/record.ts`
- Test: `src/engine/roll.test.ts`, `src/engine/record.test.ts`

**Interfaces:**
- Consumes: `Plan`, `GroupPlan`, `inRange` (Task 2)
- Produces:
  - `type Rng = (size: number) => number` (returns 1..size)
  - `seq(values: number[]): Rng`, test helper in `roll.ts`, throws when it runs out
  - `type DieKind = "start" | "adv" | "chain" | "explode"`
  - `interface RolledDie { id: number; group: number; size: number; value: number; kind: DieKind; kept: boolean; crit: boolean; parent: number | null; pick: number | null; source: "crit" | "range" | "explode" | null }` (`id` is the die's place in the repetition's order; `pick` groups an advantage chain pick's dice)
  - `interface GroupResult { primary: number | null; miss: boolean; crit: boolean }`
  - `interface RepRecord { dice: RolledDie[]; groups: GroupResult[]; total: number; capped: boolean }`
  - `interface RollRecord { v: 3; text: string; note: string | null; reps: RepRecord[] }`
  - `roll(plan: Plan, rng: Rng): RollRecord`
  - `marks(rep: RepRecord): ("MISS" | "CRIT" | "CAPPED")[]` in `record.ts`

Rules, from the spec (this task covers everything but crit, chain and explode):
- A group's dice are rolled in order: `count` start dice, then `|adv - dis|` dice of kind `adv`.
- Net advantage drops that many lowest, net disadvantage that many highest; among equal values the lowest `id` is dropped first. `keep n` keeps the n highest (`low`: lowest), `drop n` drops the n lowest, ties the same way.
- `primary` is the first kept die of kind `start` or `adv`, by `id`.
- `miss` is `inRange(primary.value, group.miss)`; MISS when any group's `miss` is true.
- `total` is the sum over groups of `sign × (sum of kept dice)`, plus `modifier`.
- `times` repetitions, each its own `RepRecord`.

- [ ] **Step 1: Write the failing tests**

```ts
test("greataxe with advantage: 3d6, drop the lowest (p.16)", () => {
  const r = roll(parse("2d6 adv"), seq([4, 2, 5])).reps[0];
  expect(r.dice.map((d) => [d.value, d.kind, d.kept])).toEqual([[4, "start", true], [2, "start", false], [5, "adv", true]]);
  expect(r.groups[0].primary).toBe(0);
  expect(r.total).toBe(9);
});
test("disadvantage 2: two extra, drop the two highest (p.16)", () => {
  const r = roll(parse("2d6 dis2"), seq([6, 3, 2, 5])).reps[0];
  expect(r.dice.filter((d) => d.kept).map((d) => d.value)).toEqual([3, 2]);
  expect(r.groups[0].primary).toBe(1);
});
test("ties are removed from the left (p.16)", () => {
  const r = roll(parse("2d6 adv"), seq([3, 3, 5])).reps[0];
  expect(r.dice.map((d) => d.kept)).toEqual([false, true, true]);
});
test("rushed attack: 1d4 with disadvantage 2 (p.4)", () => {
  const r = roll(parse("1d4 dis2"), seq([4, 1, 3])).reps[0];
  expect(r.total).toBe(1);
});
test("counters cancel first", () => {
  expect(roll(parse("2d6 adv3 dis1"), seq([1, 2, 3, 4])).reps[0].dice).toHaveLength(4);
});
test("miss on 4 or less marks MISS and keeps the real total", () => {
  const rep = roll(parse("2d6 crit miss 4-"), seq([3, 5])).reps[0];
  expect(rep.total).toBe(8);
  expect(marks(rep)).toEqual(["MISS"]);
});
test("signs, modifier and repetitions", () => {
  const rec = roll(parse("1d6 - 1d4 + 2 x2"), seq([5, 3, 1, 4]));
  expect(rec.reps.map((r) => r.total)).toEqual([4, -1]);
});
```

- [ ] **Step 2: Run** `npx yarn@1.22.22 vitest run src/engine/roll.test.ts src/engine/record.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `roll.ts` and `marks` in `record.ts`, one small function per rule (`rollGroup`, `applyAdvantage`, `applyKeep`, `primaryOf`).
- [ ] **Step 4: Run again.** Expected: PASS.
- [ ] **Step 5: Commit** `Chong Die 3.0 engine: dice, advantage, keep, primary, marks` (`npm test`; push).

---

### Task 5: Rolling: crits, chain dice, explode, caps

**Files:**
- Modify: `src/engine/roll.ts`
- Test: `src/engine/roll.test.ts`

**Interfaces:**
- Consumes: Task 4's types and `roll`
- Produces: the same `roll`, now with the follow-up rules; `crit` and `capped` filled in; `marks` returns `"CRIT"` when any group's `crit` is true, `"CAPPED"` when `capped`

Rules, from the spec:
- Can crit: with `crit: "primary"`, the group's primary; with `"each"`, every kept `start` die; and every kept chain die. Such a die showing its size is `crit: true`; the group's `crit` is true.
- Sources, checked per die in `id` order, adding **at most one** follow-up per die (`followUp(die): "crit" | "range" | "explode" | null`, the single place this ruling lives): a crit → `crit`; else, for the primary only, `inRange(value, any chain range)` → `range`; else, with `explode` and a kept die (any kind but chain) at its max → `explode`.
- A `crit` or `range` follow-up is a chain die: `1 + chainAdv` dice of the parent's size, kind `chain`, the same `pick` (the first one's id), keep the highest one (ties: the leftmost kept, the rest dropped). Only the kept one can crit and add more.
- An `explode` follow-up is one die of kind `explode`, which can explode again and never crits.
- Follow-ups are processed breadth-first in `id` order. Every chain and explode die counts toward `MAX_FOLLOW` (20) per command; when a follow-up would exceed it, none is added and the rep's `capped` is true.

- [ ] **Step 1: Write the failing tests**

```ts
test("Grudge's battleaxe: 8, 8, 1 (p.3)", () => {
  const r = roll(parse("1d8 crit"), seq([8, 8, 1])).reps[0];
  expect(r.total).toBe(17);
  expect(r.dice.map((d) => [d.kind, d.crit])).toEqual([["start", true], ["chain", true], ["chain", false]]);
});
test("Glow's 4d6: only the Primary Die chains (p.3)", () => {
  const r = roll(parse("4d6 crit"), seq([6, 5, 3, 1, 4])).reps[0];
  expect(r.total).toBe(19);
  expect(r.dice[4]).toMatchObject({ kind: "chain", parent: 0, source: "crit" });
});
describe("the chain player's attack: 1d10 crit chain 5+ chain adv", () => {
  const atk = parse("1d10 crit chain 5+ chain adv");
  test("1: no more dice", () => expect(roll(atk, seq([1])).reps[0].dice).toHaveLength(1));
  test("4: no more dice", () => expect(roll(atk, seq([4])).reps[0].dice).toHaveLength(1));
  test("7: one chain pick by range, not a crit", () => {
    const r = roll(atk, seq([7, 3, 6])).reps[0];
    expect(r.dice.slice(1).map((d) => [d.value, d.kept, d.source])).toEqual([[3, false, "range"], [6, true, "range"]]);
    expect(marks(r)).toEqual([]);
  });
  test("10: one chain pick, not two (the table's ruling)", () => {
    const r = roll(atk, seq([10, 2, 4])).reps[0];
    expect(r.dice.filter((d) => d.kind === "chain")).toHaveLength(2);
    expect(r.dice[1].source).toBe("crit");
  });
  test("a kept 10 in the pick chains again", () => {
    const r = roll(atk, seq([6, 10, 3, 9, 2])).reps[0];
    expect(r.total).toBe(6 + 10 + 9);
    expect(marks(r)).toEqual(["CRIT"]);
  });
});
test("explode is not a crit", () => {
  const r = roll(parse("1d6 explode"), seq([6, 6, 2])).reps[0];
  expect(r.total).toBe(14);
  expect(marks(r)).toEqual([]);
});
test("crit each: every die is its own Primary Die (p.16)", () => {
  const r = roll(parse("3d10 crit each"), seq([10, 4, 10, 1, 2])).reps[0];
  expect(r.dice.filter((d) => d.kind === "chain")).toHaveLength(2);
});
test("a die that always rolls max stops at 20 and is CAPPED", () => {   // Review Focus 4
  const r = roll(parse("1d1 crit"), () => 1).reps[0];
  expect(r.dice.filter((d) => d.kind === "chain")).toHaveLength(20);
  expect(marks(r)).toContain("CAPPED");
  expect(roll(parse("1d1 explode"), () => 1).reps[0].capped).toBe(true);
});
```

- [ ] **Step 2: Run** `npx yarn@1.22.22 vitest run src/engine/roll.test.ts`. Expected: the new tests FAIL, Task 4's still PASS.
- [ ] **Step 3: Implement** in `roll.ts`: `followUp(die, group)`, `chainPick(parent, group, rng)`, the breadth-first loop and the cap.
- [ ] **Step 4: Run again.** Expected: PASS.
- [ ] **Step 5: Commit** `Chong Die 3.0 engine: crits, chain dice, explode, caps` (`npm test`; push).

---

### Task 6: Format, reveal stages and faces

**Files:**
- Create: `src/engine/format.ts`, `src/engine/faces.ts`
- Modify: `src/engine/record.ts`
- Test: `src/engine/format.test.ts`, `src/engine/faces.test.ts`, `src/engine/record.test.ts`

**Interfaces:**
- Consumes: `RollRecord`, `RepRecord`, `RolledDie` (Tasks 4, 5)
- Produces:
  - `interface FormattedResult { total: string; lines: string[] }` (same shape as today's, so `DiceResults` keeps working)
  - `formatRecord(record: RollRecord): FormattedResult`: one line per repetition; dropped dice `~~x~~`; crits and 1s `**x**`; a chain pick written `chain 2d10kh1 (x, ~~y~~)`; marks after ` · `; `total` is the totals joined by `, `
  - `revealStages(rep: RepRecord): number[][]`: stage 0 = every `start` and `adv` die; stage k+1 = dice whose `parent` is in stage k (a pick's dice share a stage)
  - `toPhysical(size: number): DiceType[] | null` (moved from `src/roll/physical.ts`, unchanged)
  - `facesFor(size: number, value: number, rng: Rng): number[]`: the 3D faces that read as `value`, the inverse of today's `readLogical` (d10's 10 is face 0; d100's 57 is `[50, 7]`, its 100 is `[0, 0]`; d2 from a d4 picks 1 or 2 for 1; d3 from a d6 picks 1 or 2 for 1)
  - `rollFair(size: number): number` (today's `rollVirtual`, `crypto.getRandomValues` with rejection), the app's `Rng`

- [ ] **Step 1: Write the failing tests**

```ts
const line = formatRecord(roll(parse("1d10 crit +3"), seq([10, 2]))).lines[0];
expect(line).toContain("**10**");
expect(line).toContain("= 15");
expect(line).toContain("· CRIT");
const pick = formatRecord(roll(parse("1d10 crit chain 5+ chain adv"), seq([6, 3, 8]))).lines[0];
expect(pick).toContain("chain 2d10kh1 (~~3~~, 8)");
expect(revealStages(roll(parse("1d8 crit"), seq([8, 8, 1])).reps[0])).toEqual([[0], [1], [2]]);
expect(facesFor(10, 10, () => 1)).toEqual([0]);
expect(facesFor(100, 57, () => 1)).toEqual([50, 7]);
expect(facesFor(100, 100, () => 1)).toEqual([0, 0]);
for (const v of [1, 2]) expect(Math.ceil(facesFor(2, v, () => 1)[0] / 2)).toBe(v);
```

- [ ] **Step 2: Run** `npx yarn@1.22.22 vitest run src/engine`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** `format.ts`, `faces.ts`, `revealStages` in `record.ts`; export from `index.ts`.
- [ ] **Step 4: Run again.** Expected: PASS.
- [ ] **Step 5: Commit** `Chong Die 3.0 engine: format, reveal stages, faces` (`npm test`; push).

---

### Task 7: Switch the app to the engine

**Files:**
- Rewrite: `src/chong/rollMeta.ts`, `src/chong/rollRunner.ts` and their tests
- Modify: `src/chong/place.ts`, `src/chong/savedRolls.ts`, `src/chong/CommandLine.tsx`, `src/chong/trackerRolls.test.ts`, `src/controls/DiceResults.tsx`, `src/plugin/usePlayerDice.ts`, `src/chong/Highlights.tsx`, `src/dice/InteractiveDice.tsx`, `src/tray/InteractiveTray.tsx`, `src/chong/prefs.ts`, `src/chong/MoreMenu.tsx`, `src/dice/store.ts` (`addDice` keeps its signature)
- Delete: `src/roll/` (all), `src/chong/InstantToggle*` if present

**Interfaces:**
- Consumes: everything in `src/engine/index.ts`
- Produces:
  - `interface ChongRollMeta { v: 3; record: RollRecord; parts: Record<string, { rep: number; die: number; part: number }>; faces: Record<string, number>; stage: number }` (3D die id → the record's die and its part; the face it must land on; the stage shown so far)
  - `startCommandRoll(input: string, opts: { hidden: boolean; speedMultiplier?: number }): void`: `expand` with the saved names, `parse`, `roll(plan, rollFair)`, then puts stage 0's 3D dice on the tray
  - `revealNext(): void`: when every 3D die of the shown stage has settled, adds the next stage's dice with `popThrow` from each parent's transform; `useRevealRunner()` subscribes it (replaces `useWaveRunner`)
  - `getRollDisplay(roll: DiceRoll): FormattedResult | null`: `formatRecord(meta.record)` once every die of the last stage has settled; a roll whose `chong.v !== 3` returns `{ total: "Old roll", lines: [<its command text if any>] }`
  - `highlightedDice(roll: DiceRoll): string[]`: the 3D id (part 0) of each group's `primary`, for groups with `crit` or `miss` set
  - `highlightTone(roll: DiceRoll, id: string): "plain" | "miss" | "crit"` from the record
  - `SavedRolls` gains `names: Record<string, string>` (validated with `checkName`; `BUILT_IN_NAMES` merged under user names); `chongStore.setName(name, text)` saves or, with empty text, deletes
  - `placeCounts(command)` counts `stageZeroSizes(parse(expand(command, names)))` through `toPhysical`
- Removed: `explodeDie`, `nextWave`, `throwNextWave`, `useWaveRunner`, `logicalValues`, `prefs.nimble` and the ⋯ → Nimble rules item, the right-click / long-press explode in `InteractiveDice`

- [ ] **Step 1: Write the failing tests** (rewrite `rollMeta.test.ts`, `rollRunner.test.ts`, `place.test.ts`, `savedRolls.test.ts`)

```ts
test("a command roll puts stage 0 on the tray and records the faces", () => {
  startCommandRoll("2d6 adv", { hidden: false });
  const { roll } = useDiceRollStore.getState();
  expect(roll!.chong!.v).toBe(3);
  expect(Object.keys(roll!.chong!.parts)).toHaveLength(3);
  expect(Object.keys(roll!.chong!.faces)).toHaveLength(3);
});
test("chain dice wait for their parent to settle", () => { /* finishDieRoll the stage-0 die, revealNext(), expect one more die */ });
test("an old-format roll shows as text", () => {
  expect(getRollDisplay({ dice: [], chong: { command: "!r 1d6" } } as any)).toEqual({ total: "Old roll", lines: ["!r 1d6"] });
});
test("the primary is highlighted only when the group has crit or miss", () => { /* 1d6 → [], 1d6 crit → [id] */ });
test("`atk = …` saves a name and `atk +3` rolls its text", () => { /* setName, then expand */ });
test("placing counts advantage dice", () => expect(placeCounts("2d6 adv")).toEqual({ D6: 3 }));
```

- [ ] **Step 2: Run** `npx yarn@1.22.22 vitest run src/chong`. Expected: FAIL.
- [ ] **Step 3: Implement** the rewrites and removals above. In `CommandLine.tsx`, `parseDefinition` decides between saving a name (show "Saved atk" in the existing banner) and placing a roll; the placeholder becomes `1d20+5`. `trackerRolls.test.ts` imports `parse` and `expand` from `../engine` (its examples change in Task 9; mark that test `.skip` here with a comment pointing at Task 9). Until Task 8 lands, a settled 3D die's own value is ignored; the record is the truth.
- [ ] **Step 4: Run** `npx yarn@1.22.22 test` and `npx yarn@1.22.22 build`. Expected: PASS; the build succeeds.
- [ ] **Step 5: Check in Owlbear** (two players): `2d6 adv`, `1d8 crit` until a crit chain pops, `atk = 1d10 nimble chain 5+ chain adv` then `atk +3`, a hidden roll. The result text and total match on both trays (dice faces may not match the record yet: Task 8).
- [ ] **Step 6: Commit** (version `3.0.0-beta.1` in `public/manifest.json`, rebuilt `chong-die/`, `npm test`)

```bash
git add -A chong-die-src chong-die
git commit -m "Chong Die 3.0.0-beta.1: the app rolls with the new engine"
git push origin main
```

---

### Task 8: Dice land on the record's face

**Files:**
- Create: `src/helpers/faceSymmetry.ts`
- Modify: `src/dice/PhysicsDice.tsx` (a `forcedFace?: number` prop), `src/dice/InteractiveDiceRoll.tsx` (passes `chong.faces[die.id]`)
- Test: `src/helpers/faceSymmetry.test.ts`

**Interfaces:**
- Consumes: `ChongRollMeta.faces` (Task 7); the decision in `DESIGN.md`, Faces (Task 1)
- Produces: `symmetryOnto(locators: { name: string; dir: THREE.Vector3 }[], from: number, to: number): THREE.Quaternion`: a rotation of the solid that moves face `to`'s locator to where face `from`'s locator is, chosen among rotations that map the set of locator directions onto itself (so the silhouette is unchanged)

- [ ] **Step 1: Write the failing test**: for a cube's six locator directions (±x, ±y, ±z named 1 to 6), `symmetryOnto(cube, 2, 5)` applied to locator 5's direction gives locator 2's direction, and maps every locator direction onto some locator direction (tolerance 1e-6).
- [ ] **Step 2: Run** `npx yarn@1.22.22 vitest run src/helpers/faceSymmetry.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `symmetryOnto` (try each locator pair adjacent to `to`, build the rotation from two vector pairs, keep the first that maps the locator set onto itself), then wire `PhysicsDice` with the method `DESIGN.md` names:
  - **settle-then-turn:** on settle, read the top locator `from`; if it isn't `forcedFace`, slerp the mesh's quaternion from identity to `symmetryOnto(…, from, forcedFace)` over 250 ms, then report `forcedFace`.
  - **pre-simulation:** before the visible throw, run the stage headless (Task 1's harness, kept as `src/helpers/preSimulate.ts`), read each die's `from`, set the mesh's quaternion to `symmetryOnto(…, from, forcedFace)`, then throw.
- [ ] **Step 4: Run** `npx yarn@1.22.22 test`, `npx yarn@1.22.22 build`, and check in Owlbear: twenty rolls of `4d6 adv crit`; every die's top face matches the result text, on both players' trays.
- [ ] **Step 5: Commit** `Chong Die 3.0.0-beta.2: dice land on the record's face` (version bump, rebuild, `npm test`, push).

---

### Task 9: Chong's Tracker speaks the new syntax

**Files:**
- Modify: `chongs-tracker/core.js` (`findRolls` and a new `toCommand`), `chongs-tracker/tests/roll-examples.json`, `chongs-tracker/tests/core.test.js`, `chongs-tracker/manifest.json` and the `?v=` links (the tracker's own version rule), `chong-die-src/src/chong/trackerRolls.test.ts` (un-skip)

**Interfaces:**
- Produces: `toCommand(expr: string, times: number): string`, the note's dice text in the new syntax: `NdS!` → `NdS explode`; `kh1` → ` keep 1`, `kl1` → ` keep low 1`; `d%` → `1d100`; a bare `dS` stays (the engine accepts it); `times > 1` appends ` x<times>`. `findRolls` returns `command: toCommand(expr, times)`.

- [ ] **Step 1: Write the failing tests**: rewrite every `commands` entry of `roll-examples.json` in the new syntax:

```json
{ "line": "Damage: 1d8!+3d8+2", "commands": ["1d8 explode+3d8+2"] },
{ "line": "Damage: (2×) 3d10+1", "commands": ["3d10+1 x2"] },
{ "line": "Roll d20 then 1d20kh1 and d%", "commands": ["d20", "1d20 keep 1", "1d100"] }
```

(and the rest the same way). Both `core.test.js` and `trackerRolls.test.ts` read this file.
- [ ] **Step 2: Run** `npm test` from the root. Expected: the tracker's `findRolls` test FAILS on the new commands.
- [ ] **Step 3: Implement** `toCommand`; use it in `findRolls`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS on both sides. Check in Owlbear: a note roll clicked in the tracker lands on Chong Die's tray.
- [ ] **Step 5: Commit** `Chong's Tracker: note rolls in Chong Die 3.0's syntax` (tracker version bump, Chong Die rebuild if touched, push).

---

### Task 10: Docs and 3.0.0

**Files:**
- Modify: `chong-die-src/DESIGN.md` (Rolling, Nimble and Storage sections rewritten for the engine, stages, faces, names; "Nimble" becomes "Primary Die outlines"), `README.md` (the syntax table becomes the spec's word table; the Nimble paragraph describes `nimble` as a saved name), `chong-die-src/NOTICE.md` (the 3.0 changes), `CLAUDE.md` (Chong Die rule 1: the engine knows general words only; Nimble lives in the editable `nimble` saved name; other systems' rules may be added as words. Rule 7: logic in `src/engine/`), `chong-die/TRACKER.md` (Now: 3.0.0; Removed in 3.0: Avrae syntax, waves, right-click exploding, the Nimble switch), `chong-die-src/public/manifest.json` → `3.0.0`

- [ ] **Step 1:** Write the docs above, from the spec's wording.
- [ ] **Step 2:** `npm test` and `npx yarn@1.22.22 build`. Expected: PASS, build succeeds.
- [ ] **Step 3: Commit**

```bash
git add -A chong-die-src chong-die README.md CLAUDE.md
git commit -m "Chong Die 3.0.0: the roll engine rebuilt, CLI-first and engine-decided"
git push origin main
```
