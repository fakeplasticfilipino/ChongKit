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
