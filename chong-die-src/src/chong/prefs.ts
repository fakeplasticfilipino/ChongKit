import { Die } from "../types/Die";

/** This browser's settings */
export interface Prefs {
  /** Nimble: each term's leftmost die glows, right-click a die to start a chain of explosions */
  nimble: boolean;
  /** The Rolls panel docked beside the tray is open */
  panelOpen: boolean;
}

export const PREFS_KEY = "chongkit.chongdie.prefs";

const DEFAULTS: Prefs = { nimble: false, panelOpen: true };

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
        nimble: raw.nimble === true,
        panelOpen: raw.panelOpen !== false,
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

/** Dice picked by hand on the tray, as a command (so they get highlights and can be exploded) */
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
