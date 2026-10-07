import { Range } from "./types";

/** `5` (exactly 5) or `5-10` (5 to 10, low to high). Null when it isn't one. */
export function parseRange(text: string): Range | null {
  const m = /^(\d+)(?:-(\d+))?$/.exec(text);
  if (!m) return null;
  const min = +m[1];
  const max = m[2] === undefined ? min : +m[2];
  return min <= max ? { min, max } : null;
}

export function inRange(v: number, r: Range): boolean {
  return v >= r.min && v <= r.max;
}
