import { expect, test } from "vitest";
import { parseCommand } from "./parse";
import { evaluate } from "./evaluate";

const run = (s: string, vals: Record<string, number>) =>
  evaluate(parseCommand(s), vals);

test("needs wave 1", () =>
  expect(run("2d6+1", {}).needed.map((d) => d.key)).toEqual([
    "0.0.0",
    "0.0.1",
  ]));

test("no result while dice are missing", () =>
  expect(run("2d6+1", { "0.0.0": 3 }).result).toBeNull());

test("sum", () =>
  expect(run("2d6+1", { "0.0.0": 3, "0.0.1": 4 }).result!.reps[0].total).toBe(
    8
  ));

test("kh3 in order", () =>
  expect(
    run("4d6kh3", { "0.0.0": 1, "0.0.1": 4, "0.0.2": 5, "0.0.3": 6 }).result!
      .reps[0].total
  ).toBe(15));

test("p drops lowest", () =>
  expect(
    run("3d6pl1", { "0.0.0": 2, "0.0.1": 4, "0.0.2": 5 }).result!.reps[0].total
  ).toBe(9));

test("k> keeps above", () =>
  expect(
    run("3d6k>3", { "0.0.0": 2, "0.0.1": 4, "0.0.2": 5 }).result!.reps[0].total
  ).toBe(9));

test("rr then kh", () => {
  const e = run("2d6rr1kh1", { "0.0.0": 1, "0.0.1": 3 });
  expect(e.needed).toEqual([
    { key: "0.0.0r", size: 6, parent: "0.0.0", reason: "reroll" },
  ]);
  expect(
    run("2d6rr1kh1", { "0.0.0": 1, "0.0.1": 3, "0.0.0r": 5 }).result!.reps[0]
      .total
  ).toBe(5);
});

test("rr repeats until no match", () =>
  expect(run("1d6rr1", { "0.0.0": 1, "0.0.0r": 1 }).needed[0].key).toBe(
    "0.0.0rr"
  ));

test("ro once", () =>
  expect(run("1d6ro1", { "0.0.0": 1, "0.0.0r": 1 }).result!.reps[0].total).toBe(
    1
  ));

test("ra adds", () =>
  expect(run("1d6ra6", { "0.0.0": 6, "0.0.0r": 2 }).result!.reps[0].total).toBe(
    8
  ));

test("ra rerolls only the first match", () =>
  expect(run("2d6ra6", { "0.0.0": 6, "0.0.1": 6 }).needed.map((d) => d.key)).toEqual(
    ["0.0.0r"]
  ));

test("explode chain", () => {
  expect(run("1d4!", { "0.0.0": 4 }).needed[0]).toMatchObject({
    key: "0.0.0e",
    reason: "explode",
    parent: "0.0.0",
  });
  expect(
    run("1d4!", { "0.0.0": 4, "0.0.0e": 4, "0.0.0ee": 2 }).result!.reps[0].total
  ).toBe(10);
});

test("e> explodes above", () =>
  expect(run("2d6e>4", { "0.0.0": 5, "0.0.1": 2 }).needed.map((d) => d.key)).toEqual(
    ["0.0.0e"]
  ));

test("clamps", () =>
  expect(run("2d6mi3ma5", { "0.0.0": 1, "0.0.1": 6 }).result!.reps[0].total).toBe(
    8
  ));

test("math", () =>
  expect(run("(1d6+2)*3//4", { "0.0.0": 4 }).result!.reps[0].total).toBe(4));

test("division", () =>
  expect(run("1d20/2", { "0.0.0": 15 }).result!.reps[0].total).toBe(7.5));

test("negation and remainder", () =>
  expect(run("-1d6 + 17 % 5", { "0.0.0": 3 }).result!.reps[0].total).toBe(-1));

test("two dice terms keep their own keys", () =>
  expect(run("1d4+1d6", {}).needed.map((d) => d.key)).toEqual(["0.0.0", "0.1.0"]));

test("rr", () =>
  expect(
    run("!rr 2 1d6", { "0.0.0": 3, "1.0.0": 5 }).result!.reps.map((r) => r.total)
  ).toEqual([3, 5]));

test("rrr", () =>
  expect(
    run("!rrr 2 1d20 10", { "0.0.0": 12, "1.0.0": 3 }).result!.reps.map(
      (r) => r.success
    )
  ).toEqual([true, false]));

