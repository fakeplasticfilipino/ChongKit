import { expect, test } from "vitest";
import { evaluate } from "./evaluate";
import { formatResult } from "./format";
import { parseCommand } from "./parse";

const f = (s: string, v: Record<string, number>) =>
  formatResult(evaluate(parseCommand(s), v).result!);

test("adv line", () =>
  expect(f("!r 1d20+5 adv Perception", { "0.0.0": 4, "0.0.1": 17 })).toEqual({
    total: "22",
    lines: ["2d20kh1 (~~4~~, 17) + 5 = 22 · Perception"],
  }));

test("crit bold", () =>
  expect(f("1d20", { "0.0.0": 20 }).lines[0]).toBe("1d20 (**20**) = 20"));

test("explode", () =>
  expect(f("1d4!", { "0.0.0": 4, "0.0.0e": 2 }).lines[0]).toBe(
    "1d4! (**4**!, 2) = 6"
  ));

test("reroll shows replaced", () =>
  expect(f("1d6rr1", { "0.0.0": 1, "0.0.0r": 5 }).lines[0]).toBe(
    "1d6rr1 (~~**1**~~, 5) = 5"
  ));

test("rr", () =>
  expect(f("!rr 2 1d6", { "0.0.0": 3, "1.0.0": 5 }).total).toBe("3 · 5"));

test("rrr", () =>
  expect(f("!rrr 2 1d20 10", { "0.0.0": 12, "1.0.0": 3 })).toEqual({
    total: "1 ✓",
    lines: ["1d20 (12) = 12 ✓", "1d20 (3) = 3 ✗"],
  }));

test("decimals", () =>
  expect(f("1d20/3", { "0.0.0": 10 }).total).toBe("3.33"));

test("label", () =>
  expect(f("1d6[fire]+2", { "0.0.0": 3 }).lines[0]).toBe(
    "1d6 (3) [fire] + 2 = 5"
  ));

test("parens and negation", () =>
  expect(f("-(1d6+2)*2", { "0.0.0": 3 }).lines[0]).toBe(
    "-(1d6 (3) + 2) * 2 = -10"
  ));

test("capped note", () => {
  const vals: Record<string, number> = { "0.0.0": 1 };
  let k = "0.0.0";
  for (let i = 0; i < 20; i++) {
    k += "r";
    vals[k] = 1;
  }
  const out = f("1d1rr1", vals);
  expect(out.lines[out.lines.length - 1]).toBe("(stopped at 20 extra dice)");
});
