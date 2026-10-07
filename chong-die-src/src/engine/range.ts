import { Range } from "./types";

/** `5+` (5 or more), `4-` (4 or less), `1-2`, or `6`. Null when it isn't one. */
export function parseRange(word: string): Range | null {
  let m: RegExpExecArray | null;
  if ((m = /^(\d+)\+$/.exec(word))) return { min: +m[1], max: Infinity };
  if ((m = /^(\d+)-$/.exec(word))) return { min: -Infinity, max: +m[1] };
  if ((m = /^(\d+)-(\d+)$/.exec(word))) {
    const min = +m[1];
    const max = +m[2];
    return min <= max ? { min, max } : null;
  }
  if ((m = /^(\d+)$/.exec(word))) return { min: +m[1], max: +m[1] };
  return null;
}

export function inRange(v: number, r: Range): boolean {
  return v >= r.min && v <= r.max;
}
