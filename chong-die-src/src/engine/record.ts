import { RepRecord } from "./types";

/** The marks a repetition earns, in the fixed order MISS, CRIT, CAPPED. */
export function marks(rep: RepRecord): ("MISS" | "CRIT" | "CAPPED")[] {
  const out: ("MISS" | "CRIT" | "CAPPED")[] = [];
  if (rep.groups.some((g) => g.miss)) out.push("MISS");
  if (rep.groups.some((g) => g.crit)) out.push("CRIT");
  if (rep.capped) out.push("CAPPED");
  return out;
}
