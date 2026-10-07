import { expect, test } from "vitest";
import { parse } from "./parse";
import { roll, seq } from "./roll";
import { formatRecord } from "./format";

const f = (cmd: string, vals: number[]) => formatRecord(roll(parse(cmd), seq(vals)));

test("crit die bold, modifier, total and mark", () => {
  const line = f("1d10 crit +3", [10, 2]).lines[0];
  expect(line).toContain("**10**");
  expect(line).toContain("= 15");
  expect(line).toContain("· CRIT");
  expect(line).toBe("1d10 (**10**) + chain (2) + 3 = 15 · CRIT");
});
test("a chain pick", () => {
  expect(f("1d10 crit chain 5+ chain adv", [6, 3, 8]).lines[0]).toContain("chain 2d10kh1 (~~3~~, 8)");
});
test("spec example", () => {
  expect(f("1d10 crit chain 5+ chain adv", [7, 4, 10, 3, 2]).lines[0]).toBe(
    "1d10 (7) + chain 2d10kh1 (~~4~~, **10**) + chain 2d10kh1 (3, ~~2~~) = 20 · CRIT");
});
test("a 1 is bold, a dropped 1 is not", () => {
  expect(f("1d20", [1]).lines[0]).toBe("1d20 (**1**) = 1");
  expect(f("2d20 adv", [1, 5, 9]).lines[0]).toBe("3d20kh2 (~~1~~, 5, 9) = 14");
});
test("labels for adv, dis, keep, drop", () => {
  expect(f("2d6 adv", [1, 2, 3]).lines[0]).toBe("3d6kh2 (~~1~~, 2, 3) = 5");
  expect(f("2d6 dis", [4, 2, 6]).lines[0]).toBe("3d6kl2 (4, 2, ~~6~~) = 6");
  expect(f("4d6 keep 3", [2, 3, 4, 5]).lines[0]).toBe("4d6kh3 (~~2~~, 3, 4, 5) = 12");
  expect(f("2d20 keep low 1", [9, 4]).lines[0]).toBe("2d20kl1 (~~9~~, 4) = 4");
});
test("explode and negative group, subtraction", () => {
  expect(f("1d6 explode", [6, 2]).lines[0]).toBe("1d6 (6) + explode (2) = 8");
  expect(f("1d6 - 1d4 - 2", [5, 3]).lines[0]).toBe("1d6 (5) - 1d4 (3) - 2 = 0");
});
test("miss and crit marks, repetitions and total", () => {
  const r = f("2d6 crit miss 4- x2", [1, 6, 5, 3]);
  expect(r.lines.length).toBe(2);
  expect(r.total).toBe(r.lines.map((l) => l.split(" = ")[1].split(" ")[0]).join(", "));
});
test("miss and crit together", () => {
  expect(f("1d4 crit miss 4-", [4, 1]).lines[0]).toBe("1d4 (**4**) + chain (**1**) = 5 · MISS · CRIT");
});
test("a tied disadvantage still reads kl", () => {
  expect(f("2d6 dis", [4, 4, 4]).lines[0]).toMatch(/^3d6kl2 /);
});
