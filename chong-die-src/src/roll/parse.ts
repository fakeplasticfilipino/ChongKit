import {
  Command,
  DiceExpr,
  Expr,
  MAX_REPEAT,
  MAX_SIDES,
  Op,
  RollError,
  Selector,
} from "./types";

/**
 * Parse an Avrae-style roll command (`!r 1d20+5 adv Perception`).
 * The expression is the longest valid prefix; the rest is the comment.
 * Throws `RollError` with a short message when the command can't be rolled.
 */
export function parseCommand(input: string): Command {
  let text = input.trim();
  let kind: Command["kind"] = "r";
  let times = 1;

  const prefix = /^!(rrr|rr|r)(?=\s|$)/i.exec(text);
  if (prefix) {
    kind = prefix[1].toLowerCase() as Command["kind"];
    text = text.slice(prefix[0].length).trim();
  }
  if (kind !== "r") {
    const count = /^(\d+)(?=\s|$)/.exec(text);
    times = count ? parseInt(count[1], 10) : 0;
    if (times < 1 || times > MAX_REPEAT) {
      throw new RollError(`Repeat count must be 1–${MAX_REPEAT}`);
    }
    text = text.slice(count![0].length).trim();
  }

  const parser = new Parser(text);
  const expr = parser.expression();
  if (!expr) {
    throw new RollError("Nothing to roll");
  }
  const source = text.slice(0, parser.pos).trim();
  let rest = text.slice(parser.pos).trim();

  let dc: number | undefined;
  if (kind === "rrr") {
    const match = /^-?\d+(?=\s|$)/.exec(rest);
    if (!match) {
      throw new RollError("!rrr needs a DC");
    }
    dc = parseInt(match[0], 10);
    rest = rest.slice(match[0].length).trim();
  }

  const advantage = /(^|\s)(adv|dis)(?=\s|$)/i.exec(rest);
  if (advantage) {
    rest = (
      rest.slice(0, advantage.index) +
      rest.slice(advantage.index + advantage[0].length)
    )
      .replace(/\s+/g, " ")
      .trim();
    const d20 = findDice(expr, (d) => d.count === 1 && d.size === 20);
    if (d20) {
      d20.count = 2;
      const keep = advantage[2].toLowerCase() === "adv" ? "h" : "l";
      d20.ops.unshift({ op: "k", sel: { kind: keep, n: 1 } });
    }
  }

  return {
    kind,
    times,
    expr,
    source,
    ...(dc !== undefined ? { dc } : {}),
    ...(rest ? { comment: rest } : {}),
  };
}

function findDice(
  expr: Expr,
  match: (d: DiceExpr) => boolean
): DiceExpr | null {
  switch (expr.t) {
    case "dice":
      return match(expr) ? expr : null;
    case "bin":
      return findDice(expr.left, match) || findDice(expr.right, match);
    case "neg":
    case "paren":
      return findDice(expr.expr, match);
    default:
      return null;
  }
}

class Parser {
  pos = 0;
  private nextId = 0;

  constructor(private text: string) {}

  private skipSpace() {
    while (this.pos < this.text.length && /\s/.test(this.text[this.pos])) {
      this.pos++;
    }
  }

  private peek(s: string) {
    return this.text.startsWith(s, this.pos);
  }

  private readInt(): number | null {
    const match = /^\d+/.exec(this.text.slice(this.pos));
    if (!match) {
      return null;
    }
    this.pos += match[0].length;
    return parseInt(match[0], 10);
  }

  /** expr := term (('+' | '-') term)* — stops before an operator with no operand */
  expression(): Expr | null {
    let left = this.term();
    if (!left) {
      return null;
    }
    for (;;) {
      const save = this.pos;
      this.skipSpace();
      const op = this.peek("+") ? "+" : this.peek("-") ? "-" : null;
      if (!op) {
        this.pos = save;
        return left;
      }
      this.pos++;
      const right = this.term();
      if (!right) {
        this.pos = save;
        return left;
      }
      left = { t: "bin", op, left, right };
    }
  }

