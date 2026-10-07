import { expect, test } from "vitest";
import { EngineError, checkName, expand, parse, parseDefinition, roll, seq } from "./index";

// The engine knows no system: this test map defines its own `nimble`.
const names = { nimble: "crit miss 1", atk: "1d10 nimble chain 5+ chain adv", gs: "2d6 crit miss 4-" };

test("expands names recursively and collapses spaces", () => {
  expect(expand("atk +3", names)).toBe("1d10 crit miss 1 chain 5+ chain adv +3");
});

test("notes are untouched", () => {
  expect(expand("2d6 nimble # note with nimble", names)).toBe(
    "2d6 crit miss 1 # note with nimble",
  );
});

test("names are whole words delimited by space, + or -, any case", () => {
  expect(expand("atk+3", names)).toBe("1d10 crit miss 1 chain 5+ chain adv +3");
  expect(expand("ATK", { atk: "1d4" })).toBe("1d4");
  expect(expand("atkx 2d6-atk", { atk: "1d4" })).toBe("atkx 2d6- 1d4");
});

test("loops throw naming the chain", () => {
  expect(() => expand("a", { a: "b", b: "a" })).toThrow("Saved names loop: a → b → a");
  expect(() => expand("a", { a: "a" })).toThrow(EngineError);
});

test("a name that doubles itself can't blow up", () => {
  const n = { a: "b b", b: "c c", c: "d d", d: "e e", e: "f f", f: "g g", g: "h h", h: "i i",
    i: "j j", j: "k k", k: "l l", l: "m m", m: "n n", n: "o o", o: "p p", p: "x1 ".repeat(50) };
  expect(() => expand("a", n)).toThrow(EngineError);
});

test("checkName", () => {
  expect(checkName("crit")).toMatch(/word/);
  expect(checkName("adv2")).toMatch(/word/);
  expect(checkName("d6")).toMatch(/dice/);
  expect(checkName("2d6")).not.toBeNull();
  expect(checkName("9lives")).not.toBeNull();
  expect(checkName("atk")).toBeNull();
  expect(checkName("my_atk2")).toBeNull();
});

test("parseDefinition", () => {
  expect(parseDefinition("atk = 1d10 crit")).toEqual({ name: "atk", text: "1d10 crit" });
  expect(parseDefinition("  ATK =  ")).toEqual({ name: "atk", text: "" });
  expect(parseDefinition("1d10 crit")).toBeNull();
  expect(parseDefinition("two words = 1d4")).toBeNull();
  expect(parseDefinition("2d6 = 1d4")).toBeNull();
});

test("a name's note moves to the end", () => {
  const n = { atk: "1d10 crit # sword", big: "atk +1 # big", plain: "1d4" };
  expect(expand("atk +3", n)).toBe("1d10 crit +3 # sword");
  expect(expand("atk +3 # first", n)).toBe("1d10 crit +3 # first · sword");
  expect(expand("big +2", n)).toBe("1d10 crit +1 +2 # sword · big");
  expect(expand("plain +1", n)).toBe("1d4 +1");
});

test("a diamond is not a loop", () => {
  expect(expand("a", { a: "b +c", b: "d", c: "d", d: "1d4" })).toBe("1d4 + 1d4");
});

test("a sign glued after a name stays its own part", () => {
  expect(expand("1d10 nimble+3", names)).toBe("1d10 crit miss 1 +3");
  expect(expand("1d10 nimble-1", names)).toBe("1d10 crit miss 1 -1");
  expect(expand("gs+2", names)).toBe("2d6 crit miss 4- +2");
});

const total = (cmd: string, vals: number[]) => roll(parse(expand(cmd, names)), seq(vals)).reps[0].total;

test("glued signs after names and ranges count in the total", () => {
  expect(total("1d10 nimble+3", [5])).toBe(8);
  expect(total("1d10 nimble-1", [5])).toBe(4);
  expect(parse(expand("1d10 nimble-1", names)).groups[0].miss).toEqual({ min: 1, max: 1 });
  expect(total("atk+3", [4])).toBe(7);
  expect(total("atk-1", [4])).toBe(3);
  expect(total("gs+2", [5, 6])).toBe(13);
  expect(total("2d6 crit miss 4-+3", [5, 6])).toBe(14);
});
