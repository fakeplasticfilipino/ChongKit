# Chong Die 4.0 Command Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Chong Die's 3.x command words with the glued 4.0 language (`1d10+3 crit miss adv3 critadv x2`), remove saved names, notes and the Chong's Tracker roll link, and narrow the Rolls panel to 280 px.

**Architecture:** The engine (`chong-die-src/src/engine/`) stays pure TS: `parse` (rewritten as a scanner, the only module that knows the words) → `roll` → `record` → `format`. Roll-level words move from each group onto the `Plan`, and they act on the first dice group. The app loses `expand`, saved names and the tracker plumbing. Chong's Tracker loses `findRolls` and its clickable rolls.

**Tech Stack:** TypeScript, React, Vitest (Chong Die), built with Vite via `npx yarn@1.22.22 build`; vanilla JS + `node:test` (Chong's Tracker).

**Spec:** `chong-die-src/docs/2026-10-08-command-language-v4-design.md`

## Global Constraints

- **The chain rule (non-negotiable):** only the Primary Die checks the `crit` range. Landing in it is a crit and starts one chain pick. A chain die crits, and chains again, **only on its maximum**, never on the range.
- Words: `adv`/`dis` (bare = 1), `crit` (bare = the die's max), `miss` (bare = 1), `critadv` (bare = 1, needs `crit`), `xN` (1–25, number required). The number or range `N` / `N-M` is glued to the word. Words act on the first dice group only.
- Removed: `keep`, `low`, `drop`, `chain`, `each`, `explode`, the `5+` / `4-` ranges, saved names, `# notes`. No migration of old saves.
- The record and `ChongRollMeta` become `v: 4`.
- `PANEL_WIDTH` = 280 (fixed).
- Repo rules (`CLAUDE.md`):
  - Run `git pull --rebase origin main` before starting and before pushing.
  - Commit to `main`, no branches.
  - Bump Chong Die `public/manifest.json` to `4.0.0`.
  - Rebuild `chong-die/` and commit it.
  - Bump Chong's Tracker `manifest.json` and every `?v=` to `1.10.0`.
  - List the changes in `chong-die-src/NOTICE.md`.
- **Commit locally after each task; push only at the end of Task 6**, after the build, so the site never serves a half-done mix.
- Run commands from the repo root `C:\Users\Chauncy\Documents\ChongKit` unless a step says otherwise. Chong Die tests: `cd chong-die-src && npx yarn@1.22.22 test`.

**User decisions (already made):**
- "1d10 + 3 crit = 10 miss = 1" → then "I don't think = is necessary. 1d10 + 3 crit10 miss1 adv3 could work very well".
- Bare words take defaults: `crit` = max, `miss` = 1 ("I really want to go bare").
- "a chain die strictly only explodes in a crit, you can only modify the very first one. This is non-negotiable."
- Drop `crit each` ("I can't see a test case for it"), `keep`, saved names and notes ("I never needed them").
- `critadv` (option A); no `critdis`.
- Drop `explode`: "No more chong tracker shenanigans, it's just pure text now".
- Remove the tracker ↔ Chong Die link: "no connection whatsoever".
- Old saves: "I don't care about the already-saved, it's never been hosted".
- Words act on the whole command / first dice (option A).
- Panel: fixed 280 px.

---

### Task 1: Engine speaks 4.0

**Goal:** `parse`, `range`, `types`, `roll` and `format` implement the 4.0 language and the chain rule; `expand.ts` is gone.

**Files:**
- Modify: `chong-die-src/src/engine/types.ts`, `range.ts`, `parse.ts`, `roll.ts`, `format.ts`, `index.ts`
- Delete: `chong-die-src/src/engine/expand.ts`, `chong-die-src/src/engine/expand.test.ts`
- Test (rewrite): `chong-die-src/src/engine/range.test.ts`, `parse.test.ts`, `roll.test.ts`, `format.test.ts`, `record.test.ts`

**Acceptance Criteria:**
- [ ] `parse("1d10+3 crit miss")` gives `crit {10,10}`, `miss {1,1}`, `modifier 3`.
- [ ] Every error case in the parse test table throws an `EngineError` with the listed message.
- [ ] With `1d10 crit5-10`, a 7 on the Primary Die is a crit and chains. A chain die showing 6 does not chain, and a chain die showing 10 does.
- [ ] Records are `v: 4` with no `note`.
- [ ] All engine Vitest files pass.

**Verify:** `cd chong-die-src && npx yarn@1.22.22 vitest run src/engine` → all engine test files pass

**Steps:**

- [ ] **Step 1: Write the new tests.** Replace these four files in full.

`chong-die-src/src/engine/range.test.ts`:

```ts
import { expect, test } from "vitest";
import { inRange, parseRange } from "./range";

test("N and N-M", () => {
  expect(parseRange("5")).toEqual({ min: 5, max: 5 });
  expect(parseRange("1-4")).toEqual({ min: 1, max: 4 });
});
test("anything else is not a range", () => {
  for (const s of ["5+", "4-", "3-1", "", "a", "1-2-3", "-1"]) expect(parseRange(s)).toBeNull();
});
test("inRange is inclusive", () => {
  const r = { min: 5, max: 10 };
  expect([4, 5, 10, 11].map((v) => inRange(v, r))).toEqual([false, true, true, false]);
});
```

`chong-die-src/src/engine/parse.test.ts`:

```ts
import { expect, test } from "vitest";
import { EngineError, parse, stageZeroSizes } from "./index";

test("Nimble's attack: bare crit is the die's max, bare miss is 1", () => {
  const p = parse("1d10+3 crit miss");
  expect(p.groups).toEqual([{ sign: 1, count: 1, size: 10 }]);
  expect(p).toMatchObject({
    text: "1d10+3 crit miss", modifier: 3, times: 1, adv: 0, dis: 0, critAdv: 0,
    crit: { min: 10, max: 10 }, miss: { min: 1, max: 1 },
  });
});
test("words after the modifier; signs glued or spaced", () => {
  const a = parse("1d10 + 3 crit miss adv3");
  const b = parse("1d10+3 crit miss adv3");
  expect(a.groups).toEqual(b.groups);
  expect([a.modifier, a.adv, b.modifier, b.adv]).toEqual([3, 3, 3, 3]);
});
test("numbers and ranges glued to words", () => {
  expect(parse("1d10 crit5-10 miss1-4 critadv2 dis2 x3")).toMatchObject({
    crit: { min: 5, max: 10 }, miss: { min: 1, max: 4 }, critAdv: 2, dis: 2, times: 3,
  });
  expect(parse("1d10 crit critadv").critAdv).toBe(1);
  expect(parse("1d20 adv").adv).toBe(1);
});
test("a range's - belongs to it; a spaced - subtracts", () => {
  expect(parse("1d10 crit5 -2")).toMatchObject({ crit: { min: 5, max: 5 }, modifier: -2 });
  expect(parse("1d10 miss1-4+2")).toMatchObject({ miss: { min: 1, max: 4 }, modifier: 2 });
});
test("words act on the first dice; other dice and numbers add", () => {
  const p = parse("1d10 + 1d6 - 1d4 + 3 crit adv");
  expect(p.groups).toEqual([
    { sign: 1, count: 1, size: 10 }, { sign: 1, count: 1, size: 6 }, { sign: -1, count: 1, size: 4 },
  ]);
  expect(p.crit).toEqual({ min: 10, max: 10 });
  expect(stageZeroSizes(p)).toEqual([10, 10, 6, 4]);
});
test("d20, d% and any case", () => {
  expect(parse("d20").groups[0]).toEqual({ sign: 1, count: 1, size: 20 });
  expect(parse("2d%").groups[0].size).toBe(100);
  expect(parse("1D10 CRIT MISS").crit).toEqual({ min: 10, max: 10 });
});
test("x repeats the whole roll", () => {
  expect(stageZeroSizes(parse("1d10 adv x2"))).toEqual([10, 10, 10, 10]);
});
test.each([
  ["", /Empty command/],
  ["crit 1d10", /"crit" comes before any dice/],
  ["1d10 crit crit5", /crit appears twice/],
  ["1d10 adv adv2", /adv appears twice/],
  ["1d10 x2 x3", /x appears twice/],
  ["1d10 crit11", /"crit11" is outside the d10's 1 to 10/],
  ["1d10 miss0", /outside/],
  ["1d10 miss3-1", /low to high/],
  ["1d10 crit5-2", /low to high/],
  ["1d10 crit5-10 miss1-5", /crit and miss overlap/],
  ["1d1 crit miss", /crit and miss overlap/],
  ["1d10 critadv", /critadv needs crit/],
  ["1d10 x", /x needs a number/],
  ["1d10 x0", /x1 to x25/],
  ["1d10 x26", /x1 to x25/],
  ["1d10 adv0", /"adv0" must be 1 to 100/],
  ["1d10 keep 1", /Unknown word "keep"/],
  ["1d10 explode", /Unknown word "explode"/],
  ["1d10 chain", /Unknown word "chain"/],
  ["1d10 # sword", /Unknown word "#"/],
  ["1d10 crit 10", /Put a \+ or - before "10"/],
  ["1d10 +", /A trailing "\+" needs dice or a number after it/],
  ["1d10 crit5-", /A trailing "-"/],
  ["1d10 + + 2", /"\+" needs dice or a number after it/],
  ["1d10 + crit", /"\+" needs dice or a number after it/],
  ["3", /No dice/],
  ["0d6", /needs at least 1 die/],
  ["1d0", /1 to 1000 sides/],
  ["101d6", /More than 100 dice/],
  ["50d6 adv x3", /More than 100 dice/],
])("%s → error", (cmd, message) => {
  expect(() => parse(cmd)).toThrow(EngineError);
  expect(() => parse(cmd)).toThrow(message);
});
```

`chong-die-src/src/engine/roll.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { parse } from "./parse";
import { marks } from "./record";
import { roll, seq } from "./roll";

const rep = (cmd: string, vals: number[]) => roll(parse(cmd), seq(vals)).reps[0];

describe("advantage (p.16)", () => {
  test("2d6 adv: 3d6, drop the lowest", () => {
    const r = rep("2d6 adv", [4, 2, 5]);
    expect(r.dice.map((d) => [d.value, d.kind, d.kept])).toEqual([[4, "start", true], [2, "start", false], [5, "adv", true]]);
    expect(r.groups[0].primary).toBe(0);
    expect(r.total).toBe(9);
  });
  test("dis2: two extra, drop the two highest", () => {
    const r = rep("2d6 dis2", [6, 3, 2, 5]);
    expect(r.dice.filter((d) => d.kept).map((d) => d.value)).toEqual([3, 2]);
    expect(r.groups[0].primary).toBe(1);
  });
  test("ties are removed from the left", () => {
    expect(rep("2d6 adv", [3, 3, 5]).dice.map((d) => d.kept)).toEqual([false, true, true]);
  });
  test("rushed attack: 1d4 dis2 (p.4)", () => expect(rep("1d4 dis2", [4, 1, 3]).total).toBe(1));
  test("counters cancel first", () => expect(rep("2d6 adv3 dis1", [1, 2, 3, 4]).dice).toHaveLength(4));
  test("only the first group gets advantage", () => {
    const r = rep("1d10 + 1d6 adv", [2, 9, 4]);
    expect(r.dice.map((d) => [d.group, d.kind, d.kept])).toEqual([[0, "start", false], [0, "adv", true], [1, "start", true]]);
    expect(r.total).toBe(13);
  });
});

test("signs, modifier and repetitions", () => {
  const rec = roll(parse("1d6 - 1d4 + 2 x2"), seq([5, 3, 1, 4]));
  expect(rec.reps.map((r) => r.total)).toEqual([4, -1]);
  expect(rec.v).toBe(4);
  expect(rec.text).toBe("1d6 - 1d4 + 2 x2");
  expect("note" in rec).toBe(false);
});
test("ids count from 0 per repetition and across groups", () => {
  const rec = roll(parse("1d6 + 1d4 x2"), seq([1, 2, 3, 4]));
  expect(rec.reps[1].dice.map((d) => [d.id, d.group])).toEqual([[0, 0], [1, 1]]);
});
test("seq throws when it runs out", () => {
  expect(() => roll(parse("2d6"), seq([1]))).toThrow(/ran out/);
});

describe("crit and the chain rule", () => {
  test("bare crit: Grudge's battleaxe 8, 8, 1 (p.3)", () => {
    const r = rep("1d8 crit", [8, 8, 1]);
    expect(r.total).toBe(17);
    expect(r.dice.map((d) => [d.kind, d.crit])).toEqual([["start", true], ["chain", true], ["chain", false]]);
  });
  test("only the Primary Die checks crit: Glow's 4d6 (p.3)", () => {
    const r = rep("4d6 crit", [6, 5, 3, 1, 4]);
    expect(r.total).toBe(19);
    expect(r.dice[4]).toMatchObject({ kind: "chain", parent: 0, source: "crit", pick: 4 });
  });
  test("the Primary Die in the crit range is a crit and chains", () => {
    const r = rep("1d10 crit5-10", [7, 3]);
    expect(r.dice[0].crit).toBe(true);
    expect(r.dice).toHaveLength(2);
    expect(r.total).toBe(10);
    expect(marks(r)).toEqual(["CRIT"]);
  });
  test("a chain die in the range but under its max does not chain (the table's rule)", () => {
    const r = rep("1d10 crit5-10", [7, 6]);
    expect(r.dice).toHaveLength(2);
    expect(r.dice[1].crit).toBe(false);
  });
  test("a chain die on its max chains again", () => {
    const r = rep("1d10 crit5-10", [5, 10, 2]);
    expect(r.dice).toHaveLength(3);
    expect(r.total).toBe(17);
  });
  test("under the range: nothing more", () => {
    const r = rep("1d10 crit5-10", [4]);
    expect(r.dice).toHaveLength(1);
    expect(marks(r)).toEqual([]);
  });
  test("advantage picks the Primary Die before crit is checked", () => {
    expect(rep("1d10 crit adv", [10, 3, 4]).total).toBe(14);
    const r = rep("1d10 crit adv", [3, 10, 4]);
    expect(r.groups[0].primary).toBe(1);
    expect(r.dice[2]).toMatchObject({ kind: "chain", parent: 1 });
  });
  test("only the first group can crit", () => {
    const r = rep("1d6 + 1d6 crit miss", [3, 6]);
    expect(r.dice).toHaveLength(2);
    expect(r.groups.map((g) => [g.usesCrit, g.usesMiss, g.crit])).toEqual([[true, true, false], [false, false, false]]);
  });
});

describe("critadv", () => {
  test("each chain die is a pick of two, the higher kept", () => {
    const r = rep("1d10 crit critadv", [10, 3, 8]);
    expect(r.dice.slice(1).map((d) => [d.value, d.kept, d.pick, d.parent])).toEqual([[3, false, 1, 0], [8, true, 1, 0]]);
    expect(r.total).toBe(18);
  });
  test("pick ties keep the leftmost", () => {
    expect(rep("1d6 crit critadv", [6, 3, 3]).dice.map((d) => d.kept)).toEqual([true, true, false]);
  });
  test("a kept max in a pick chains again", () => {
    const r = rep("1d10 crit critadv", [10, 10, 2, 4, 1]);
    expect(r.total).toBe(24);
    expect(marks(r)).toEqual(["CRIT"]);
  });
});

describe("miss", () => {
  test("marks the roll when the Primary Die is in range", () => {
    expect(marks(rep("1d20 miss", [1]))).toEqual(["MISS"]);
    expect(marks(rep("1d10 miss1-4", [4]))).toEqual(["MISS"]);
    expect(marks(rep("1d10 miss1-4", [5]))).toEqual([]);
  });
  test("looks at the Primary Die after disadvantage", () => {
    expect(marks(rep("1d20 miss dis", [15, 1]))).toEqual(["MISS"]);
  });
});

describe("caps", () => {
  test("a die that always rolls max stops at 20 chain dice and is CAPPED", () => {
    const r = roll(parse("1d1 crit"), () => 1).reps[0];
    expect(r.dice.filter((d) => d.kind === "chain")).toHaveLength(20);
    expect(marks(r)).toContain("CAPPED");
  });
  test("a pick counts as one chain die: 20 picks of 2", () => {
    const r = roll(parse("1d1 crit critadv"), () => 1).reps[0];
    expect(r.dice.filter((d) => d.kind === "chain")).toHaveLength(40);
    expect(r.capped).toBe(true);
  });
  test("the 100-dice cap stops chains", () => {
    const r = roll(parse("1d1 crit critadv50"), () => 1).reps[0];
    expect(r.dice).toHaveLength(52);
    expect(r.capped).toBe(true);
  });
  test("the chain counter is shared across repetitions", () => {
    const rec = roll(parse("1d1 crit x2"), () => 1);
    expect(rec.reps[0].dice).toHaveLength(21);
    expect(rec.reps[1].dice).toHaveLength(1);
    expect(rec.reps[1].capped).toBe(true);
  });
});

test("primaries: the Primary Die only", () => {
  expect(rep("3d10 crit", [4, 5, 6]).groups[0].primaries).toEqual([0]);
  expect(rep("2d10 crit adv", [1, 7, 9]).groups[0].primaries).toEqual([1]);
});
```

`chong-die-src/src/engine/format.test.ts`:

```ts
import { expect, test } from "vitest";
import { parse } from "./parse";
import { roll, seq } from "./roll";
import { formatRecord } from "./format";

const f = (cmd: string, vals: number[]) => formatRecord(roll(parse(cmd), seq(vals)));

test("crit die bold, modifier, total and mark", () => {
  expect(f("1d10+3 crit", [10, 2]).lines[0]).toBe("1d10 (**10**) + chain (2) + 3 = 15 · CRIT");
});
test("a crit-range value is bold too", () => {
  expect(f("1d10 crit5-10", [7, 4]).lines[0]).toBe("1d10 (**7**) + chain (4) = 11 · CRIT");
});
test("chain picks", () => {
  expect(f("1d10 crit critadv", [10, 3, 8]).lines[0]).toBe("1d10 (**10**) + chain 2d10kh1 (~~3~~, 8) = 18 · CRIT");
  expect(f("1d10 crit critadv", [10, 4, 10, 3, 2]).lines[0]).toBe(
    "1d10 (**10**) + chain 2d10kh1 (~~4~~, **10**) + chain 2d10kh1 (3, ~~2~~) = 23 · CRIT");
});
test("a 1 is bold, a dropped 1 is not", () => {
  expect(f("1d20", [1]).lines[0]).toBe("1d20 (**1**) = 1");
  expect(f("2d20 adv", [1, 5, 9]).lines[0]).toBe("3d20kh2 (~~1~~, 5, 9) = 14");
});
test("labels for adv and dis", () => {
  expect(f("2d6 adv", [1, 2, 3]).lines[0]).toBe("3d6kh2 (~~1~~, 2, 3) = 5");
  expect(f("2d6 dis", [4, 2, 6]).lines[0]).toBe("3d6kl2 (4, 2, ~~6~~) = 6");
});
test("a negative group and subtraction", () => {
  expect(f("1d6 - 1d4 - 2", [5, 3]).lines[0]).toBe("1d6 (5) - 1d4 (3) - 2 = 0");
});
test("miss mark", () => {
  expect(f("1d20 crit miss", [1]).lines[0]).toBe("1d20 (**1**) = 1 · MISS");
});
test("repetitions and their totals", () => {
  const r = f("2d6 crit miss x2", [1, 6, 5, 3]);
  expect(r.lines.length).toBe(2);
  expect(r.total).toBe(r.lines.map((l) => l.split(" = ")[1].split(" ")[0]).join(", "));
});
test("a tied disadvantage still reads kl", () => {
  expect(f("2d6 dis", [4, 4, 4]).lines[0]).toMatch(/^3d6kl2 /);
});
test("a d1's 1 is not bold", () => {
  expect(f("1d1", [1]).lines[0]).toBe("1d1 (1) = 1");
});
```

In `chong-die-src/src/engine/record.test.ts`, change `"2d6 crit miss 4-"` to `"2d6 crit miss1-4"` (twice). Replace the last test with:

```ts
test("reveal stages: start and adv dice share stage 0, a pick shares a stage", () => {
  const rep = roll(parse("1d10 adv crit critadv"), seq([3, 10, 4, 10, 2, 6])).reps[0];
  expect(revealStages(rep)).toEqual([[0, 1], [2, 3], [4, 5]]);
});
```

How this test runs: 3 and 10 are rolled, and 3 is dropped, so die 1 (the 10) is the Primary Die and crits. Pick (2, 3) rolls 4 and 10, keeps the 10, and it crits. Pick (4, 5) rolls 2 and 6.

Delete `chong-die-src/src/engine/expand.ts` and `expand.test.ts`.

- [ ] **Step 2: Run the tests and see them fail.**

Run: `cd chong-die-src && npx yarn@1.22.22 vitest run src/engine`
Expected: FAIL. The parse, roll and format tests fail (old words, `v` 3), and `index.ts` fails to import `./expand`.

- [ ] **Step 3: Write `types.ts`.** Replace everything from the top of the file through the end of `Plan` with the block below, and keep `EngineError` and the `MAX_*` constants as they are:

```ts
/** Inclusive range of face values: `5` → { min: 5, max: 5 }, `5-10` → { min: 5, max: 10 } */
export type Range = { min: number; max: number };

/** Dice of one size joined into the command by a sign: `1d10`, `+ 2d6`, `- 1d4` */
export interface GroupPlan {
  sign: 1 | -1;
  count: number;
  size: number;
}

export interface Plan {
  /** The input text as given (trimmed). */
  text: string;
  groups: GroupPlan[];
  modifier: number;
  times: number;
  /** The words, all acting on the first group (`groups[0]`) */
  adv: number;
  dis: number;
  /** The Primary Die in this range crits and starts a chain */
  crit: Range | null;
  /** The Primary Die in this range marks the roll MISS */
  miss: Range | null;
  /** Extra dice in each chain pick (the highest is kept) */
  critAdv: number;
}
```

Then set `DieKind` to `"start" | "adv" | "chain"`. In `RolledDie`, set `source: "crit" | null;` with the doc comment `/** "crit" on a chain die: it came from a crit */`. In `GroupResult`, change the `primaries` doc to `/** The dice outlined as Primary Dice: `[primary]` (empty when none). */`. Replace `RollRecord` with:

```ts
export interface RollRecord {
  v: 4;
  modifier: number;
  text: string;
  reps: RepRecord[];
}
```

- [ ] **Step 4: Replace `range.ts`.**

```ts
import { Range } from "./types";

/** `5` (exactly 5) or `5-10` (5 to 10, low to high). Null when it isn't one. */
export function parseRange(text: string): Range | null {
  const m = /^(\d+)(?:-(\d+))?$/.exec(text);
  if (!m) return null;
  const min = +m[1];
  const max = m[2] === undefined ? min : +m[2];
  return min <= max ? { min, max } : null;
}

export function inRange(v: number, r: Range): boolean {
  return v >= r.min && v <= r.max;
}
```

- [ ] **Step 5: Replace `parse.ts`.**

```ts
import { parseRange } from "./range";
import { EngineError, GroupPlan, MAX_DICE, MAX_SIDES, MAX_TIMES, Plan, Range } from "./types";

const DICE = /^(\d*)d(\d+|%)$/i;
/** The words (the only list of them): a word glued to an optional number, or a range for crit/miss */
const WORD = /^(critadv|adv|dis|crit|miss)(\d+(?:-\d+)?)?$/i;
const TIMES = /^x(\d+)$/i;
/** A sign; a crit/miss range glued whole (its - is the range's); else a run of anything but spaces and signs */
const TOKEN = /\s*(?:([+-])|((?:crit|miss)\d+-\d+)(?=[\s+-]|$)|([^\s+-]+))/iy;

const bad = (m: string) => new EngineError(m);

function tokenize(text: string): string[] {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.length) {
    const m = TOKEN.exec(text);
    if (!m) break;
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

function diceGroup(sign: 1 | -1, tok: string, m: RegExpExecArray): GroupPlan {
  const count = m[1] === "" ? 1 : +m[1];
  const size = m[2] === "%" ? 100 : +m[2];
  if (count < 1) throw bad(`"${tok}" needs at least 1 die`);
  if (count > MAX_DICE) throw bad(`More than ${MAX_DICE} dice`);
  if (size < 1 || size > MAX_SIDES) throw bad(`"${tok}" must have 1 to ${MAX_SIDES} sides`);
  return { sign, count, size };
}

/** The range glued to crit/miss (`bare` when there is none); it must fit the first group's die */
function rangeOf(tok: string, arg: string, bare: number, size: number): Range {
  const r = arg === "" ? { min: bare, max: bare } : parseRange(arg);
  if (!r) throw bad(`"${tok}": a range goes low to high, like miss1-4`);
  if (r.min < 1 || r.max > size) throw bad(`"${tok}" is outside the d${size}'s 1 to ${size}`);
  return r;
}

/** Turn a command into a Plan, or throw an EngineError saying what is wrong. */
export function parse(input: string): Plan {
  const text = input.trim();
  const tokens = tokenize(text);
  if (tokens.length === 0) throw bad("Empty command");

  const groups: GroupPlan[] = [];
  const seen = new Set<string>();
  let modifier = 0;
  let times = 1;
  let adv = 0;
  let dis = 0;
  let critAdv = 0;
  let crit: string | null = null;
  let miss: string | null = null;
  let critTok = "";
  let missTok = "";
  let sign: 1 | -1 | null = null;
  let started = false;
  const symbol = () => (sign === 1 ? "+" : "-");

  for (const tok of tokens) {
    if (tok === "+" || tok === "-") {
      if (sign !== null) throw bad(`"${symbol()}" needs dice or a number after it`);
      sign = tok === "+" ? 1 : -1;
      continue;
    }
    const dice = DICE.exec(tok);
    if (dice || /^\d+$/.test(tok)) {
      if (started && sign === null) throw bad(`Put a + or - before "${tok}"`);
      const s = sign ?? 1;
      sign = null;
      started = true;
      if (dice) groups.push(diceGroup(s, tok, dice));
      else modifier += s * +tok;
      continue;
    }
    if (sign !== null) throw bad(`"${symbol()}" needs dice or a number after it`);
    if (/^x$/i.test(tok)) throw bad("x needs a number, like x2");
    const x = TIMES.exec(tok);
    const w = WORD.exec(tok);
    if (!x && !w) throw bad(`Unknown word "${tok}"`);
    if (groups.length === 0) throw bad(`"${tok}" comes before any dice`);
    const name = x ? "x" : w![1].toLowerCase();
    if (seen.has(name)) throw bad(`${name} appears twice`);
    seen.add(name);
    const arg = x ? x[1] : w![2] ?? "";
    if (name === "x") {
      times = +arg;
      if (times < 1 || times > MAX_TIMES) throw bad(`"${tok}" must be x1 to x${MAX_TIMES}`);
    } else if (name === "crit") {
      crit = arg;
      critTok = tok;
    } else if (name === "miss") {
      miss = arg;
      missTok = tok;
    } else {
      // adv/dis/critadv never get a range: the tokenizer only glues one to crit and miss
      const n = arg === "" ? 1 : +arg;
      if (n < 1 || n > MAX_DICE) throw bad(`"${tok}" must be 1 to ${MAX_DICE}`);
      if (name === "adv") adv = n;
      else if (name === "dis") dis = n;
      else critAdv = n;
    }
  }
  if (sign !== null) throw bad(`A trailing "${symbol()}" needs dice or a number after it`);
  if (groups.length === 0) throw bad("No dice");
  if (critAdv && crit === null) throw bad("critadv needs crit");

  const size = groups[0].size;
  const critRange = crit === null ? null : rangeOf(critTok, crit, size, size);
  const missRange = miss === null ? null : rangeOf(missTok, miss, 1, size);
  if (critRange && missRange && critRange.min <= missRange.max && missRange.min <= critRange.max) {
    throw bad("crit and miss overlap");
  }
  const plan: Plan = { text, groups, modifier, times, adv, dis, crit: critRange, miss: missRange, critAdv };
  if (stageZeroSizes(plan).length > MAX_DICE) throw bad(`More than ${MAX_DICE} dice`);
  return plan;
}

/** One entry (the die's size) per die of the first throw, all repetitions; advantage dice join the first group. */
export function stageZeroSizes(plan: Plan): number[] {
  const out: number[] = [];
  const extra = Math.abs(plan.adv - plan.dis);
  for (let t = 0; t < plan.times; t++) {
    plan.groups.forEach((g, i) => {
      const n = g.count + (i === 0 ? extra : 0);
      for (let k = 0; k < n; k++) out.push(g.size);
    });
  }
  return out;
}
```

- [ ] **Step 6: Replace `roll.ts`.**

```ts
import { stageZeroSizes } from "./parse";
import { inRange } from "./range";
import { GroupPlan, GroupResult, Plan, RepRecord, RolledDie, Rng, RollRecord, MAX_DICE, MAX_FOLLOW } from "./types";

/** Test helper: an Rng that returns these values in order, and throws when they run out. */
export function seq(values: number[]): Rng {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`seq ran out of values after ${values.length}`);
    return values[i++];
  };
}

