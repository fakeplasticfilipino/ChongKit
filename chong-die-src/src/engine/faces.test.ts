import { expect, test } from "vitest";
import { facesFor, readFaces, toPhysical, rollFair } from "./faces";

test("spec faces", () => {
  expect(facesFor(10, 10, () => 1)).toEqual([0]);
  expect(facesFor(100, 57, () => 1)).toEqual([50, 7]);
  expect(facesFor(100, 100, () => 1)).toEqual([0, 0]);
  for (const v of [1, 2]) expect(Math.ceil(facesFor(2, v, () => 1)[0] / 2)).toBe(v);
  expect(facesFor(7, 3, () => 1)).toEqual([]);
});
test("round trip for every supported size and value, any rng choice", () => {
  for (const size of [2, 3, 4, 6, 8, 10, 12, 20, 100]) {
    expect(toPhysical(size)).not.toBeNull();
    for (let v = 1; v <= size; v++) {
      for (const pick of [1, 2]) {
        expect(readFaces(size, facesFor(size, v, (n) => Math.min(pick, n)))).toBe(v);
      }
    }
  }
});
test("rollFair stays in range", () => {
  for (let i = 0; i < 200; i++) {
    const v = rollFair(6);
    expect(v >= 1 && v <= 6).toBe(true);
  }
});
