import { BUILT_IN_NAMES, checkName, expand, parse } from "../engine";

export interface Pill {
  id: string;
  name: string;
  command: string;
  /** Shown on hover / long-press, not on the pill */
  description?: string;
}

export interface RollTab {
  id: string;
  name: string;
  pills: Pill[];
}

export interface SavedRolls {
  version: 1;
  tabs: RollTab[];
  /** Typed commands, oldest first */
  history: string[];
  /** The user's saved names (`atk = 1d10 nimble`), lower case; the built-in names sit under them */
  names: Record<string, string>;
}

export const STORAGE_KEY = "chongkit.chongdie";
export const MAX_HISTORY = 50;
export const MAX_IMPORT_BYTES = 1_048_576;

export function emptySaved(): SavedRolls {
  return {
    version: 1,
    tabs: [{ id: "rolls", name: "Rolls", pills: [] }],
    history: [],
    names: {},
  };
}

/** Every name a command can use: the built-in names, overridden by the user's */
export function allNames(saved: SavedRolls): Record<string, string> {
  return { ...BUILT_IN_NAMES, ...saved.names };
}

/** The saved names that can be used: valid names (lower case) with text */
function validateNames(raw: unknown): Record<string, string> {
  const names: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return names;
  }
  for (const [key, text] of Object.entries(raw as Record<string, unknown>)) {
    const name = key.toLowerCase();
    if (isText(text) && text.trim() && checkName(name) === null) {
      names[name] = text.trim();
    }
  }
  return names;
}

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

const isText = (v: unknown): v is string => typeof v === "string";

/** A usable copy of saved data, or null when it isn't Chong Die data */
export function validateSavedRolls(data: unknown): SavedRolls | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const raw = data as Record<string, unknown>;
  if (!Array.isArray(raw.tabs)) {
    return null;
  }
  const tabs: RollTab[] = [];
  for (const t of raw.tabs) {
    if (!t || typeof t !== "object" || !isText(t.id) || !isText(t.name)) {
      continue;
    }
    const pills: Pill[] = [];
    for (const p of Array.isArray(t.pills) ? t.pills : []) {
      if (p && isText(p.id) && isText(p.name) && isText(p.command)) {
        const pill: Pill = { id: p.id, name: p.name, command: p.command };
        if (isText(p.description) && p.description) {
          pill.description = p.description;
        }
        pills.push(pill);
      }
    }
    tabs.push({ id: t.id, name: t.name, pills });
  }
  if (tabs.length === 0) {
    return null;
  }
  const history = Array.isArray(raw.history)
    ? raw.history.filter(isText).slice(-MAX_HISTORY)
    : [];
  return { version: 1, tabs, history, names: validateNames(raw.names) };
}

export function loadSaved(storage = defaultStorage()): SavedRolls {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    if (text) {
      return validateSavedRolls(JSON.parse(text)) || emptySaved();
    }
  } catch {
    // Blocked or corrupt storage: start fresh
  }
  return emptySaved();
}

export function saveSaved(s: SavedRolls, storage = defaultStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked: keep working without it
  }
}

export function pushHistory(history: string[], cmd: string): string[] {
  if (history[history.length - 1] === cmd) {
    return history;
  }
  return [...history, cmd].slice(-MAX_HISTORY);
}

/** Why a pill's command can't roll (with these saved names), or null when it can */
export function pillError(p: Pill, names: Record<string, string> = {}): string | null {
  try {
    parse(expand(p.command, names));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Can't roll this";
  }
}

export function importSaved(text: string): SavedRolls {
  if (text.length > MAX_IMPORT_BYTES) {
    throw new Error("File is over 1 MB");
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Not a Chong Die file");
  }
  const saved = validateSavedRolls(data);
  if (!saved) {
    throw new Error("Not a Chong Die file");
  }
  return saved;
}