/** Rolls a group's dice, then `extra` advantage dice (p.16). Ids continue from `nextId`. */
export function rollGroup(g: GroupPlan, extra: number, group: number, rng: Rng, nextId: number): RolledDie[] {
  const dice: RolledDie[] = [];
  for (let i = 0; i < g.count + extra; i++) {
    dice.push({
      id: nextId + i, group, size: g.size, value: rng(g.size),
      kind: i < g.count ? "start" : "adv", kept: true, crit: false,
      parent: null, pick: null, source: null,
    });
  }
  return dice;
}

/** Net advantage drops that many lowest, net disadvantage that many highest (p.16); ties: the leftmost first. */
export function applyAdvantage(net: number, dice: RolledDie[]): void {
  if (net === 0) return;
  const order = dice
    .filter((d) => d.kept)
    .sort((a, b) => (net < 0 ? b.value - a.value : a.value - b.value) || a.id - b.id);
  for (const d of order.slice(0, Math.abs(net))) d.kept = false;
}

/** Counters shared by every repetition of one command (the caps). */
interface Budget {
  follow: number;
  dice: number;
}

/**
 * A chain die: `1 + critAdv` dice of the parent's size, the highest kept (ties: the leftmost).
 * The table's rule: it crits, and chains again, only on its max, never on the crit range.
 */
