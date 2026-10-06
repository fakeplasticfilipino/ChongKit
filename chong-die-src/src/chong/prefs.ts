import { DiceStyle } from "../types/DiceStyle";
import { Die } from "../types/Die";

/** This browser's dice settings: the primary die's style and Nimble rules */
export interface Prefs {
  /** null = not chosen: the first style that differs from the dice */
  primaryStyle: DiceStyle | null;
  /** Primary die explodes on its max; a 1 on it is a miss */
  nimble: boolean;
}

export const PREFS_KEY = "chongkit.chongdie.prefs";

export const STYLES: DiceStyle[] = [
  "GALAXY",
  "GEMSTONE",
  "GLASS",
  "IRON",
  "NEBULA",
  "SUNRISE",
  "SUNSET",
  "WALNUT",
];

const DEFAULTS: Prefs = { primaryStyle: null, nimble: false };

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadPrefs(storage = defaultStorage()): Prefs {
  try {
    const raw = JSON.parse(storage?.getItem(PREFS_KEY) || "null");
    if (raw && typeof raw === "object") {
      return {
        primaryStyle: STYLES.includes(raw.primaryStyle) ? raw.primaryStyle : null,
        nimble: raw.nimble === true,
      };
    }
  } catch {
    // Blocked or corrupt storage: defaults
  }
  return { ...DEFAULTS };
}

export function savePrefs(prefs: Prefs, storage = defaultStorage()): void {
  try {
    storage?.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or blocked: keep working without it
  }
}

/** The style the primary die is drawn in */
export function resolvePrimaryStyle(choice: DiceStyle | null, diceStyle: DiceStyle): DiceStyle {
  return choice || STYLES.find((s) => s !== diceStyle)!;
}

/** Each roll's first die (`<rep>.0.0`) and the dice that explode out of it */
export function isPrimaryKey(key: string): boolean {
  return /^\d+\.0\.0e*$/.test(key);
}

/** Dice picked by hand on the tray, as a command (so they get a primary die too) */
export function countsToCommand(
  counts: Record<string, number>,
  diceById: Record<string, Die>,
  bonus: number
): string | null {
  const terms: string[] = [];
  for (const [id, count] of Object.entries(counts)) {
    const die = diceById[id];
    if (die && count > 0) {
      terms.push(`${count}d${die.type.slice(1)}`);
    }
  }
  if (terms.length === 0) {
    return null;
  }
  const mod = bonus > 0 ? `+${bonus}` : bonus < 0 ? `${bonus}` : "";
  return terms.join("+") + mod;
}
