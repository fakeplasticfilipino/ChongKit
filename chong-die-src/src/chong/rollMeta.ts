import {
  facesFor,
  formatRecord,
  FormattedResult,
  GroupResult,
  revealStages,
  rollFair,
  RollRecord,
  Rng,
  toPhysical,
} from "../engine";
import { generateDiceId } from "../helpers/generateDiceId";
import { DiceRoll } from "../types/DiceRoll";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";

/** One 3D die of a command roll: the record's die it shows (a d100 has two parts) */
export interface ChongPart {
  rep: number;
  /** The die's `id` in its repetition */
  die: number;
  part: number;
}

/**
 * What a Chong Die command roll carries alongside the upstream dice. The record is the roll:
 * every player's tray acts it out, and totals, marks and highlights all come from it.
 */
export interface ChongRollMeta {
  v: 3;
  record: RollRecord;
  /** 3D die id → the record's die and its part (every 3D die of the roll, shown or not yet) */
  parts: Record<string, ChongPart>;
  /** 3D die id → the face it must land on (forced in a later step; the record is the truth) */
  faces: Record<string, number>;
  /** The reveal stage shown so far: stage 0 is the first throw, then the chain dice by generation */
  stage: number;
}

/** A synced roll in this format (other players may still send an older one) */
export function isCurrentMeta(meta: unknown): meta is ChongRollMeta {
  return Boolean(meta && typeof meta === "object" && (meta as { v?: unknown }).v === 3);
}

/** A record's metadata: an id and a face for every 3D part of every die, stage 0 shown */
export function buildMeta(record: RollRecord, rng: Rng = rollFair): ChongRollMeta {
  const parts: ChongRollMeta["parts"] = {};
  const faces: ChongRollMeta["faces"] = {};
  record.reps.forEach((rep, r) => {
    for (const die of rep.dice) {
      const physical = toPhysical(die.size);
      if (!physical) {
        continue;
      }
      const dieFaces = facesFor(die.size, die.value, rng);
      physical.forEach((_, part) => {
        const id = generateDiceId();
        parts[id] = { rep: r, die: die.id, part };
        faces[id] = dieFaces[part];
      });
    }
  });
  return { v: 3, record, parts, faces, stage: 0 };
}

/** The last reveal stage of a record (0 when nothing chains) */
export function lastStage(record: RollRecord): number {
  return Math.max(0, ...record.reps.map((rep) => revealStages(rep).length - 1));
}

const byOrder = (meta: ChongRollMeta) => (a: string, b: string) => {
  const p = meta.parts[a];
  const q = meta.parts[b];
  return p.rep - q.rep || p.die - q.die || p.part - q.part;
};

/** The 3D ids of one reveal stage, in rolling order (a d100's parts together) */
export function stageIds(meta: ChongRollMeta, stage: number): string[] {
  const inStage = meta.record.reps.map((rep) => new Set(revealStages(rep)[stage] || []));
  return Object.keys(meta.parts)
    .filter((id) => inStage[meta.parts[id].rep]?.has(meta.parts[id].die))
    .sort(byOrder(meta));
}

/** The 3D id of a record die's first part, or undefined when it has no 3D model */
export function partId(meta: ChongRollMeta, rep: number, die: number): string | undefined {
  return Object.keys(meta.parts).find((id) => {
    const p = meta.parts[id];
    return p.rep === rep && p.die === die && p.part === 0;
  });
}

/** A group's Primary Dice; records made before 3.0.2 have no `primaries`: just the primary */
function primariesOf(group: GroupResult): number[] {
  if (Array.isArray(group.primaries)) {
    return group.primaries;
  }
  return group.primary === null ? [] : [group.primary];
}

/**
 * For each dice group (and repeat) rolled with `crit` or `miss`, the 3D dice of its Primary Dice
 * (one, or with `crit each` every kept die of the first throw; a d100 by its first part), for the
 * outline. Old rolls have none.
 */
export function highlightedDice(roll: DiceRoll): string[] {
  const meta = roll.chong;
  if (!isCurrentMeta(meta)) {
    return [];
  }
  const ids: string[] = [];
  meta.record.reps.forEach((rep, r) => {
    for (const group of rep.groups) {
      if (!(group.usesCrit || group.usesMiss)) {
        continue;
      }
      for (const die of primariesOf(group)) {
        const id = partId(meta, r, die);
        if (id) {
          ids.push(id);
        }
      }
    }
  });
  return ids;
}

/** 3D dice whose record die isn't kept (advantage, keep/drop, a chain pick's lower die): shown faded */
export function fadedDice(roll: DiceRoll): string[] {
  const meta = roll.chong;
  if (!isCurrentMeta(meta)) {
    return [];
  }
  return Object.keys(meta.parts)
    .filter((id) => {
      const { rep, die } = meta.parts[id];
      return meta.record.reps[rep]?.dice[die]?.kept === false;
    })
    .sort(byOrder(meta));
}

/** The outline of a highlighted die: gold when it crit, else dark red when it is its group's primary and the group missed, else purple */
export function highlightTone(roll: DiceRoll, id: string): "plain" | "miss" | "crit" {
  const meta = roll.chong;
  const part = isCurrentMeta(meta) ? meta.parts[id] : undefined;
  if (!isCurrentMeta(meta) || !part) {
    return "plain";
  }
  const rep = meta.record.reps[part.rep];
  const die = rep?.dice[part.die];
  if (!die) {
    return "plain";
  }
  if (die.crit) {
    return "crit";
  }
  const group = rep.groups[die.group];
  return group?.miss && group.primary === die.id ? "miss" : "plain";
}

/**
 * The total and breakdown of a command roll, from its record, once every stage is on the tray and
 * (given the landed values) every 3D die has settled; else null. A roll in an older format shows
 * as its command text.
 */
export function getRollDisplay(
  roll: DiceRoll,
  rollValues?: Record<string, number | null | undefined>
): FormattedResult | null {
  const meta = roll.chong as unknown;
  if (!meta) {
    return null;
  }
  if (!isCurrentMeta(meta)) {
    const command = (meta as { command?: unknown }).command;
    return { total: "Old roll", lines: typeof command === "string" ? [command] : [] };
  }
  if (meta.stage < lastStage(meta.record)) {
    return null;
  }
  if (rollValues && Object.keys(meta.parts).some((id) => rollValues[id] == null)) {
    return null;
  }
  return formatRecord(meta.record);
}

/** A throw that pops a new die up out of the die that made it */
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
  // spins hard (peaking near 1.3, under the tray's roof at 1.5) so a
  // chain die feels like hitting the jackpot.
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