function chainPick(parent: RolledDie, critAdv: number, rng: Rng, nextId: number): RolledDie[] {
  const dice: RolledDie[] = [];
  for (let i = 0; i <= critAdv; i++) {
    dice.push({
      id: nextId + i, group: parent.group, size: parent.size, value: rng(parent.size),
      kind: "chain", kept: true, crit: false, parent: parent.id, pick: nextId, source: "crit",
    });
  }
  let best = dice[0];
  for (const d of dice) if (d.value > best.value) best = d;
  for (const d of dice) d.kept = d === best;
  best.crit = best.value === best.size;
  return dice;
}

/** The first kept start or adv die, by id. */
export function primaryOf(dice: RolledDie[]): number | null {
  return dice.find((d) => d.kept && (d.kind === "start" || d.kind === "adv"))?.id ?? null;
}

function rollRep(plan: Plan, rng: Rng, budget: Budget): RepRecord {
  const dice: RolledDie[] = [];
  const groups: GroupResult[] = [];
  const net = plan.adv - plan.dis;
  plan.groups.forEach((g, gi) => {
    // The words act on the first group only
    const first = gi === 0;
    const own = rollGroup(g, first ? Math.abs(net) : 0, gi, rng, dice.length);
    if (first) applyAdvantage(net, own);
    const primary = primaryOf(own);
    const pd = own.find((d) => d.id === primary);
    if (first && pd && plan.crit) pd.crit = inRange(pd.value, plan.crit);
    dice.push(...own);
    groups.push({
      sign: g.sign,
      label: labelOf(g, own, first ? net : 0),
      primary,
      primaries: primary === null ? [] : [primary],
      miss: !!(first && pd && plan.miss && inRange(pd.value, plan.miss)),
      crit: false,
      usesCrit: first && plan.crit !== null,
      usesMiss: first && plan.miss !== null,
    });
  });
  // Chains, breadth-first in id order: every crit die earns one chain pick, with the next ids
  let capped = false;
  for (let i = 0; i < dice.length; i++) {
    const die = dice[i];
    if (!die.kept || !die.crit) continue;
    const size = 1 + plan.critAdv;
    if (budget.follow + 1 > MAX_FOLLOW || budget.dice + size > MAX_DICE) {
      capped = true;
      break;
    }
    budget.follow += 1;
    budget.dice += size;
    dice.push(...chainPick(die, plan.critAdv, rng, dice.length));
  }
  for (const d of dice) if (d.crit) groups[d.group].crit = true;
  // Totals come from the kept dice once every die of the repetition has been rolled.
  let total = plan.modifier;
  for (const d of dice) if (d.kept) total += plan.groups[d.group].sign * d.value;
  return { dice, groups, total, capped };
}

