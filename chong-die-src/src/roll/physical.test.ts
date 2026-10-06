import { expect, test } from "vitest";
import { readLogical, rollVirtual, toPhysical } from "./physical";

test("map", () => {
  expect(toPhysical(2)).toEqual(["D4"]);
  expect(toPhysical(3)).toEqual(["D6"]);
  expect(toPhysical(20)).toEqual(["D20"]);
  expect(toPhysical(100)).toEqual(["D100", "D10"]);
  expect(toPhysical(7)).toBeNull();
});

test("read", () => {
  expect(readLogical(10, [0])).toBe(10);
  expect(readLogical(10, [7])).toBe(7);
  expect(readLogical(100, [0, 0])).toBe(100);
  expect(readLogical(100, [40, 7])).toBe(47);
  expect(readLogical(100, [0, 5])).toBe(5);
  expect(readLogical(3, [5])).toBe(3);
  expect(readLogical(3, [1])).toBe(1);
  expect(readLogical(2, [1])).toBe(1);
  expect(readLogical(2, [4])).toBe(2);
  expect(readLogical(20, [17])).toBe(17);
});

test("virtual range", () => {
  for (let i = 0; i < 200; i++) {
    const v = rollVirtual(7);
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(7);
    expect(Number.isInteger(v)).toBe(true);
  }
});
