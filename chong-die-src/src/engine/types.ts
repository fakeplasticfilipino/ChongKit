/** Inclusive range of face values; `max` may be Infinity, `min` may be -Infinity. */
export type Range = { min: number; max: number };

export interface GroupPlan {
  sign: 1 | -1;
  count: number;
  size: number;
  adv: number;
  dis: number;
  keep: { n: number; low: boolean } | null;
  drop: number;
  crit: "none" | "primary" | "each";
  miss: Range | null;
  chain: Range[];
  chainAdv: number;
  explode: boolean;
}

export interface Plan {
  /** The input text as given (trimmed). */
  text: string;
  groups: GroupPlan[];
  modifier: number;
  times: number;
  note: string | null;
}

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

export const MAX_DICE = 100;
export const MAX_FOLLOW = 20;
export const MAX_TIMES = 25;
export const MAX_SIDES = 1000;

/** A random source: returns a whole number from 1 to `size`. */
export type Rng = (size: number) => number;

export type DieKind = "start" | "adv" | "chain" | "explode";

export interface RolledDie {
  /** The die's place in its repetition's rolling order, from 0. */
  id: number;
  group: number;
  size: number;
  value: number;
  kind: DieKind;
  kept: boolean;
  crit: boolean;
  parent: number | null;
  /** Groups the dice of one advantage chain pick. */
  pick: number | null;
  source: "crit" | "range" | "explode" | null;
}

export interface GroupResult {
  sign: 1 | -1;
  /** The dice label, e.g. `1d10`, `3d6kh2`, `2d20kl1`. */
  label: string;
  /** The `id` of the group's Primary Die, or null when no start/adv die is kept. */
  primary: number | null;
  miss: boolean;
  crit: boolean;
}

export interface RepRecord {
  dice: RolledDie[];
  groups: GroupResult[];
  total: number;
  capped: boolean;
}

export interface RollRecord {
  v: 3;
  modifier: number;
  text: string;
  note: string | null;
  reps: RepRecord[];
}
