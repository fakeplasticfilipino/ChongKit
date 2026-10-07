import { parse } from "./parse";
import { marks } from "./record";
import { Plan, RepRecord, RolledDie, RollRecord } from "./types";

export interface FormattedResult {
  /** The big number: the repetitions' totals joined by `, ` */
  total: string;
  /** One line per repetition, Avrae-style: `~~x~~` dropped, `**x**` a crit or a 1 */
  lines: string[];
}

function dieText(d: RolledDie): string {
  const v = String(d.value);
  if (!d.kept) return `~~${v}~~`;
  return d.crit || d.value === 1 ? `**${v}**` : v;
}

/** `NdS`, or how many were rolled and which kept: `3d6kh2`, `2d20kl1`. */
function diceLabel(first: RolledDie[]): string {
  const size = first[0].size;
  const kept = first.filter((d) => d.kept);
  if (kept.length === first.length) return `${first.length}d${size}`;
  const droppedHigher = first.some((d) => !d.kept && kept.some((k) => d.value > k.value));
  return `${first.length}d${size}${droppedHigher ? "kl" : "kh"}${kept.length}`;
}

function groupText(rep: RepRecord, group: number): string {
  const own = rep.dice.filter((d) => d.group === group);
  const first = own.filter((d) => d.kind === "start" || d.kind === "adv");
  let text = first.length ? `${diceLabel(first)} (${first.map(dieText).join(", ")})` : "0";
  const done = new Set<number>();
  for (const d of own) {
    if (d.kind === "explode") text += ` + explode (${dieText(d)})`;
    else if (d.kind === "chain" && !done.has(d.pick ?? d.id)) {
      const pick = own.filter((c) => c.kind === "chain" && (c.pick ?? c.id) === (d.pick ?? d.id));
      pick.forEach((c) => done.add(c.pick ?? c.id));
      text += pick.length > 1
        ? ` + chain ${pick.length}d${d.size}kh1 (${pick.map(dieText).join(", ")})`
        : ` + chain (${dieText(d)})`;
    }
  }
  return text;
}

/** One repetition: groups joined by their signs, the modifier, the total, then the marks. */
function lineOf(rep: RepRecord, plan: Plan): string {
  let line = "";
  plan.groups.forEach((g, i) => {
    const text = groupText(rep, i);
    line += i === 0 ? (g.sign < 0 ? `-${text}` : text) : ` ${g.sign < 0 ? "-" : "+"} ${text}`;
  });
  if (plan.modifier) line += ` ${plan.modifier < 0 ? "-" : "+"} ${Math.abs(plan.modifier)}`;
  line += ` = ${rep.total}`;
  for (const m of marks(rep)) line += ` · ${m}`;
  return line;
}

export function formatRecord(record: RollRecord): FormattedResult {
  // The record keeps the command's text; its signs and modifier come from parsing it again.
  const plan = parse(record.text);
  return {
    total: record.reps.map((r) => String(r.total)).join(", "),
    lines: record.reps.map((rep) => lineOf(rep, plan)),
  };
}
