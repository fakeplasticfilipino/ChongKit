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

/** The total and breakdown of a finished command roll, or null */
export function getRollDisplay(
  roll: DiceRoll,
  rollValues: Record<string, number | null> | undefined
): FormattedResult | null {
  const meta = roll.chong;
  if (!meta || !rollValues) {
    return null;
  }
  if (Object.keys(meta.parts).some((id) => rollValues[id] == null)) {
    return null;
  }
  try {
    const { result } = evaluate(parseCommand(meta.command), {
      ...logicalValues(meta, rollValues),
      ...meta.virtual,
    });
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
  // land back on the locked parent and wobble there
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
      y: 1.5 + rand(),
      z: Math.sin(angle) * 0.8,
    },
    angularVelocity: { x: 2 + 4 * rand(), y: 2 + 4 * rand(), z: 2 + 4 * rand() },
  };
}