export function roll(plan: Plan, rng: Rng): RollRecord {
  // Every repetition's starting dice count toward the 100-dice cap from the beginning.
  const budget: Budget = { follow: 0, dice: stageZeroSizes(plan).length };
  const reps: RepRecord[] = [];
  for (let i = 0; i < plan.times; i++) reps.push(rollRep(plan, rng, budget));
  return { v: 4, text: plan.text, modifier: plan.modifier, reps };
}

/** The group's dice label: `NdS`, or how many were rolled and which kept (`3d6kh2`, `2d20kl1`). */
function labelOf(g: GroupPlan, own: RolledDie[], net: number): string {
  const kept = own.filter((d) => d.kept).length;
  if (kept === own.length) return `${own.length}d${g.size}`;
  return `${own.length}d${g.size}${net < 0 ? "kl" : "kh"}${kept}`;
}
```

- [ ] **Step 7: Edit `format.ts` and `index.ts`.**

In `format.ts`:
- In `groupText`, delete the line `if (d.kind === "explode") text += \` + explode (${dieText(d)})\`;` and change the following `else if (d.kind === "chain" …)` to `if (d.kind === "chain" …)`.
- Change the `lines` doc comment to `/** One line per repetition: \`~~x~~\` dropped, \`**x**\` a crit or a 1 */`.
- Replace the `formatRecord` body with:

