import { DiceType } from "../types/DiceType";

export type PhysicalType = DiceType;

/**
 * The 3D dice that stand in for one logical die, or `null` when there is no
 * 3D die for that size (it's rolled virtually).
 * d2 is read from a d4 and d3 from a d6; d100 is the usual d100 + d10 pair.
 */
export function toPhysical(size: number): PhysicalType[] | null {
  switch (size) {
    case 2:
      return ["D4"];
    case 3:
      return ["D6"];
    case 4:
    case 6:
    case 8:
    case 10:
    case 12:
    case 20:
      return [`D${size}` as PhysicalType];
    case 100:
      return ["D100", "D10"];
    default:
      return null;
  }
}

/** The logical value of a die from the faces its 3D dice landed on */
export function readLogical(size: number, raw: number[]): number {
  switch (size) {
    case 2:
    case 3:
      return Math.ceil(raw[0] / 2);
    case 10:
      return raw[0] === 0 ? 10 : raw[0];
    case 100: {
      const sum = raw[0] + raw[1];
      return sum === 0 ? 100 : sum;
    }
    default:
      return raw[0];
  }
}

/** A fair 1..size roll for dice with no 3D model */
export function rollVirtual(size: number): number {
  const buffer = new Uint32Array(1);
  // Reject the top sliver so every face is equally likely
  const limit = Math.floor(0x100000000 / size) * size;
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) {
      return (buffer[0] % size) + 1;
    }
  }
}
