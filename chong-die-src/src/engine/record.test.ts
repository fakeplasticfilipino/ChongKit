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