test("cap: endless rr", () => {
  const vals: Record<string, number> = { "0.0.0": 1 };
  let k = "0.0.0";
  for (let i = 0; i < 20; i++) {
    k += "r";
    vals[k] = 1;
  }
  const e = evaluate(parseCommand("1d1rr1"), vals);
  expect(e.needed).toEqual([]);
  expect(e.result!.capped).toBe(true);
});

test("cap counts across the whole command", () => {
  const vals: Record<string, number> = {};
  for (let i = 0; i < 25; i++) vals[`0.0.${i}`] = 4;
  const e = evaluate(parseCommand("25d4!"), vals);
  expect(e.needed.length).toBe(20);
});

test("wave-1 limit", () =>
  expect(() => run("101d6", {})).toThrow("Too many dice (max 100)"));

test("wave-1 limit counts repeats", () =>
  expect(() => run("!rr 25 5d6", {})).toThrow("Too many dice (max 100)"));

test("dropped and rerolled marks", () => {
  const r = run("2d6rr1kh1", { "0.0.0": 1, "0.0.1": 3, "0.0.0r": 5 }).result!;
  expect(r.reps[0].terms.get(0)).toEqual([
    { key: "0.0.0", size: 6, value: 1, dropped: true, exploded: false, rerolled: true },
    { key: "0.0.1", size: 6, value: 3, dropped: true, exploded: false, rerolled: false },
    { key: "0.0.0r", size: 6, value: 5, dropped: false, exploded: false, rerolled: false },
  ]);
});

test("a second explode op on the same die throws a new die", () => {
  expect(run("1d6!!", { "0.0.0": 6, "0.0.0e": 3 }).needed.map((d) => d.key)).toEqual([
    "0.0.0e1",
  ]);
  expect(
    run("1d6!!", { "0.0.0": 6, "0.0.0e": 3, "0.0.0e1": 4 }).result!.reps[0].total
  ).toBe(13);
});

test("a second ra op on the same die throws a new die", () =>
  expect(
    run("1d6ra6ra6", { "0.0.0": 6, "0.0.0r": 2, "0.0.0r1": 5 }).result!.reps[0].total
  ).toBe(13));

const man = (s: string, vals: Record<string, number>, manual: string[]) =>
  evaluate(parseCommand(s), vals, { manual });

test("an exploded die asks for a new die of its size, popping out of it", () =>
  expect(man("1d6+2d6", { "0.0.0": 3, "0.1.0": 2, "0.1.1": 5 }, ["0.1.0"]).needed).toEqual([
    { key: "0.1.0m", size: 6, parent: "0.1.0", reason: "explode" },
  ]));

test("the new die adds to its term", () => {
  const r = man("1d6+2d6", { "0.0.0": 3, "0.1.0": 2, "0.1.1": 5, "0.1.0m": 4 }, ["0.1.0"]).result!.reps[0];
  expect(r.total).toBe(14);
  expect(r.terms.get(1)!.find((d) => d.key === "0.1.0")!.exploded).toBe(true);
});

test("exploding the new die chains another", () => {
  const vals = { "0.0.0": 6, "0.0.0m": 6, "0.0.0mm": 2 };
  expect(man("1d6", { "0.0.0": 6, "0.0.0m": 6 }, ["0.0.0", "0.0.0m"]).needed.map((d) => d.key)).toEqual(["0.0.0mm"]);
  expect(man("1d6", vals, ["0.0.0", "0.0.0m"]).result!.reps[0].total).toBe(14);
});

test("an explosion of a die that isn't in the roll is ignored", () =>
  expect(man("1d6", { "0.0.0": 4 }, ["5.0.0"]).result!.reps[0].total).toBe(4));

test("explosions work after the roll's own explosions and in each repeat", () => {
  expect(man("!rr 2 1d6!", { "0.0.0": 6, "0.0.0e": 1, "1.0.0": 3 }, ["1.0.0"]).needed.map((d) => d.key)).toEqual(["1.0.0m"]);
  expect(man("1d6!", { "0.0.0": 6, "0.0.0e": 1 }, ["0.0.0e"]).needed.map((d) => d.key)).toEqual(["0.0.0em"]);
});

test("explosions count toward the 20 extra dice", () => {
  const vals: Record<string, number> = { "0.0.0": 1 };
  const manual = ["0.0.0"];
  let key = "0.0.0";
  for (let i = 0; i < 25; i++) {
    key += "m";
    vals[key] = 1;
    manual.push(key);
  }
  const r = man("1d6", vals, manual).result!;
  expect(r.capped).toBe(true);
  expect(r.reps[0].total).toBe(21);
});