  private term(): Expr | null {
    let left = this.unary();
    if (!left) {
      return null;
    }
    for (;;) {
      const save = this.pos;
      this.skipSpace();
      const op = this.peek("//")
        ? "//"
        : this.peek("*")
        ? "*"
        : this.peek("/")
        ? "/"
        : this.peek("%")
        ? "%"
        : null;
      if (!op) {
        this.pos = save;
        return left;
      }
      this.pos += op.length;
      const right = this.unary();
      if (!right) {
        this.pos = save;
        return left;
      }
      left = { t: "bin", op, left, right };
    }
  }

  private unary(): Expr | null {
    const save = this.pos;
    this.skipSpace();
    if (this.peek("-")) {
      this.pos++;
      const expr = this.unary();
      if (expr) {
        return { t: "neg", expr };
      }
      this.pos = save;
      return null;
    }
    const atom = this.atom();
    if (!atom) {
      this.pos = save;
    }
    return atom;
  }

  private atom(): Expr | null {
    if (this.peek("(")) {
      this.pos++;
      const expr = this.expression();
      if (!expr) {
        throw new RollError("Nothing to roll");
      }
      this.skipSpace();
      if (!this.peek(")")) {
        throw new RollError("Missing )");
      }
      this.pos++;
      const label = this.label();
      return { t: "paren", expr, ...(label ? { label } : {}) };
    }
    const start = this.pos;
    const count = this.readInt();
    if (this.peek("d") || this.peek("D")) {
      const afterD = this.text[this.pos + 1];
      if (afterD === "%" || /\d/.test(afterD || "")) {
        this.pos++;
        return this.dice(count === null ? 1 : count);
      }
    }
    if (count === null) {
      this.pos = start;
      return null;
    }
    return { t: "num", value: count };
  }

  private dice(count: number): Expr {
    let size: number;
    if (this.peek("%")) {
      this.pos++;
      size = 100;
    } else {
      size = this.readInt()!;
    }
    if (size === 0) {
      throw new RollError("Unknown die d0");
    }
    if (size > MAX_SIDES) {
      throw new RollError(`Dice can't have more than ${MAX_SIDES} sides`);
    }
    const ops: Op[] = [];
    for (;;) {
      if (this.peek("!")) {
        this.pos++;
        ops.push({ op: "e", sel: { kind: "=", n: size } });
        continue;
      }
      const name = (["rr", "ro", "ra", "mi", "ma", "k", "p", "e"] as const).find(
        (n) => this.peek(n)
      );
      if (!name) {
        break;
      }
      this.pos += name.length;
      if (name === "mi" || name === "ma") {
        const n = this.readInt();
        if (n === null) {
          throw new RollError(`Expected a number after ${name}`);
        }
        ops.push({ op: name, n });
      } else {
        ops.push({ op: name, sel: this.selector(name) });
      }
    }
    const label = this.label();
    const dice: Expr = { t: "dice", count, size, ops, id: this.nextId++ };
    if (label) {
      dice.label = label;
    }
    return dice;
  }

  private selector(op: string): Selector {
    const ch = this.text[this.pos];
    let kind: Selector["kind"] = "=";
    if (ch === "h" || ch === "l" || ch === ">" || ch === "<") {
      kind = ch;
      this.pos++;
    }
    const n = this.readInt();
    if (n === null) {
      throw new RollError(
        `Expected a number after ${op}${kind === "=" ? "" : kind}`
      );
    }
    return { kind, n };
  }

  /** Optional `[label]` after a die or parentheses */
  private label(): string | undefined {
    const save = this.pos;
    this.skipSpace();
    const match = /^\[([^\]]*)\]/.exec(this.text.slice(this.pos));
    if (!match) {
      this.pos = save;
      return undefined;
    }
    this.pos += match[0].length;
    return match[1].trim();
  }
}