```ts
export function formatRecord(record: RollRecord): FormattedResult {
  return {
    total: record.reps.map((r) => String(r.total)).join(", "),
    lines: record.reps.map((rep) => lineOf(rep, record.modifier)),
  };
}
```

In `index.ts`, delete the line `export * from "./expand";`.

- [ ] **Step 8: Run the engine tests.**

Run: `cd chong-die-src && npx yarn@1.22.22 vitest run src/engine`
Expected: PASS for range, parse, roll, format, record and faces. If `faces.test.ts` uses old words, convert it with the table in Task 2, Step 1.

- [ ] **Step 9: Commit.**

```bash
git add -A chong-die-src/src/engine
git commit -m "Chong Die engine: the 4.0 command language (glued words, crit ranges, critadv; no keep/explode/names/notes)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: App without saved names, record v4

**Goal:** The Chong Die app compiles and its tests pass against the 4.0 engine: saved names and `expand` are gone, and `ChongRollMeta` is `v: 4`.

**Files:**
- Modify: `chong-die-src/src/chong/savedRolls.ts`, `chongStore.ts`, `CommandLine.tsx`, `rollRunner.ts`, `place.ts`, `RollPanel.tsx`, `PillDialog.tsx`, `rollMeta.ts`
- Test (update): `chong-die-src/src/chong/savedRolls.test.ts`, `chongStore.test.ts`, `place.test.ts`, `rollMeta.test.ts`, `rollRunner.test.ts`

**Acceptance Criteria:**
- [ ] `grep -rn "expand\|allNames\|BUILT_IN_NAMES\|checkName\|parseDefinition\|setName\|\.names" chong-die-src/src/chong` finds nothing, apart from unrelated local variables such as `setName` in `PillDialog`'s `useState`.
- [ ] `isCurrentMeta` accepts only `v === 4`, and `buildMeta` writes `v: 4`.
- [ ] The tests contain no old-syntax words (`chain`, `keep`, `explode`, `each`, `nimble`, `# `, `4-`, `5+`).
- [ ] `npx yarn@1.22.22 test` passes, and `npx tsc --noEmit` reports no errors.

**Verify:** `cd chong-die-src && npx tsc --noEmit && npx yarn@1.22.22 test` → no type errors, all tests pass

**Steps:**

- [ ] **Step 1: Update the tests.** Convert the old commands with this table:

| Old | New |
|---|---|
| `crit miss 1` | `crit miss` |
| `miss 4-` | `miss1-4` |
| `crit chain 1+` (dN) | `crit1-N` |
| `crit chain 5+` (d6) | `crit5-6` |
| `crit chain adv` | `crit critadv` |
| `v: 3` / `toBe(3)` on a record or meta version | `v: 4` / `toBe(4)` |

