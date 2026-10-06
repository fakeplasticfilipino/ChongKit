/** Picks dice for an operation: highest/lowest n, above/below n, or equal to n */
export type Selector = { kind: "h" | "l" | ">" | "<" | "="; n: number };

export type Op =
  | { op: "k" | "p" | "rr" | "ro" | "ra" | "e"; sel: Selector }
  | { op: "mi" | "ma"; n: number };

export type Expr =
  | { t: "num"; value: number }
  | {
      t: "dice";
      count: number;
      size: number;
      ops: Op[];
      label?: string;
      /** Order of appearance in the expression, from 0 */
      id: number;
    }
  | {
      t: "bin";
      op: "+" | "-" | "*" | "/" | "//" | "%";
      left: Expr;
      right: Expr;
    }
  | { t: "neg"; expr: Expr }
  | { t: "paren"; expr: Expr; label?: string };

export type DiceExpr = Extract<Expr, { t: "dice" }>;

export interface Command {
  kind: "r" | "rr" | "rrr";
  times: number;
  expr: Expr;
  /** The expression as typed */
  source: string;
  dc?: number;
  comment?: string;
}

export class RollError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RollError";
  }
}

export const MAX_SIDES = 1000;
export const MAX_REPEAT = 25;
export const MAX_WAVE_DICE = 100;
export const MAX_EXTRA_DICE = 20;
