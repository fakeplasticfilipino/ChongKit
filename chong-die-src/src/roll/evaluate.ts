import {
  Command,
  DiceExpr,
  Expr,
  MAX_EXTRA_DICE,
  MAX_WAVE_DICE,
  Op,
  RollError,
  Selector,
} from "./types";

export interface LogicalDie {
  key: string;
  size: number;
  parent?: string;
  reason: "roll" | "reroll" | "explode";
}

export interface DieResult {
  key: string;
  size: number;
  value: number;
  dropped: boolean;
  exploded: boolean;
  rerolled: boolean;
}

export interface RepResult {
  total: number;
  /** Dice of each dice term, keyed by the term's id */
  terms: Map<number, DieResult[]>;
  success?: boolean;
}

export interface CommandResult {
  command: Command;
  reps: RepResult[];
  capped: boolean;
}

export interface Evaluation {
  /** Dice that need a value before the roll can finish (the next wave) */
  needed: LogicalDie[];
  /** Set once every die has a value */
  result: CommandResult | null;
}

/**
 * Evaluate a command against the die values known so far.
 * Pure: the same values always give the same answer, so every player can
 * work out the result from the synced values.
 * Keys: `<rep>.<dice id>.<n>` for the first throw; a reroll appends `r`,
 * an explosion appends `e` to its parent's key.
 */
export function evaluate(
  cmd: Command,
  values: Record<string, number>
): Evaluation {
  const firstWave = countDice(cmd.expr) * cmd.times;
  if (firstWave > MAX_WAVE_DICE) {
    throw new RollError(`Too many dice (max ${MAX_WAVE_DICE})`);
  }

  const state: State = { values, needed: [], extra: 0, capped: false };
  const reps: RepResult[] = [];
  for (let rep = 0; rep < cmd.times; rep++) {
    const terms = new Map<number, DieResult[]>();
    const total = evalExpr(cmd.expr, rep, terms, state);
    const result: RepResult = { total: total ?? NaN, terms };
    if (cmd.kind === "rrr" && total !== null) {
      result.success = total >= cmd.dc!;
    }
    reps.push(result);
  }

  if (state.needed.length > 0) {
    return { needed: state.needed, result: null };
  }
  return {
    needed: [],
    result: { command: cmd, reps, capped: state.capped },
  };
}

interface State {
  values: Record<string, number>;
  needed: LogicalDie[];
  /** Follow-up dice seen so far (rerolls and explosions) */
  extra: number;
  capped: boolean;
}

function countDice(expr: Expr): number {
  switch (expr.t) {
    case "dice":
      return expr.count;
    case "bin":
      return countDice(expr.left) + countDice(expr.right);
    case "neg":
    case "paren":
      return countDice(expr.expr);
    default:
      return 0;
  }
}

/** Returns null while any die in the expression is still missing */
function evalExpr(
  expr: Expr,
  rep: number,
  terms: Map<number, DieResult[]>,
  state: State
): number | null {
  switch (expr.t) {
    case "num":
      return expr.value;
    case "dice":
      return evalDice(expr, rep, terms, state);
    case "neg": {
      const v = evalExpr(expr.expr, rep, terms, state);
      return v === null ? null : -v;
    }
    case "paren":
      return evalExpr(expr.expr, rep, terms, state);
    case "bin": {
      // Evaluate both sides so every missing die is collected in one wave
      const a = evalExpr(expr.left, rep, terms, state);
      const b = evalExpr(expr.right, rep, terms, state);
      if (a === null || b === null) {
        return null;
      }
      switch (expr.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
        case "//":
        case "%":
          if (b === 0) {
            throw new RollError("Can't divide by zero");
          }
          return expr.op === "/"
            ? a / b
            : expr.op === "//"
            ? Math.floor(a / b)
            : a - b * Math.floor(a / b);
      }
    }
  }
}

/** Outcome of asking for a follow-up die */
type Follow = DieResult | "missing" | "capped";

