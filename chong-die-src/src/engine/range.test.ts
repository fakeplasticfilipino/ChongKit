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
