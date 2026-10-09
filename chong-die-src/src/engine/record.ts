import { RepRecord } from "./types";

/** The marks a repetition earns, in the fixed order MISS, CHAIN, CAPPED (CHAIN: the Primary Die landed in the chain range). */
export function marks(rep: RepRecord): ("MISS" | "CHAIN" | "CAPPED")[] {
  const out: ("MISS" | "CHAIN" | "CAPPED")[] = [];
  if (rep.groups.some((g) => g.miss)) out.push("MISS");
  if (rep.groups.some((g) => g.crit)) out.push("CHAIN");
  if (rep.capped) out.push("CAPPED");
  return out;
}

/** Dice ids by reveal stage: stage 0 is every start and adv die; each later stage holds the dice whose parent is in the one before (a pick's dice share a stage). */
export function revealStages(rep: RepRecord): number[][] {
  const stageOf = new Map<number, number>();
  const stages: number[][] = [];
  for (const d of rep.dice) {
    const s = d.parent === null ? 0 : (stageOf.get(d.parent) ?? 0) + 1;
    stageOf.set(d.id, s);
    (stages[s] ??= []).push(d.id);
  }
  return stages;
}
