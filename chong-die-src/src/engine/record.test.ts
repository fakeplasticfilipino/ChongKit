import { expect, test } from "vitest";
import { parse } from "./parse";
import { roll, seq } from "./roll";
import { marks } from "./record";

test("miss on 4 or less marks MISS and keeps the real total", () => {
  const rep = roll(parse("2d6 crit miss 4-"), seq([3, 5])).reps[0];
  expect(rep.total).toBe(8);
  expect(marks(rep)).toEqual(["MISS"]);
});
test("no marks when the primary misses the range", () => {
  const rep = roll(parse("2d6 crit miss 4-"), seq([5, 3])).reps[0];
  expect(marks(rep)).toEqual([]);
});

import { revealStages } from "./record";
test("reveal stages: crit chains follow one after another", () => {
  expect(revealStages(roll(parse("1d8 crit"), seq([8, 8, 1])).reps[0])).toEqual([[0], [1], [2]]);
});
test("reveal stages: start and adv dice share stage 0, a pick shares a stage", () => {
  const rep = roll(parse("2d10 adv crit each chain adv"), seq([3, 5, 10, 4, 6])).reps[0];
  expect(revealStages(rep)).toEqual([[0, 1, 2], [3, 4]]);
});
