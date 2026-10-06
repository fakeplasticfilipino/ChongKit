import { expect, test } from "vitest";
import { parseCommand } from "./parse";

test("plain", () =>
  expect(parseCommand("!r 1d20+5").expr).toMatchObject({
    t: "bin",
    op: "+",
    left: { t: "dice", count: 1, size: 20 },
    right: { t: "num", value: 5 },
  }));

test("bare and comment", () =>
  expect(parseCommand("1d20 + 5 Perception check")).toMatchObject({
    kind: "r",
    comment: "Perception check",
    source: "1d20 + 5",
  }));

test("ops in order", () =>
  expect((parseCommand("4d6rr1kh3").expr as any).ops).toEqual([
    { op: "rr", sel: { kind: "=", n: 1 } },
    { op: "k", sel: { kind: "h", n: 3 } },
  ]));

test("selectors", () =>
  expect((parseCommand("8d6p<3k>2mi2ma5").expr as any).ops).toEqual([
    { op: "p", sel: { kind: "<", n: 3 } },
    { op: "k", sel: { kind: ">", n: 2 } },
    { op: "mi", n: 2 },
    { op: "ma", n: 5 },
  ]));

test("d% and bang", () => {
  expect((parseCommand("d%").expr as any).size).toBe(100);
  expect((parseCommand("2d4!").expr as any).ops).toEqual([
    { op: "e", sel: { kind: "=", n: 4 } },
  ]);
});

test("adv", () =>
  expect(parseCommand("!r 1d20+3 adv").expr).toMatchObject({
    left: { count: 2, size: 20, ops: [{ op: "k", sel: { kind: "h", n: 1 } }] },
  }));

test("dis keeps comment", () =>
  expect(parseCommand("1d20 dis Stealth").comment).toBe("Stealth"));

test("labels and math", () =>
  expect(parseCommand("(1d6+2)[fire]*2 // 3").expr).toMatchObject({
    t: "bin",
    op: "//",
  }));

test("dice label", () =>
  expect(parseCommand("1d6[fire]+2").expr).toMatchObject({
    left: { t: "dice", label: "fire" },
  }));

test("dice ids in order", () =>
  expect(parseCommand("1d4+1d6").expr).toMatchObject({
    left: { id: 0 },
    right: { id: 1 },
  }));

test("rr", () =>
  expect(parseCommand("!rr 3 1d20+5 Attack")).toMatchObject({
    kind: "rr",
    times: 3,
    comment: "Attack",
  }));

test("rrr", () =>
  expect(parseCommand("!rrr 4 1d20+5 15 Save")).toMatchObject({
    kind: "rrr",
    times: 4,
    dc: 15,
    comment: "Save",
  }));

test.each([
  ["1d0", "Unknown die d0"],
  ["1d1001", "Dice can't have more than 1000 sides"],
  ["!rr 26 1d6", "Repeat count must be 1–25"],
  ["4d6kh", "Expected a number after kh"],
  ["(1d6", "Missing )"],
  ["!r", "Nothing to roll"],
  ["!rrr 2 1d20", "!rrr needs a DC"],
])("error %s", (input, message) =>
  expect(() => parseCommand(input)).toThrow(message));