The changes, file by file:
- `place.test.ts`:
  - Change `"1d10 crit chain 1+"` to `"1d10 crit1-10"`.
  - Delete the test that calls `setName("atk", "1d10 nimble")` (around lines 33–38).
- `rollRunner.test.ts`:
  - Change `"1d6 crit chain 1+"` to `"1d6 crit1-6"` (twice, the second time with `+ 2`).
  - Delete the saved-name test (around lines 73–79, `setName("atk", "1d10 nimble # sword")`).
- `rollMeta.test.ts`:
  - Change `"1d6 crit miss 1"` to `"1d6 crit miss"`.
  - Change `"1d10 crit chain adv"` to `"1d10 crit critadv"`.
  - Replace the line `expect(toneOfPrimary("1d6 crit chain 5+", [5, 6, 2])).toBe("plain");` with `expect(toneOfPrimary("1d6 crit5-6", [5, 3])).toBe("crit");`, because in 4.0 the crit range is a crit. If that test's name says "range is not a crit", rename it to `"a primary in the crit range is gold"`.
  - Any `v: 3` becomes `v: 4`.
- `chongStore.test.ts`:
  - Delete the `names` helper and every test that uses `setName` or `names()`.
  - If one test mixed names with other store behaviour, keep that behaviour's assertions only.
- `savedRolls.test.ts`:
  - Delete the tests named "pill error expands saved names", "saved data without names loads with none", "names are checked…", "names that aren't an object are ignored", "built-in names sit under the user's…" and "the built-in names live here…".
  - Remove `s.names = …` lines.
  - In the export/round-trip expectation (around line 177), drop `names: {}` so it reads `toEqual({ version: 1, tabs: [{ id: "a", name: "A", pills: [] }], history: [] })`.
  - Remove `allNames`, `BUILT_IN_NAMES` and `checkName` from the imports.

Run `grep -rnE "chain|keep|explode|each|nimble|# |4-|5\+" chong-die-src/src/chong/*.test.ts` and convert anything left. `rollMeta.test.ts`'s old-format fixture `{ command: "1d6", nimble: true }` stays, because it tests that a foreign format shows as text.

- [ ] **Step 2: Run the tests and see them fail.**

Run: `cd chong-die-src && npx yarn@1.22.22 test`
Expected: FAIL in the `src/chong/*` tests, because `expand` and `allNames` no longer exist and the meta is still `v: 3`.

- [ ] **Step 3: `savedRolls.ts`.**
- Change the import to `import { parse } from "../engine";`.
- Delete `BUILT_IN_NAMES`, `allNames`, `validateNames` and the `names` field (its doc comment too) from `SavedRolls` and `emptySaved()`.
- In `validateSavedRolls`, return `{ version: 1, tabs, history }`. Old `names` in storage are ignored.
- Replace `pillError` with:

```ts
/** Why a pill's command can't roll, or null when it can */
export function pillError(p: Pill): string | null {
  try {
    parse(p.command);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Can't roll this";
  }
}
```

- [ ] **Step 4: `chongStore.ts`.** Delete the `checkName` import, the `setName` member of the state interface (with its doc comment) and the `setName(name, text) {…}` implementation.

- [ ] **Step 5: `CommandLine.tsx`.**
- Delete the `allNames` and engine imports and the `nameProblem` function.
- Delete the `notice` state, `setName`, the `parseDefinition` block in `roll()`, every `setNotice(…)` call, and the `{notice && !error && (…)}` Typography.
- Remove `TEXT2` from the `./look` import if nothing else uses it.
- `roll()` becomes:

```ts
  function roll() {
    const command = text.trim();
    if (!command) {
      return;
    }
    try {
      // A typo shows here and nothing rolls
      placeCommand(command, { hidden });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Can't roll this");
      return;
    }
    recordHistory(command);
    setText("");
    setHistoryIndex(null);
    setError(null);
  }
```

- [ ] **Step 6: `rollRunner.ts` and `place.ts`.**
- In `rollRunner.ts`:
  - Delete `expandCommand` and the `allNames` and `useChongStore` imports, unless `useChongStore` is still used elsewhere in the file.
  - Remove `expand` from the engine import.
  - In `startCommandRoll`, replace `const text = expandCommand(input);` with `const text = input.trim();`.
- In `place.ts`:
  - Change the import to `import { startCommandRoll } from "./rollRunner";`.
  - Replace both `expandCommand(command)` and `expandCommand(input)` with `command.trim()` / `input.trim()` (whichever variable is in scope).

- [ ] **Step 7: `RollPanel.tsx` and `PillDialog.tsx`.**
- In `RollPanel.tsx`:
  - Remove `allNames` from the import.
  - Delete the `// The pills may use saved names` comment and the `names` `useMemo`.
  - Call `pillError(pill)` in both places.
  - Drop `useMemo` from the React import if it's now unused.
- In `PillDialog.tsx`:
  - Import only `pillError`.
  - Use `pillError({ id: "", name, command })`.
  - Remove `saved` and its store selector if they're now unused.

- [ ] **Step 8: `rollMeta.ts`.** Change `v: 3;` to `v: 4;` in `ChongRollMeta`, `.v === 3` to `.v === 4` in `isCurrentMeta`, and `return { v: 3, record, …` to `return { v: 4, record, …` in `buildMeta`.

- [ ] **Step 9: Typecheck and test.**

Run: `cd chong-die-src && npx tsc --noEmit && npx yarn@1.22.22 test`
Expected: no tsc output, and every test passes. Fix any leftover use of the removed `note`, `explode`, `"range"` source or `GroupPlan` fields that tsc reports, for example in `Highlights.tsx`, `DiceResults.tsx` or `faces.ts`.

- [ ] **Step 10: Commit.**

```bash
git add -A chong-die-src/src
git commit -m "Chong Die: no saved names; rolls are the typed text; record v4

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Remove the Chong's Tracker link from Chong Die

**Goal:** Chong Die no longer listens for rolls from Chong's Tracker. The background page only opens the party popover.

**Files:**
- Delete: `chong-die-src/src/chong/channels.ts`, `channels.test.ts`, `incoming.ts`, `incoming.test.ts`, `IncomingRolls.tsx`, `trackerRolls.test.ts`
- Modify: `chong-die-src/src/App.tsx`, `chong-die-src/src/background.ts`

**Acceptance Criteria:**
- [ ] `grep -rn "channels\|incoming\|IncomingRolls\|roll-examples\|com.chongkit.chongdie/roll" chong-die-src/src` finds nothing.
- [ ] `background.ts` contains only the popover `OBR.onReady` block.
- [ ] tsc and the tests pass.

**Verify:** `cd chong-die-src && npx tsc --noEmit && npx yarn@1.22.22 test` → no type errors, all tests pass

**Steps:**

- [ ] **Step 1: Delete the files.**

```bash
git rm chong-die-src/src/chong/channels.ts chong-die-src/src/chong/channels.test.ts chong-die-src/src/chong/incoming.ts chong-die-src/src/chong/incoming.test.ts chong-die-src/src/chong/IncomingRolls.tsx chong-die-src/src/chong/trackerRolls.test.ts
```

- [ ] **Step 2: `App.tsx`.** Delete `import { IncomingRolls } from "./chong/IncomingRolls";` and the `<IncomingRolls />` element. If a comment near it mentions tracker rolls, drop the tracker part.

- [ ] **Step 3: `background.ts`.** Replace the file with:

```ts
import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "./plugin/getPluginId";

