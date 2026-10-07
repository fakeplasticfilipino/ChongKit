import { expect, test } from "vitest";
import { findNumber } from "./numberMask";

/** A grid from rows of text: "#" = number pixel */
function grid(rows: string[]) {
  const size = rows.length;
  const lit = new Uint8Array(size * size);
  rows.forEach((row, y) => [...row].forEach((c, x) => (lit[y * size + x] = c === "#" ? 1 : 0)));
  return { lit, size };
}
const xy = (size: number, pixels: number[]) => pixels.map((i) => [i % size, Math.floor(i / size)]).sort();

const rows = [
  "..........",
  ".##.......",
  ".##..#....",
  ".....#....",
  "..........",
  "..........",
  "..........",
  "..........",
  "........##",
  "..........",
];

test("picks the number nearest the point, all of its pixels", () => {
  const { lit, size } = grid(rows);
  // (0.3, 0.3) is pixel (3, 3): nearest is the 2x2 blob; the bar 3 px away is joined to it (gap 3)
  expect(xy(size, findNumber(lit, size, 0.3, 0.3, 4, 3))).toEqual(
    [[1, 1], [2, 1], [1, 2], [2, 2], [5, 2], [5, 3]].sort()
  );
});

test("pieces further apart than the gap are separate numbers", () => {
  const { lit, size } = grid(rows);
  expect(xy(size, findNumber(lit, size, 0.15, 0.15, 4, 1))).toEqual([[1, 1], [2, 1], [1, 2], [2, 2]].sort());
});

test("nothing within the search radius: no number", () => {
  const { lit, size } = grid(rows);
  expect(findNumber(lit, size, 0.45, 0.85, 1, 1)).toEqual([]);
});