function evalDice(
  expr: DiceExpr,
  rep: number,
  terms: Map<number, DieResult[]>,
  state: State
): number | null {
  const dice: DieResult[] = [];
  terms.set(expr.id, dice);

  let missing = false;
  for (let n = 0; n < expr.count; n++) {
    const key = `${rep}.${expr.id}.${n}`;
    const value = state.values[key];
    if (value === undefined) {
      state.needed.push({ key, size: expr.size, reason: "roll" });
      missing = true;
    } else {
      dice.push(newDie(key, expr.size, value));
    }
  }
  if (missing) {
    return null;
  }

  const follow = (parent: DieResult, reason: "reroll" | "explode"): Follow => {
    if (state.extra >= MAX_EXTRA_DICE) {
      state.capped = true;
      return "capped";
    }
    state.extra++;
    const key = parent.key + (reason === "reroll" ? "r" : "e");
    const value = state.values[key];
    if (value === undefined) {
      state.needed.push({ key, size: parent.size, parent: parent.key, reason });
      return "missing";
    }
    const die = newDie(key, parent.size, value);
    dice.push(die);
    return die;
  };

  for (const op of expr.ops) {
    if (!applyOp(op, dice, follow)) {
      return null;
    }
  }

  return dice.filter((d) => !d.dropped).reduce((sum, d) => sum + d.value, 0);
}

function newDie(key: string, size: number, value: number): DieResult {
  return { key, size, value, dropped: false, exploded: false, rerolled: false };
}

/** Applies one operation; false when a follow-up die is still missing */
function applyOp(
  op: Op,
  dice: DieResult[],
  follow: (parent: DieResult, reason: "reroll" | "explode") => Follow
): boolean {
  const kept = () => dice.filter((d) => !d.dropped);

  switch (op.op) {
    case "mi":
      kept().forEach((d) => (d.value = Math.max(d.value, op.n)));
      return true;
    case "ma":
      kept().forEach((d) => (d.value = Math.min(d.value, op.n)));
      return true;
    case "k": {
      const chosen = select(kept(), op.sel);
      kept().forEach((d) => {
        if (!chosen.has(d)) {
          d.dropped = true;
        }
      });
      return true;
    }
    case "p":
      select(kept(), op.sel).forEach((d) => (d.dropped = true));
      return true;
    case "ro":
    case "rr": {
      let todo = [...select(kept(), op.sel)];
      // Ask for every missing die at once so they share one wave
      let complete = true;
      while (todo.length > 0) {
        const next: DieResult[] = [];
        for (const d of todo) {
          const result = follow(d, "reroll");
          if (result === "capped") {
            return true;
          }
          d.dropped = true;
          d.rerolled = true;
          if (result === "missing") {
            complete = false;
            continue;
          }
          if (op.op === "rr" && matches(result, op.sel)) {
            next.push(result);
          }
        }
        todo = next;
      }
      return complete;
    }
    case "ra": {
      const first = [...select(kept(), op.sel)][0];
      if (!first) {
        return true;
      }
      const result = follow(first, "reroll");
      return result !== "missing";
    }
    case "e": {
      const todo = [...select(kept(), op.sel)];
      let complete = true;
      while (todo.length > 0) {
        const d = todo.shift()!;
        const result = follow(d, "explode");
        if (result === "capped") {
          return true;
        }
        d.exploded = true;
        if (result === "missing") {
          complete = false;
          continue;
        }
        if (matches(result, op.sel)) {
          todo.push(result);
        }
      }
      return complete;
    }
  }
}

/** The dice a selector picks, in their original order */
function select(dice: DieResult[], sel: Selector): Set<DieResult> {
  if (sel.kind === "h" || sel.kind === "l") {
    const sorted = [...dice].sort((a, b) =>
      sel.kind === "h" ? b.value - a.value : a.value - b.value
    );
    return new Set(sorted.slice(0, sel.n));
  }
  return new Set(dice.filter((d) => matches(d, sel)));
}

/** Value test for new dice (h / l only pick from the first set) */
function matches(d: DieResult, sel: Selector): boolean {
  switch (sel.kind) {
    case "=":
      return d.value === sel.n;
    case ">":
      return d.value > sel.n;
    case "<":
      return d.value < sel.n;
    default:
      return false;
  }
}