OBR.onReady(() => {
  OBR.popover.open({
    id: getPluginId("popover"),
    url: "/ChongKit/chong-die/popover.html",
    width: 0,
    height: 0,
    anchorOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
    transformOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
    disableClickAway: true,
    hidePaper: true,
    marginThreshold: 0,
  });
});
```

- [ ] **Step 4: Typecheck, test and commit.**

Run: `cd chong-die-src && npx tsc --noEmit && npx yarn@1.22.22 test`
Expected: PASS.

```bash
git add -A chong-die-src/src
git commit -m "Chong Die: no link with Chong's Tracker (rolls are copied by hand)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Rolls panel 280 px

**Goal:** The Rolls panel is 280 px wide instead of 360.

**Files:**
- Modify: `chong-die-src/src/chong/layout.ts:2`
- Test: `chong-die-src/src/chong/layout.test.ts`

**Acceptance Criteria:**
- [ ] `PANEL_WIDTH === 280`.
- [ ] `windowWidth(700, true) === 630` and `windowWidth(700, false) === 350`.

**Verify:** `cd chong-die-src && npx yarn@1.22.22 vitest run src/chong/layout.test.ts` → 2 tests pass

**Steps:**

- [ ] **Step 1: Update the test.** In `layout.test.ts`, change `expect(PANEL_WIDTH).toBe(360);` to `toBe(280)` and `expect(windowWidth(700, true)).toBe(710);` to `toBe(630)`.
- [ ] **Step 2: Run it and see it fail.** `cd chong-die-src && npx yarn@1.22.22 vitest run src/chong/layout.test.ts` → FAIL (360 ≠ 280).
- [ ] **Step 3: Change the width.** In `layout.ts`: `export const PANEL_WIDTH = 280;`.
- [ ] **Step 4: Run it and see it pass.** The same command → PASS.
- [ ] **Step 5: Commit.**

```bash
git add chong-die-src/src/chong/layout.ts chong-die-src/src/chong/layout.test.ts
git commit -m "Chong Die: Rolls panel 280 px

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Chong's Tracker: notes are plain text

**Goal:** Chong's Tracker no longer finds, underlines or sends rolls. Notes show as plain text, and a click edits them.

**Files:**
- Modify: `chongs-tracker/core.js:413-475`, `chongs-tracker/app.js:484-525,745`, `chongs-tracker/style.css:179-190`, `chongs-tracker/manifest.json`, `chongs-tracker/index.html`, `chongs-tracker/background.html`, `chongs-tracker/TRACKER.md`
- Delete: `chongs-tracker/tests/roll-examples.json`
- Test: `chongs-tracker/tests/core.test.js`

**Acceptance Criteria:**
- [ ] `grep -rn "findRolls\|toCommand\|chongdie\|sendRoll\|roll-examples\|\.roll\b" chongs-tracker --include=*.js --include=*.css --include=*.html` finds nothing (excluding `vendor/`).
- [ ] The manifest version and every `?v=` are `1.10.0`.
- [ ] `node --test "chongs-tracker/tests/*.test.js"` passes.

**Verify:** `node --test "chongs-tracker/tests/*.test.js"` → all pass, 0 failures

**Steps:**

- [ ] **Step 1: Tests.**
  - In `chongs-tracker/tests/core.test.js`, delete:
    - The comment and `const ROLL_EXAMPLES = require("./roll-examples.json").lines;`.
    - Every test whose name starts with `findRolls:` or `toCommand:` (about lines 255–304).
  - Keep `'paste: Avrae Version damage stays in the entry note'`.
  - `git rm chongs-tracker/tests/roll-examples.json`.
- [ ] **Step 2: `core.js`.** Delete everything from the comment `// Dice rolls in note text, for clicking them into Chong Die.` through the end of `function findRolls(line) {…}`: the constants `DICE_TERM`, `ROLL_RE`, `REPEAT_RE`, `TERM_RE`, `OP_RE` and `OP_WORD`, plus `toCommand` and `findRolls`. In `const api = {`, remove `findRolls, toCommand,` so the line reads `NS, KEYS, PLAYERS_TAB, uid,`.
- [ ] **Step 3: `app.js`.**
  - Delete the block from `// --- Rolls in notes → Chong Die ---` through the end of `function sendRoll(command) {…}`, which includes `ROLL_CHANNEL`, `ACK_CHANNEL`, `waitingAcks` and `ackListening`.
  - In `noteView`, change the comment to `// A note shown as text: click it to edit (the edit box comes back with the raw text; leaving it shows the text again).`
  - Replace the line loop with:

```js
  String(value).split('\n').forEach((line, i) => {
    if (i) view.append(el('br'));
    view.append(line);
  });
```

  - At about line 745, change the comment `// Not a <label>: a label would pass a click on "Note" to the note's first roll button and roll it.` to `// Not a <label>: the note is a text view until clicked, not a field.`
- [ ] **Step 4: `style.css`.** Change the comment `/* A note with its rolls underlined; click a roll to roll it in Chong Die, elsewhere to edit */` to `/* A note shown as text; click it to edit */`. Delete the `.roll { … }` and `.roll:hover { … }` rules.
- [ ] **Step 5: Version 1.10.0.** In `manifest.json`, `"version": "1.10.0"`. In `index.html`, change `style.css?v=1.9.1`, `core.js?v=1.9.1` and `app.js?v=1.9.1` to `?v=1.10.0`. In `background.html`, do the same for `core.js?v=1.9.1` and `background.js?v=1.9.1`.
- [ ] **Step 6: `chongs-tracker/TRACKER.md`.** Add a done entry: `1.10.0: notes are plain text again; rolls in notes no longer link to Chong Die (copy them by hand).` Remove or close any open backlog item about note rolls.
- [ ] **Step 7: Test and commit.**

Run: `node --test "chongs-tracker/tests/*.test.js"`
Expected: PASS, 0 failures.

```bash
git add -A chongs-tracker
git commit -m "Chong's Tracker 1.10.0: notes are plain text (no roll links to Chong Die)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Docs, version 4.0.0, build, push

**Goal:** The docs describe 4.0, the manifest is 4.0.0, `chong-die/` is rebuilt, the full test suite passes, and everything is pushed to `main`.

**Files:**
- Modify: `chong-die-src/public/manifest.json`, `chong-die-src/DESIGN.md`, `chong-die-src/NOTICE.md`, `chong-die-src/docs/2026-10-07-roll-engine-design.md` (one line at the top), `chong-die/TRACKER.md`, `CLAUDE.md`, `README.md`, `TRACKER.md`
- Rebuild: `chong-die/`

**Acceptance Criteria:**
- [ ] `chong-die-src/public/manifest.json` and `chong-die/manifest.json` both say `"version": "4.0.0"`.
- [ ] `grep -nE "chain adv|explode|keep low|crit each|Saved names|nimble = |# note|roll-examples|com.chongkit.chongdie/roll" README.md CLAUDE.md chong-die-src/DESIGN.md` finds nothing.
- [ ] `npm test` at the repo root passes.
- [ ] After `git push`, `git status -sb` shows `main` level with `origin/main`.

**Verify:** `npm test` → all suites pass; `git status -sb` → `## main...origin/main` with no ahead/behind

**Steps:**

- [ ] **Step 1: Manifest.** In `chong-die-src/public/manifest.json`, set `"version": "4.0.0"`.

