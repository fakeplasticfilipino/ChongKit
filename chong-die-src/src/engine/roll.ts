import { stageZeroSizes } from "./parse";
import { inRange } from "./range";
import { GroupPlan, GroupResult, Plan, RepRecord, RolledDie, Rng, RollRecord, MAX_DICE, MAX_FOLLOW } from "./types";

/** Test helper: an Rng that returns these values in order, and throws when they run out. */
export function seq(values: number[]): Rng {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`seq ran out of values after ${values.length}`);
    return values[i++];
  };
}

/** Rolls a group's dice, then `extra` advantage dice (p.16). Ids continue from `nextId`. */
export function rollGroup(g: GroupPlan, extra: number, group: number, rng: Rng, nextId: number): RolledDie[] {
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

/** Net advantage drops that many lowest, net disadvantage that many highest (p.16); ties: the leftmost first. */
export function applyAdvantage(net: number, dice: RolledDie[]): void {
  if (net === 0) return;
  const order = dice
    .filter((d) => d.kept)
    .sort((a, b) => (net < 0 ? b.value - a.value : a.value - b.value) || a.id - b.id);
  for (const d of order.slice(0, Math.abs(net))) d.kept = false;
}

/** Counters shared by every repetition of one command (the caps). */
interface Budget {
  follow: number;
  dice: number;
}

/**
 * A chain die: `1 + critAdv` dice of the parent's size, the highest kept (ties: the leftmost).
 * The table's rule: it crits, and chains again, only on its max, never on the crit range.
 */
function chainPick(parent: RolledDie, critAdv: number, rng: Rng, nextId: number): RolledDie[] {
  const dice: RolledDie[] = [];
  for (let i = 0; i <= critAdv; i++) {
    dice.push({
      id: nextId + i, group: parent.group, size: parent.size, value: rng(parent.size),
      kind: "chain", kept: true, crit: false, parent: parent.id, pick: nextId, source: "crit",
    });
  }
  let best = dice[0];
  for (const d of dice) if (d.value > best.value) best = d;
  for (const d of dice) d.kept = d === best;
  best.crit = best.value === best.size;
  return dice;
}

/** The first kept start or adv die, by id. */
export function primaryOf(dice: RolledDie[]): number | null {
  return dice.find((d) => d.kept && (d.kind === "start" || d.kind === "adv"))?.id ?? null;
}

function rollRep(plan: Plan, rng: Rng, budget: Budget): RepRecord {
  const dice: RolledDie[] = [];
  const groups: GroupResult[] = [];
  const net = plan.adv - plan.dis;
  plan.groups.forEach((g, gi) => {
    // The words act on the first group only
    const first = gi === 0;
    const own = rollGroup(g, first ? Math.abs(net) : 0, gi, rng, dice.length);
    if (first) applyAdvantage(net, own);
    const primary = primaryOf(own);
    const pd = own.find((d) => d.id === primary);
    if (first && pd && plan.crit) pd.crit = inRange(pd.value, plan.crit);
    dice.push(...own);
    groups.push({
      sign: g.sign,
      label: labelOf(g, own, first ? net : 0),
      primary,
      primaries: primary === null ? [] : [primary],
      miss: !!(first && pd && plan.miss && inRange(pd.value, plan.miss)),
      crit: false,
      usesCrit: first && plan.crit !== null,
      usesMiss: first && plan.miss !== null,
    });
  });
  // Chains, breadth-first in id order: every crit die earns one chain pick, with the next ids
  let capped = false;
  for (let i = 0; i < dice.length; i++) {
    const die = dice[i];
    if (!die.kept || !die.crit) continue;
    const size = 1 + plan.critAdv;
    if (budget.follow + 1 > MAX_FOLLOW || budget.dice + size > MAX_DICE) {
      capped = true;
      break;
    }
    budget.follow += 1;
    budget.dice += size;
    dice.push(...chainPick(die, plan.critAdv, rng, dice.length));
  }
  for (const d of dice) if (d.crit) groups[d.group].crit = true;
  // Totals come from the kept dice once every die of the repetition has been rolled.
  let total = plan.modifier;
  for (const d of dice) if (d.kept) total += plan.groups[d.group].sign * d.value;
  return { dice, groups, total, capped };
}

export function roll(plan: Plan, rng: Rng): RollRecord {
  // Every repetition's starting dice count toward the 100-dice cap from the beginning.
  const budget: Budget = { follow: 0, dice: stageZeroSizes(plan).length };
  const reps: RepRecord[] = [];
  for (let i = 0; i < plan.times; i++) reps.push(rollRep(plan, rng, budget));
  return { v: 4, text: plan.text, modifier: plan.modifier, reps };
}

/** The group's dice label: `NdS`, or how many were rolled and which kept (`3d6kh2`, `2d20kl1`). */
function labelOf(g: GroupPlan, own: RolledDie[], net: number): string {
  const kept = own.filter((d) => d.kept).length;
  if (kept === own.length) return `${own.length}d${g.size}`;
  return `${own.length}d${g.size}${net < 0 ? "kl" : "kh"}${kept}`;
}
