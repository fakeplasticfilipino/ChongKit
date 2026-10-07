import { marks } from "./record";
import { RepRecord, RolledDie, RollRecord } from "./types";

export interface FormattedResult {
  /** The big number: the repetitions' totals joined by `, ` */
  total: string;
  /** One line per repetition: `~~x~~` dropped, `**x**` a crit or a 1; the first ends with ` # note` */
  lines: string[];
}

function dieText(d: RolledDie): string {
  const v = String(d.value);
  if (!d.kept) return `~~${v}~~`;
  // A d1 always shows 1: not a low roll, so not bold
  return d.crit || (d.value === 1 && d.size > 1) ? `**${v}**` : v;
}

function groupText(rep: RepRecord, group: number): string {
  const own = rep.dice.filter((d) => d.group === group);
  const first = own.filter((d) => d.kind === "start" || d.kind === "adv");
  let text = first.length ? `${rep.groups[group].label} (${first.map(dieText).join(", ")})` : "0";
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
function lineOf(rep: RepRecord, modifier: number): string {
  let line = "";
  rep.groups.forEach((g, i) => {
    const text = groupText(rep, i);
    line += i === 0 ? (g.sign < 0 ? `-${text}` : text) : ` ${g.sign < 0 ? "-" : "+"} ${text}`;
  });
  if (modifier) line += ` ${modifier < 0 ? "-" : "+"} ${Math.abs(modifier)}`;
  line += ` = ${rep.total}`;
  for (const m of marks(rep)) line += ` · ${m}`;
  return line;
}

export function formatRecord(record: RollRecord): FormattedResult {
  return {
    total: record.reps.map((r) => String(r.total)).join(", "),
    // The note (`# sword`) ends the first line, as it was typed
    lines: record.reps.map((rep, i) =>
      lineOf(rep, record.modifier) + (i === 0 && record.note ? ` # ${record.note}` : "")),
  };
}