- [ ] **Step 2: `README.md`, Chong Die section.**
  - Replace the bullet `- **⋯**: Hide rolls, … (your saved rolls and names live in this browser only), about.` with:
    `- **⋯**: Hide rolls, Roll history, other players' trays, export / import (your saved rolls live in this browser only), about.`
  - Delete the bullet `- Rolls clicked in **Chong's Tracker** notes land on this tray, ready to throw.`
  - In the **Outline** bullet, replace `(the first die of a group still kept; with \`crit each\`, every kept die of the first throw)` with `(the first die still kept)`, and replace `(advantage, \`keep\`, \`drop\`)` with `(advantage)`.
  - Replace everything from `**Roll syntax**` through `multiplication and division, and target checks on purpose.` with:

```markdown
**Roll syntax:** dice and numbers joined by `+` or `-` (spaces optional), then words anywhere after
the first dice. Every word is glued to an optional number; the words act on the first dice.

| Word | Means | Example |
|---|---|---|
| `NdS` | N dice of S sides (`d20` is `1d20`, `d%` is `1d100`) | `2d6+1d4-1` |
| `adv`, `adv3`, `dis`, `dis2` | Advantage / disadvantage (bare = 1); they cancel first. Net n adds n dice, then drops the n lowest (highest for `dis`); ties drop from the left | `1d20+5 adv` |
| `crit`, `crit10`, `crit5-10` | The Primary Die in this range (bare: the die's max) crits and adds a chain die | `1d10+3 crit` |
| `miss`, `miss1`, `miss1-4` | Mark MISS when the Primary Die is in this range (bare: 1) | `1d10+3 crit miss` |
| `critadv`, `critadv2` | Chain dice roll with advantage (needs `crit`) | `1d10 crit critadv` |
| `x2`, `x3` | Roll the whole command N times, separately (1 to 25) | `1d10+3 crit miss x2` |

Nimble's attack is `1d10+3 crit miss`. The Primary Die is the first die still kept after advantage.
A chain die is one more die of the same size added to the total (with `critadv`, an advantage pick);
**a chain die chains again only on its max**, never on the crit range. A range's `-` is part of it
(`crit5-10`); to subtract, leave a space (`crit5 -2`). Errors show under the command line (a word
twice, a range outside the die or backwards, `crit` and `miss` overlapping, `critadv` without
`crit`, unknown words). Limits: 100 dice per roll and 20 chain dice; a roll that hits either stops
adding dice and is marked CAPPED. d2 and d3 are read from a d4 and a d6; other odd sizes (d5, d30, …)
are rolled without a 3D die. Chong Die leaves out keep/drop, exploding dice, rerolls, multiplication
and division, and target checks on purpose.
```

  - In the table row at line 10, change `✅ v3` to `✅ v4` and `saved rolls and names in a panel` to `saved rolls in a panel`.
  - In the Chong's Tracker section, delete the whole `- **Rolls in notes:** …` bullet (through `Click anywhere else in the note to edit it.`). Add `Click a note to edit it.` to the end of the **Notes** bullet.

- [ ] **Step 3: `CLAUDE.md`.**
  - Delete Chong's Tracker rule 9 (`9. **Rolls in notes go to Chong Die.** …` through `(`src/chong/channels.ts`).`).
  - Replace Chong Die rule 1 with:
    `1. **System-agnostic.** The engine knows general words only (`adv`, `dis`, `crit`, `miss`, `critadv`, `xN`), never a game system. Nimble is just `1d10+3 crit miss`; other systems' rules may be added as words, never as built-in behaviour. The chain rule is the table's: only the Primary Die checks the `crit` range; a chain die chains again only on its max.`
  - Replace Chong Die rule 6 (the three contract bullets) with:
    `6. **Contract with other trays:** rolls carry the `chong` metadata (`v: 4`, the record every player's tray acts out): a roll in another format must still show as text. There is no link with Chong's Tracker: rolls are copied from notes by hand.`

- [ ] **Step 4: `chong-die-src/DESIGN.md`.**
  - In **Window**, drop the `Errors from the tracker show as a banner (`TrayError`)` clause and replace it with `Tray errors show as a banner (`TrayError`)`.
  - Change the Rolls panel width from `360 px` to `280 px`.
  - In **Rolling**:
    - Change `Spec: `docs/2026-10-07-roll-engine-design.md`` to `Spec: `docs/2026-10-08-command-language-v4-design.md` (language), `docs/2026-10-07-roll-engine-design.md` (engine).`
    - Change "Hold to roll"'s list `(typed, pills, Chong's Tracker, history, Reroll)` to `(typed, pills, history, Reroll)`.
    - Replace the **Roll engine** bullet with:
      `- **Roll engine** (`src/engine/`, pure TS, Vitest): `parse` (a scanner; the only module that knows the words: `adv dis crit miss critadv xN`, glued to an optional number or `N-M` range, acting on the first dice group) → `roll` (plan + random source: the browser's `crypto.getRandomValues` in the app) → `record` (every die's value, size, kind, kept, crit, parent and source; each group's Primary Die and `primaries`; marks; total) → `format` (the result text). The Primary Die in the crit range is a crit; a chain die crits and chains only on its max. `faces.ts` picks the face of each 3D die; `revealStages` splits the record into the throws the tray shows. Errors are `EngineError`, shown under the command line.`
    - In **Marks, not verdicts**, change `(a \`chain adv\` pick counts as one)` to `(a \`critadv\` pick counts as one)`.
    - Delete the **Saved names** bullet.
    - In **Sync**, change `v: 3` to `v: 4`.
    - Delete the **From Chong's Tracker** bullet.
  - In **Primary Die outlines**, change `(with \`crit each\`, every kept die of the first throw; records from before 3.0.2 lack it and outline just the Primary Die)` to `(just the Primary Die)`.
  - In **Dropped dice**, change `(advantage, \`keep\`/\`drop\`, a chain pick's lower die)` to `(advantage, a chain pick's lower die)`.
  - In **Storage**, change `saved rolls (tabs, pills, typed history) and saved names` to `saved rolls (tabs, pills, typed history)`.

- [ ] **Step 5: Old spec pointer.** Insert as line 2 of `chong-die-src/docs/2026-10-07-roll-engine-design.md`:
  `> Its command language is replaced by 4.0: see `2026-10-08-command-language-v4-design.md`.`

- [ ] **Step 6: `chong-die-src/NOTICE.md`.** Add a `4.0.0` entry in the same style as the existing ones:
  `- 4.0.0: a simpler command language (words glued to numbers: `adv3`, `crit5-10`, `miss1-4`, `critadv`, `x2`; words act on the first dice); removed keep/drop, explode, crit each, saved names and notes; removed the Chong's Tracker roll link; Rolls panel 280 px.`

- [ ] **Step 7: Trackers.**
  - Add a 4.0.0 done entry with the same summary to `chong-die/TRACKER.md`. Remove any backlog items about saved names, notes or tracker rolls.
  - In the root `TRACKER.md`, add a done line: `Chong Die 4.0.0 and Chong's Tracker 1.10.0: new command language, no roll link between them.`

- [ ] **Step 8: Pull, build, test.**

```bash
git pull --rebase origin main
cd chong-die-src && npx yarn@1.22.22 build && cd ..
npm test
```

Expected:
- The build ends with Vite's `✓ built in …`.
- `chong-die/manifest.json` has `"version": "4.0.0"`.
- `npm test` passes all node:test suites and Vitest.

- [ ] **Step 9: Commit and push.**

```bash
git add -A chong-die chong-die-src CLAUDE.md README.md TRACKER.md
git commit -m "Chong Die 4.0.0: a simpler command language, no saved names or notes, no tracker link, 280 px panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
git status -sb
```

Expected: `## main...origin/main`.
