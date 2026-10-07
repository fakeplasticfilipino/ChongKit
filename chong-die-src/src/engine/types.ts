/** Inclusive range of face values: `5` → { min: 5, max: 5 }, `5-10` → { min: 5, max: 10 } */
export type Range = { min: number; max: number };

/** Dice of one size joined into the command by a sign: `1d10`, `+ 2d6`, `- 1d4` */
export interface GroupPlan {
  sign: 1 | -1;
  count: number;
  size: number;
}

export interface Plan {
  /** The input text as given (trimmed). */
  text: string;
  groups: GroupPlan[];
  modifier: number;
  times: number;
  /** The words, all acting on the first group (`groups[0]`) */
  adv: number;
  dis: number;
  /** The Primary Die in this range crits and starts a chain */
  crit: Range | null;
  /** The Primary Die in this range marks the roll MISS */
  miss: Range | null;
  /** Extra dice in each chain pick (the highest is kept) */
  critAdv: number;
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

export type DieKind = "start" | "adv" | "chain";

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
  /** "crit" on a chain die: it came from a crit */
  source: "crit" | null;
}

export interface GroupResult {
  sign: 1 | -1;
  /** The dice label, e.g. `1d10`, `3d6kh2`, `2d20kl1`. */
  label: string;
  /** The `id` of the group's Primary Die, or null when no start/adv die is kept. */
  primary: number | null;
  /**
   * The dice outlined as Primary Dice: with `crit each`, every kept start/adv die; else `[primary]`
   * (empty when none). Records made before 3.0.2 lack it: read it as `[primary]`.
   */
  primaries: number[];
  /** The Primary Die landed in the miss range (an outcome). */
  miss: boolean;
  /** A die of the group crit (an outcome). */
  crit: boolean;
  /** The group was rolled with `crit` (or `crit each`), whatever the dice show. */
  usesCrit: boolean;
  /** The group was rolled with a `miss` range, whatever the dice show. */
  usesMiss: boolean;
}

export interface RepRecord {
  dice: RolledDie[];
  groups: GroupResult[];
  total: number;
  capped: boolean;
}

export interface RollRecord {
  v: 4;
  modifier: number;
  text: string;
  note: string | null;
  reps: RepRecord[];
}
