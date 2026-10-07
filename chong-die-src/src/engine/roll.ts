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
  const order = dice.filter((d) => d.kept).sort((a, b) => (highest ? b.value - a.value : a.value - b.value) || a.id - b.id);
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

/** Counters shared by every repetition of one command (the caps). */
interface Budget {
  follow: number;
  dice: number;
}

type Source = "crit" | "range" | "explode";

/** Whether a die can crit: it shows its size and is the group's crit die (see the spec's Crit). */
function canCrit(d: RolledDie, g: GroupPlan, primary: number | null): boolean {
  if (!d.kept || g.crit === "none") return false;
  if (d.kind === "chain") return true;
  if (g.crit === "each") return d.kind === "start" || d.kind === "adv";
  return d.id === primary;
}

/** The one follow-up a die earns, if any. The table's ruling: one chain die per die, so crit beats range beats explode. */
export function followUp(die: RolledDie, g: GroupPlan, primary: number | null): Source | null {
  if (!die.kept) return null;
  if (die.crit) return "crit";
  if (die.id === primary && g.chain.some((r) => inRange(die.value, r))) return "range";
  if (g.explode && die.kind !== "chain" && die.value === die.size) return "explode";
  return null;
}

/** A chain die: `1 + chainAdv` dice of the parent's size; the highest is kept (ties: the leftmost). */
function chainPick(parent: RolledDie, g: GroupPlan, source: "crit" | "range", rng: Rng, nextId: number): RolledDie[] {
  const dice: RolledDie[] = [];
  for (let i = 0; i <= g.chainAdv; i++) {
    dice.push({
      id: nextId + i, group: parent.group, size: parent.size, value: rng(parent.size),
      kind: "chain", kept: true, crit: false, parent: parent.id, pick: nextId, source,
    });
  }
  let best = dice[0];
  for (const d of dice) if (d.value > best.value) best = d;
  for (const d of dice) d.kept = d === best;
  best.crit = g.crit !== "none" && best.value === best.size;
  return dice;
}

/** The first kept start or adv die, by id. */
export function primaryOf(dice: RolledDie[]): number | null {
  return dice.find((d) => d.kept && (d.kind === "start" || d.kind === "adv"))?.id ?? null;
}

function rollRep(plan: Plan, rng: Rng, budget: Budget): RepRecord {
  const dice: RolledDie[] = [];
  const groups: GroupResult[] = [];
  plan.groups.forEach((g, gi) => {
    const own = rollGroup(g, gi, rng, dice.length);
    applyAdvantage(g, own);
    applyKeep(g, own);
    const primary = primaryOf(own);
    for (const d of own) d.crit = canCrit(d, g, primary) && d.value === d.size;
    dice.push(...own);
    const pd = own.find((d) => d.id === primary);
    groups.push({ sign: g.sign, label: labelOf(g, own), primary, miss: !!(pd && g.miss && inRange(pd.value, g.miss)), crit: false });
  });
  // Follow-ups, breadth-first in id order; each gets the next ids.
  let capped = false;
  for (let i = 0; i < dice.length && !capped; i++) {
    const die = dice[i];
    const g = plan.groups[die.group];
    const source = followUp(die, g, groups[die.group].primary);
    if (!source) continue;
    const size = source === "explode" ? 1 : 1 + g.chainAdv;
    if (budget.follow + 1 > MAX_FOLLOW || budget.dice + size > MAX_DICE) {
      capped = true;
      break;
    }
    budget.follow += 1;
    budget.dice += size;
    if (source === "explode") {
      dice.push({
        id: dice.length, group: die.group, size: die.size, value: rng(die.size),
        kind: "explode", kept: true, crit: false, parent: die.id, pick: null, source,
      });
    } else {
      dice.push(...chainPick(die, g, source, rng, dice.length));
    }
  }
  for (const d of dice) if (d.crit) groups[d.group].crit = true;
  // Totals come from the kept dice once every die of the repetition has been rolled.
  let total = plan.modifier;
  for (const d of dice) if (d.kept) total += plan.groups[d.group].sign * d.value;
  return { dice, groups, total, capped };
}

export function roll(plan: Plan, rng: Rng): RollRecord {
  let start = 0;
  for (const g of plan.groups) start += g.count + Math.abs(g.adv - g.dis);
  // Every repetition's starting dice count toward the 100-dice cap from the beginning.
  const budget: Budget = { follow: 0, dice: start * plan.times };
  const reps: RepRecord[] = [];
  for (let i = 0; i < plan.times; i++) reps.push(rollRep(plan, rng, budget));
  return { v: 3, text: plan.text, note: plan.note, modifier: plan.modifier, reps };
}

/** The group's dice label: `NdS`, or how many were rolled and which kept (`3d6kh2`, `2d20kl1`). */
function labelOf(g: GroupPlan, own: RolledDie[]): string {
  const kept = own.filter((d) => d.kept).length;
  if (kept === own.length) return `${own.length}d${g.size}`;
  const low = g.keep ? g.keep.low : g.adv - g.dis < 0;
  return `${own.length}d${g.size}${low ? "kl" : "kh"}${kept}`;
}
