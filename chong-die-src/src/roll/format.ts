import { CommandResult, DieResult } from "./evaluate";
import { Expr, MAX_EXTRA_DICE, Op } from "./types";

export interface FormattedResult {
  /** The big number: one total, `!rr` totals joined, or `!rrr` successes */
  total: string;
  /**
   * Avrae-style breakdown, one line per roll: `~~x~~` dropped,
   * `**x**` a 1 or the die's max, `x!` exploded
   */
  lines: string[];
}

export function formatResult(r: CommandResult): FormattedResult {
  const { command } = r;
  const lines = r.reps.map((rep) => {
    let line = `${exprText(command.expr, rep.terms)} = ${repTotal(rep)}`;
    if (rep.success !== undefined) {
      line += rep.success ? " ✓" : " ✗";
    }
    return line;
  });
  if (command.comment) {
    lines[0] += ` · ${command.comment}`;
  }
  if (r.capped) {
    lines.push(`(stopped at ${MAX_EXTRA_DICE} extra dice)`);
  }

  let total: string;
  if (command.kind === "rrr") {
    total = `${r.reps.filter((rep) => rep.success).length} ✓`;
  } else {
    total = r.reps.map(repTotal).join(" · ");
  }
  return { total, lines };
}

/** A roll's total, or Miss (Nimble: a 1 on the primary die) */
function repTotal(rep: { total: number; miss: boolean }): string {
  return rep.miss ? "Miss" : num(rep.total);
}

/** Whole numbers as is, others to at most 2 decimals */
export function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function exprText(expr: Expr, terms: Map<number, DieResult[]>): string {
  switch (expr.t) {
    case "num":
      return String(expr.value);
    case "dice": {
      const dice = terms.get(expr.id) || [];
      const notation = `${expr.count}d${expr.size}${expr.ops
        .map((op) => opText(op, expr.size))
        .join("")}`;
      const label = expr.label ? ` [${expr.label}]` : "";
      return `${notation} (${dice.map(dieText).join(", ")})${label}`;
    }
    case "bin":
      return `${exprText(expr.left, terms)} ${expr.op} ${exprText(
        expr.right,
        terms
      )}`;
    case "neg":
      return `-${exprText(expr.expr, terms)}`;
    case "paren":
      return `(${exprText(expr.expr, terms)})${
        expr.label ? ` [${expr.label}]` : ""
      }`;
  }
}

function opText(op: Op, size: number): string {
  if (op.op === "mi" || op.op === "ma") {
    return `${op.op}${op.n}`;
  }
  const { sel } = op as Extract<Op, { sel: unknown }>;
  if (op.op === "e" && sel.kind === "=" && sel.n === size) {
    return "!";
  }
  return `${op.op}${sel.kind === "=" ? "" : sel.kind}${sel.n}`;
}

function dieText(d: DieResult): string {
  let text = String(d.value);
  if (d.value === 1 || d.value === d.size) {
    text = `**${text}**`;
  }
  if (d.exploded) {
    text += "!";
  }
  if (d.dropped) {
    text = `~~${text}~~`;
  }
  return text;
}
