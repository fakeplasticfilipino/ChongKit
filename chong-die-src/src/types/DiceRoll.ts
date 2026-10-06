import type { ChongRollMeta } from "../chong/rollMeta";
import { Dice } from "./Dice";

/**
 * The roll of a set of dice.
 * See `Dice` type for examples of usage
 */
export interface DiceRoll extends Dice {
  hidden?: boolean;
  /** Set on Chong Die command rolls */
  chong?: ChongRollMeta;
}
