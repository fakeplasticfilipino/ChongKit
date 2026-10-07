import { evaluate, formatResult, FormattedResult, parseCommand, readLogical } from "../roll";
import { DiceRoll } from "../types/DiceRoll";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";

/**
 * What a Chong Die command roll carries alongside the upstream dice.
 * Synced with the roll, so every player can work out the same result.
 */
export interface ChongRollMeta {
  command: string;
  /** Upstream die id → the logical die it belongs to (a d100 has two parts) */
  parts: Record<string, { key: string; size: number; part: number }>;
  /** Values of dice with no 3D model, by logical key */
  virtual: Record<string, number>;
  capped: boolean;
  /** Set when the roll can't finish (e.g. it divides by zero once the dice land) */
  error?: string;
  /** Dice the roller exploded by hand (right-click / long-press), by logical key: each starts a chain */
  manual?: string[];
  /** Rolled with Nimble on: leftmost dice glow, dice can be exploded by hand */
  nimble?: boolean;
}

/** Logical die values from the 3D dice; dice with any part unfinished are left out */
export function logicalValues(
  meta: ChongRollMeta,
  rollValues: Record<string, number | null | undefined>
): Record<string, number> {
  const groups: Record<string, { size: number; raw: (number | null)[] }> = {};
  for (const [id, { key, size, part }] of Object.entries(meta.parts)) {
    const group = (groups[key] ||= { size, raw: [] });
    const value = rollValues[id];
    group.raw[part] = value === undefined ? null : value;
  }
  const values: Record<string, number> = {};
  for (const [key, { size, raw }] of Object.entries(groups)) {
    if (raw.every((v) => v !== null && v !== undefined)) {
      values[key] = readLogical(size, raw as number[]);
    }
  }
  return values;
}

/**
 * Nimble: for each dice term (`1d6+2d6` has two; one per `!rr` repeat), the die that landed
 * furthest left on the tray, as the 3D die to glow under (a d100 goes by its first part).
 * Dice that exploded out of others don't count, nor dice replaced by a reroll.
 */
export function highlightedDice(
  roll: DiceRoll,
  transforms: Record<string, DiceTransform | null | undefined>
): string[] {
  const meta = roll.chong;
  if (!meta?.nimble) {
    return [];
  }
  const keys = new Set(Object.values(meta.parts).map((p) => p.key));
  // Logical key → its first 3D die
  const first = new Map<string, string>();
  for (const [id, { key, part }] of Object.entries(meta.parts)) {
    if (part === 0) {
      first.set(key, id);
    }
  }
  // Term (`<rep>.<dice id>`) → its dice: first throws and rerolls, not explosions
  const terms = new Map<string, string[]>();
  for (const key of keys) {
    const match = /^(\d+\.\d+)\.\d+(r\d*)*$/.exec(key);
    // Rerolled: a die keyed `<key>r` (or `<key>r1` …) took its place
    const replaced = [...keys].some((k) => k !== key && /^r\d*$/.test(k.slice(key.length)) && k.startsWith(key));
    if (match && !replaced) {
      terms.set(match[1], [...(terms.get(match[1]) || []), key]);
    }
  }
  const result: [string, string][] = [];
  for (const [term, dice] of terms) {
    const ids = dice.map((key) => first.get(key)!);
    if (ids.some((id) => !id || !transforms[id])) {
      continue;
    }
    const leftmost = ids.reduce((a, b) => (transforms[b]!.position.x < transforms[a]!.position.x ? b : a));
    result.push([term, leftmost]);
  }
  return result
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, id]) => id);
}

/** The total and breakdown of a finished command roll, or null */
export function getRollDisplay(
  roll: DiceRoll,
  rollValues: Record<string, number | null> | undefined
): FormattedResult | null {
  const meta = roll.chong;
  if (!meta || !rollValues) {
    return null;
  }
  if (meta.error) {
    return { total: "Error", lines: [meta.error] };
  }
  if (Object.keys(meta.parts).some((id) => rollValues[id] == null)) {
    return null;
  }
  try {
    const { result } = evaluate(
      parseCommand(meta.command),
      { ...logicalValues(meta, rollValues), ...meta.virtual },
      { manual: meta.manual }
    );
    return result ? formatResult(result) : null;
  } catch {
    return null;
  }
}

/** A throw that pops a new die up out of the die that exploded */
export function popThrow(
  parent: DiceTransform,
  rand: () => number = Math.random
): DiceThrow {
  const p = parent.position;
  // Random unit quaternion (Shoemake)
  const u1 = rand();
  const u2 = rand() * 2 * Math.PI;
  const u3 = rand() * 2 * Math.PI;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  // Start clear of the parent and fly off sideways, so the new die doesn't
  // land back on the locked parent and wobble there. It shoots up high and
  // spins hard (peaking near 1.3, under the tray's roof at 1.5) so an
  // explosion feels like hitting the jackpot.
  const angle = rand() * 2 * Math.PI;
  return {
    position: { x: p.x, y: p.y + 0.6, z: p.z },
    rotation: {
      x: a * Math.sin(u2),
      y: a * Math.cos(u2),
      z: b * Math.sin(u3),
      w: b * Math.cos(u3),
    },
    linearVelocity: {
      x: Math.cos(angle) * 0.8,
      y: 3.2 + 0.6 * rand(),
      z: Math.sin(angle) * 0.8,
    },
    angularVelocity: { x: 6 + 6 * rand(), y: 6 + 6 * rand(), z: 6 + 6 * rand() },
  };
}
