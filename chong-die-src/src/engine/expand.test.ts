import { expect, test } from "vitest";
import { BUILT_IN_NAMES, EngineError, checkName, expand, parseDefinition } from "./index";

const names = { ...BUILT_IN_NAMES, atk: "1d10 nimble chain 5+ chain adv" };

test("expands names recursively and collapses spaces", () => {
  expect(expand("atk +3", names)).toBe("1d10 crit miss 1 chain 5+ chain adv +3");
});

test("notes are untouched", () => {
  expect(expand("2d6 nimble # note with nimble", names)).toBe(
    "2d6 crit miss 1 # note with nimble",
  );
});

test("names are whole words delimited by space, + or -, any case", () => {
  expect(expand("atk+3", names)).toBe("1d10 crit miss 1 chain 5+ chain adv+3");
  expect(expand("ATK", { atk: "1d4" })).toBe("1d4");
  expect(expand("atkx 2d6-atk", { atk: "1d4" })).toBe("atkx 2d6-1d4");
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
