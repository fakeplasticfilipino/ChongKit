import { expect, test } from "vitest";
import { parse } from "./parse";
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
