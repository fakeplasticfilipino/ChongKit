import { inRange } from "./range";
import { GroupPlan, GroupResult, Plan, RepRecord, RolledDie, Rng, RollRecord } from "./types";

/** Test helper: an Rng that returns these values in order, and throws when they run out. */
export function seq(values: number[]): Rng {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`seq ran out of values after ${values.length}`);
    return values[i++];
  };
}

/** Rolls a group's starting dice, then its net advantage dice (p.16). Ids continue from `nextId`. */
export function rollGroup(g: GroupPlan, group: number, rng: Rng, nextId: number): RolledDie[] {
  const extra = Math.abs(g.adv - g.dis);
  const dice: RolledDie[] = [];
  for (let i = 0; i < g.count + extra; i++) {
    dice.push({
      id: nextId + i, group, size: g.size, value: rng(g.size),
      kind: i < g.count ? "start" : "adv", kept: true, crit: false,
      parent: null, pick: null, source: null,
    });
  }
  return dice;
}

/** Marks `n` dice not kept: the lowest or the highest, the leftmost (lowest id) first among equals. */
function dropDice(dice: RolledDie[], n: number, highest: boolean): void {
  const order = [...dice].sort((a, b) => (highest ? b.value - a.value : a.value - b.value) || a.id - b.id);
  for (const d of order.slice(0, n)) d.kept = false;
}

/** Net advantage drops that many lowest, net disadvantage that many highest (p.16). */
export function applyAdvantage(g: GroupPlan, dice: RolledDie[]): void {
  const net = g.adv - g.dis;
  if (net !== 0) dropDice(dice, Math.abs(net), net < 0);
}

/** `keep n` keeps the n highest (`low`: lowest); `drop n` drops the n lowest. */
export function applyKeep(g: GroupPlan, dice: RolledDie[]): void {
  if (g.keep) dropDice(dice, dice.length - g.keep.n, g.keep.low);
  if (g.drop) dropDice(dice, g.drop, false);
}

/** The first kept start or adv die, by id. */
export function primaryOf(dice: RolledDie[]): number | null {
  return dice.find((d) => d.kept && (d.kind === "start" || d.kind === "adv"))?.id ?? null;
}

function rollRep(plan: Plan, rng: Rng): RepRecord {
  const dice: RolledDie[] = [];
  const groups: GroupResult[] = [];
  plan.groups.forEach((g, gi) => {
    const own = rollGroup(g, gi, rng, dice.length);
    applyAdvantage(g, own);
    applyKeep(g, own);
    dice.push(...own);
    const primary = primaryOf(own);
    const pd = own.find((d) => d.id === primary);
    groups.push({ primary, miss: !!(pd && g.miss && inRange(pd.value, g.miss)), crit: false });
  });
  // Totals come from the kept dice once every die of the repetition has been rolled.
  let total = plan.modifier;
  for (const d of dice) if (d.kept) total += plan.groups[d.group].sign * d.value;
  return { dice, groups, total, capped: false };
}

export function roll(plan: Plan, rng: Rng): RollRecord {
  const reps: RepRecord[] = [];
  for (let i = 0; i < plan.times; i++) reps.push(rollRep(plan, rng));
  return { v: 3, text: plan.text, note: plan.note, reps };
}
