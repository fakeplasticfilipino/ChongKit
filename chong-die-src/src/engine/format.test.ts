import { expect, test } from "vitest";
import { parse } from "./parse";
import { roll, seq } from "./roll";
import { formatRecord } from "./format";

const f = (cmd: string, vals: number[]) => formatRecord(roll(parse(cmd), seq(vals)));

test("crit die bold, modifier, total and mark", () => {
  expect(f("1d10+3 crit", [10, 2]).lines[0]).toBe("1d10 (**10**) + chain (2) + 3 = 15 · CRIT");
});
test("a crit-range value is bold too", () => {
  expect(f("1d10 crit5-10", [7, 4]).lines[0]).toBe("1d10 (**7**) + chain (4) = 11 · CRIT");
});
test("chain picks", () => {
  expect(f("1d10 crit critadv", [10, 3, 8]).lines[0]).toBe("1d10 (**10**) + chain 2d10kh1 (~~3~~, 8) = 18 · CRIT");
  expect(f("1d10 crit critadv", [10, 4, 10, 3, 2]).lines[0]).toBe(
    "1d10 (**10**) + chain 2d10kh1 (~~4~~, **10**) + chain 2d10kh1 (3, ~~2~~) = 23 · CRIT");
});
test("a 1 is bold, a dropped 1 is not", () => {
  expect(f("1d20", [1]).lines[0]).toBe("1d20 (**1**) = 1");
  expect(f("2d20 adv", [1, 5, 9]).lines[0]).toBe("3d20kh2 (~~1~~, 5, 9) = 14");
});
test("labels for adv and dis", () => {
  expect(f("2d6 adv", [1, 2, 3]).lines[0]).toBe("3d6kh2 (~~1~~, 2, 3) = 5");
  expect(f("2d6 dis", [4, 2, 6]).lines[0]).toBe("3d6kl2 (4, 2, ~~6~~) = 6");
});
test("a negative group and subtraction", () => {
  expect(f("1d6 - 1d4 - 2", [5, 3]).lines[0]).toBe("1d6 (5) - 1d4 (3) - 2 = 0");
});
test("miss mark", () => {
  expect(f("1d20 crit miss", [1]).lines[0]).toBe("1d20 (**1**) = 1 · MISS");
});
test("repetitions and their totals", () => {
  const r = f("2d6 crit miss x2", [1, 6, 5, 3]);
  expect(r.lines.length).toBe(2);
  expect(r.total).toBe(r.lines.map((l) => l.split(" = ")[1].split(" ")[0]).join(", "));
});
test("a tied disadvantage still reads kl", () => {
  expect(f("2d6 dis", [4, 4, 4]).lines[0]).toMatch(/^3d6kl2 /);
});
test("a d1's 1 is not bold", () => {
  expect(f("1d1", [1]).lines[0]).toBe("1d1 (1) = 1");
});
