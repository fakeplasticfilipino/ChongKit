import { expect, test } from "vitest";
import { EngineError, parse, stageZeroSizes } from "./index";

test("Nimble's attack: bare crit is the die's max, bare miss is 1", () => {
  const p = parse("1d10+3 crit miss");
  expect(p.groups).toEqual([{ sign: 1, count: 1, size: 10 }]);
  expect(p).toMatchObject({
    text: "1d10+3 crit miss", modifier: 3, times: 1, adv: 0, dis: 0, critAdv: 0,
    crit: { min: 10, max: 10 }, miss: { min: 1, max: 1 },
  });
});
test("words after the modifier; signs glued or spaced", () => {
  const a = parse("1d10 + 3 crit miss adv3");
  const b = parse("1d10+3 crit miss adv3");
  expect(a.groups).toEqual(b.groups);
  expect([a.modifier, a.adv, b.modifier, b.adv]).toEqual([3, 3, 3, 3]);
});
test("numbers and ranges glued to words", () => {
  expect(parse("1d10 crit5-10 miss1-4 critadv2 dis2 x3")).toMatchObject({
    crit: { min: 5, max: 10 }, miss: { min: 1, max: 4 }, critAdv: 2, dis: 2, times: 3,
  });
  expect(parse("1d10 crit critadv").critAdv).toBe(1);
  expect(parse("1d20 adv").adv).toBe(1);
});
test("a range's - belongs to it; a spaced - subtracts", () => {
  expect(parse("1d10 crit5 -2")).toMatchObject({ crit: { min: 5, max: 5 }, modifier: -2 });
  expect(parse("1d10 miss1-4+2")).toMatchObject({ miss: { min: 1, max: 4 }, modifier: 2 });
});
test("words act on the first dice; other dice and numbers add", () => {
  const p = parse("1d10 + 1d6 - 1d4 + 3 crit adv");
  expect(p.groups).toEqual([
    { sign: 1, count: 1, size: 10 }, { sign: 1, count: 1, size: 6 }, { sign: -1, count: 1, size: 4 },
  ]);
  expect(p.crit).toEqual({ min: 10, max: 10 });
  expect(stageZeroSizes(p)).toEqual([10, 10, 6, 4]);
});
test("d20, d% and any case", () => {
  expect(parse("d20").groups[0]).toEqual({ sign: 1, count: 1, size: 20 });
  expect(parse("2d%").groups[0].size).toBe(100);
  expect(parse("1D10 CRIT MISS").crit).toEqual({ min: 10, max: 10 });
});
test("x repeats the whole roll", () => {
  expect(stageZeroSizes(parse("1d10 adv x2"))).toEqual([10, 10, 10, 10]);
});
test.each([
  ["", /Empty command/],
  ["crit 1d10", /"crit" comes before any dice/],
  ["1d10 crit crit5", /crit appears twice/],
  ["1d10 adv adv2", /adv appears twice/],
  ["1d10 x2 x3", /x appears twice/],
  ["1d10 crit11", /"crit11" is outside the d10's 1 to 10/],
  ["1d10 miss0", /outside/],
  ["1d10 miss3-1", /low to high/],
  ["1d10 crit5-2", /low to high/],
  ["1d10 crit5-10 miss1-5", /crit and miss overlap/],
  ["1d1 crit miss", /crit and miss overlap/],
  ["1d10 critadv", /critadv needs crit/],
  ["1d10 x", /x needs a number/],
  ["1d10 x0", /x1 to x25/],
  ["1d10 x26", /x1 to x25/],
  ["1d10 adv0", /"adv0" must be 1 to 100/],
  ["1d10 keep 1", /Unknown word "keep"/],
  ["1d10 explode", /Unknown word "explode"/],
  ["1d10 chain", /Unknown word "chain"/],
  ["1d10 # sword", /Unknown word "#"/],
  ["1d10 crit 10", /Put a \+ or - before "10"/],
  ["1d10 +", /A trailing "\+" needs dice or a number after it/],
  ["1d10 crit5-", /A trailing "-"/],
  ["1d10 + + 2", /"\+" needs dice or a number after it/],
  ["1d10 + crit", /"\+" needs dice or a number after it/],
  ["3", /No dice/],
  ["0d6", /needs at least 1 die/],
  ["1d0", /1 to 1000 sides/],
  ["101d6", /More than 100 dice/],
  ["50d6 adv x3", /More than 100 dice/],
])("%s → error", (cmd, message) => {
  expect(() => parse(cmd)).toThrow(EngineError);
  expect(() => parse(cmd)).toThrow(message);
});
