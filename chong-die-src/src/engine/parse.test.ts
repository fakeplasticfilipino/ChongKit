import { expect, test } from "vitest";
import { EngineError, parse, stageZeroSizes } from "./index";

test("the chain player's attack", () => {
  const p = parse("1d10 crit chain 5+ chain adv +3 # longsword");
  expect(p.groups).toEqual([
    {
      sign: 1, count: 1, size: 10, adv: 0, dis: 0, keep: null, drop: 0,
      crit: "primary", miss: null, chain: [{ min: 5, max: Infinity }], chainAdv: 1, explode: false,
    },
  ]);
  expect(p.modifier).toBe(3);
  expect(p.note).toBe("longsword");
  expect(p.times).toBe(1);
  expect(p.text).toBe("1d10 crit chain 5+ chain adv +3 # longsword");
});

test("groups, signs and modifiers", () => {
  const p = parse("1d4 crit miss 1 + 2d6 - 1d4 + 3");
  expect(p.groups.map((g) => [g.sign, g.count, g.size, g.crit])).toEqual([
    [1, 1, 4, "primary"], [1, 2, 6, "none"], [-1, 1, 4, "none"],
  ]);
  expect(p.groups[0].miss).toEqual({ min: 1, max: 1 });
  expect(p.modifier).toBe(3);
});

test("ranges keep their + and -", () => {
  const a = parse("2d6 crit miss 4- + 3");
  expect(a.groups[0].miss).toEqual({ min: -Infinity, max: 4 });
  expect(a.modifier).toBe(3);
  expect(parse("1d10 crit chain 1-2").groups[0].chain).toEqual([{ min: 1, max: 2 }]);
  expect(parse("1d10 crit chain 5+ chain 1").groups[0].chain).toHaveLength(2);
  expect(parse("1d10 crit chain adv2").groups[0].chainAdv).toBe(2);
});

test("no spaces and capitals", () => {
  expect(parse("2D6+3")).toMatchObject({ modifier: 3, groups: [{ count: 2, size: 6 }] });
  expect(parse("1d20-2")).toMatchObject({ modifier: -2 });
  expect(parse("1D10 CRIT EACH EXPLODE").groups[0]).toMatchObject({ crit: "each", explode: true });
  expect(() => parse("1d10crit")).toThrow(/1d10crit/);
});

test("shorthand dice", () => {
  expect(parse("d20").groups[0]).toMatchObject({ count: 1, size: 20 });
  expect(parse("d%").groups[0]).toMatchObject({ count: 1, size: 100 });
});

test("counters, keep and drop", () => {
  expect(parse("2d6 adv3 dis1").groups[0]).toMatchObject({ adv: 3, dis: 1 });
  expect(parse("2d6 adv adv").groups[0]).toMatchObject({ adv: 2 });
  expect(parse("4d6 keep 3").groups[0].keep).toEqual({ n: 3, low: false });
  expect(parse("2d20 keep low 1").groups[0].keep).toEqual({ n: 1, low: true });
  expect(parse("4d6 drop 1").groups[0].drop).toBe(1);
});

test("times and note", () => {
  expect(parse("1d6 x3 + 2").times).toBe(3);
  expect(parse("x3 1d6").times).toBe(3);
  expect(parse("1d6 #").note).toBeNull();
  expect(parse("1d6 # a # b").note).toBe("a # b");
});

test("errors name the problem", () => {
  expect(() => parse("1d10 chian 5+")).toThrow('Unknown word "chian"');
  expect(() => parse("2d6 adv keep 1")).toThrow(EngineError);
  expect(() => parse("1d10 chain 5+")).toThrow(/crit/);
  expect(() => parse("crit 1d6")).toThrow(EngineError);
  expect(() => parse("1d6 +")).toThrow(EngineError);
  expect(() => parse("1d6 x26")).toThrow(EngineError);
  expect(() => parse("1d6 x0")).toThrow(EngineError);
  expect(() => parse("1d6 x2 x3")).toThrow(EngineError);
  expect(() => parse("1d1001")).toThrow(EngineError);
  expect(() => parse("1d0")).toThrow(EngineError);
  expect(() => parse("1d6 crit miss banana")).toThrow(/banana/);
  expect(() => parse("   ")).toThrow(EngineError);
  expect(() => parse("# only a note")).toThrow(EngineError);
  expect(new EngineError("x").name).toBe("EngineError");
});

test("over 100 dice is refused before rolling", () => {
  expect(() => parse("60d6 adv50")).toThrow(/100/);
  expect(() => parse("30d6 x4")).toThrow(/100/);
  expect(stageZeroSizes(parse("2d6 adv3 x2"))).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
});
