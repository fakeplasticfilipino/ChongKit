import { expect, test } from "vitest";
import { inRange, parseRange } from "./range";

test("parseRange", () => {
  expect(parseRange("5+")).toEqual({ min: 5, max: Infinity });
  expect(parseRange("4-")).toEqual({ min: -Infinity, max: 4 });
  expect(parseRange("1-2")).toEqual({ min: 1, max: 2 });
  expect(parseRange("6")).toEqual({ min: 6, max: 6 });
  expect(parseRange("x")).toBeNull();
  expect(parseRange("")).toBeNull();
  expect(parseRange("2-1")).toBeNull();
  expect(parseRange("1-2-3")).toBeNull();
  expect(parseRange("5+3")).toBeNull();
});

test("inRange is inclusive", () => {
  const r = parseRange("2-4")!;
  expect([1, 2, 3, 4, 5].map((v) => inRange(v, r))).toEqual([false, true, true, true, false]);
  expect(inRange(1e9, parseRange("5+")!)).toBe(true);
  expect(inRange(-9, parseRange("4-")!)).toBe(true);
});
