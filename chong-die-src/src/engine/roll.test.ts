import { describe, expect, test } from "vitest";
import { parse } from "./parse";
import { marks } from "./record";
import { roll, seq } from "./roll";

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
test("signs, modifier and repetitions", () => {
  const rec = roll(parse("1d6 - 1d4 + 2 x2"), seq([5, 3, 1, 4]));
  expect(rec.reps.map((r) => r.total)).toEqual([4, -1]);
  expect(rec.v).toBe(3);
  expect(rec.text).toBe("1d6 - 1d4 + 2 x2");
});
test("keep and keep low", () => {
  const r = roll(parse("4d6 keep 3"), seq([2, 6, 1, 4])).reps[0];
  expect(r.dice.map((d) => d.kept)).toEqual([true, true, false, true]);
  expect(r.total).toBe(12);
});
test("keep low ties drop the leftmost first", () => {
  const r = roll(parse("3d6 keep low 1"), seq([5, 5, 2])).reps[0];
  expect(r.dice.map((d) => d.kept)).toEqual([false, false, true]);
  const t = roll(parse("3d6 keep low 2"), seq([5, 5, 2])).reps[0];
  expect(t.dice.map((d) => d.kept)).toEqual([false, true, true]);
});
test("drop removes the lowest, ties from the left", () => {
  const r = roll(parse("3d6 drop 1"), seq([3, 3, 5])).reps[0];
  expect(r.dice.map((d) => d.kept)).toEqual([false, true, true]);
});
test("ids count from 0 per repetition and across groups", () => {
  const rec = roll(parse("1d6 + 1d4 x2"), seq([1, 2, 3, 4]));
  expect(rec.reps[1].dice.map((d) => [d.id, d.group])).toEqual([[0, 0], [1, 1]]);
});
test("seq throws when it runs out", () => {
  expect(() => roll(parse("2d6"), seq([1]))).toThrow(/ran out/);
});


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
    expect(r.dice.slice(1).map((d) => [d.pick, d.parent])).toEqual([[1, 0], [1, 0]]);
  });
  test("a kept 10 in the pick chains again", () => {
    const r = roll(atk, seq([6, 10, 3, 9, 2])).reps[0];
    expect(r.total).toBe(6 + 10 + 9);
    expect(marks(r)).toEqual(["CRIT"]);
  });
});
test("chain pick ties keep the leftmost", () => {
  const r = roll(parse("1d6 crit chain adv"), seq([6, 3, 3, 1])).reps[0];
  expect(r.dice.map((d) => d.kept)).toEqual([true, true, false]);
});
test("chainAdv 0: pick is the die's own id", () => {
  const r = roll(parse("1d8 crit"), seq([8, 2])).reps[0];
  expect(r.dice[1]).toMatchObject({ pick: 1, parent: 0, source: "crit" });
});
test("explode is not a crit", () => {
  const r = roll(parse("1d6 explode"), seq([6, 6, 2])).reps[0];
  expect(r.total).toBe(14);
  expect(marks(r)).toEqual([]);
  expect(r.dice[1]).toMatchObject({ kind: "explode", source: "explode", pick: null, parent: 0, crit: false });
});
test("crit each: every die is its own Primary Die (p.16)", () => {
  const r = roll(parse("3d10 crit each"), seq([10, 4, 10, 1, 2])).reps[0];
  expect(r.dice.filter((d) => d.kind === "chain")).toHaveLength(2);
});
test("a die that always rolls max stops at 20 and is CAPPED", () => {
  const r = roll(parse("1d1 crit"), () => 1).reps[0];
  expect(r.dice.filter((d) => d.kind === "chain")).toHaveLength(20);
  expect(marks(r)).toContain("CAPPED");
  expect(roll(parse("1d1 explode"), () => 1).reps[0].capped).toBe(true);
});
test("a chain pick counts as one follow-up: 20 picks of 2", () => {
  const r = roll(parse("1d1 crit chain adv"), () => 1).reps[0];
  expect(r.dice.filter((d) => d.kind === "chain")).toHaveLength(40);
  expect(r.capped).toBe(true);
});
test("the 100-dice cap stops follow-ups", () => {
  const r = roll(parse("98d1 crit each"), () => 1).reps[0];
  expect(r.dice).toHaveLength(100);
  expect(r.capped).toBe(true);
});
test("the follow-up counter is shared across repetitions", () => {
  const rec = roll(parse("1d1 crit x2"), () => 1);
  expect(rec.reps[0].dice).toHaveLength(21);
  expect(rec.reps[1].dice).toHaveLength(1);
  expect(rec.reps[1].capped).toBe(true);
});
test("crit needs the group's crit; a group's crit flag", () => {
  const r = roll(parse("1d6 + 1d6 crit"), seq([6, 6, 1])).reps[0];
  expect(r.groups.map((g) => g.crit)).toEqual([false, true]);
});
test("a group records whether it uses crit and miss, whatever the dice show", () => {
  const r = roll(parse("1d6 + 1d6 crit + 1d6 miss 1 + 1d6 crit each miss 2-"), seq([3, 3, 3, 3])).reps[0];
  expect(r.groups.map((g) => [g.usesCrit, g.usesMiss])).toEqual([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ]);
});
test("a start die that explodes and is at max: crit wins, one follow-up", () => {
  const r = roll(parse("1d6 crit explode"), seq([6, 2])).reps[0];
  expect(r.dice).toHaveLength(2);
  expect(r.dice[1].kind).toBe("chain");
});

test("crit each: a kept adv die of the first throw can crit and chain too", () => {
  const r = roll(parse("2d10 adv crit each"), seq([3, 5, 10, 4])).reps[0];
  const adv = r.dice.find((d) => d.kind === "adv")!;
  expect(adv.crit).toBe(true);
  const chain = r.dice.find((d) => d.kind === "chain")!;
  expect(chain.parent).toBe(adv.id);
});

test("primaries: every kept first-throw die with crit each, else the primary", () => {
  const each = roll(parse("3d10 crit each"), seq([4, 10, 6, 2])).reps[0];
  expect(each.groups[0].primaries).toEqual([0, 1, 2]);
  const adv = roll(parse("2d10 crit each adv"), seq([1, 7, 9])).reps[0];
  expect(adv.groups[0].primaries).toEqual([1, 2]);
  expect(roll(parse("3d10 crit"), seq([4, 5, 6])).reps[0].groups[0].primaries).toEqual([0]);
  expect(roll(parse("2d6"), seq([4, 5])).reps[0].groups[0].primaries).toEqual([0]);
});
