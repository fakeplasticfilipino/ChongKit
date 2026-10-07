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
