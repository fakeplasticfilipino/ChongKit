import { expect, test } from "vitest";
import { parse, roll, seq, RollRecord } from "../engine";
import { DiceRoll } from "../types/DiceRoll";
import { buildMeta, getRollDisplay, highlightedDice, highlightTone, lastStage, popThrow, stageIds } from "./rollMeta";

/** A command roll with these dice values, every stage shown */
function rolled(text: string, values: number[], stage?: number): DiceRoll {
  const record: RollRecord = roll(parse(text), seq(values));
  const meta = buildMeta(record, () => 1);
  meta.stage = stage ?? lastStage(record);
  return { dice: [], combination: "NONE", chong: meta };
}

const settled = (r: DiceRoll) => Object.fromEntries(Object.keys(r.chong!.parts).map((id) => [id, 1]));

test("an old-format roll shows as text", () => {
  expect(getRollDisplay({ dice: [], chong: { command: "!r 1d6" } } as any)).toEqual({
    total: "Old roll",
    lines: ["!r 1d6"],
  });
  expect(getRollDisplay({ dice: [], chong: { foo: 1 } } as any)).toEqual({ total: "Old roll", lines: [] });
});

test("a roll with no chong shows nothing", () =>
  expect(getRollDisplay({ dice: [], combination: "NONE" })).toBeNull());

test("every 3D part gets an id and the face it must land on", () => {
  const r = rolled("1d100 + 1d10 + 1d7", [47, 10, 5]);
  const parts = Object.values(r.chong!.parts);
  expect(parts).toEqual([
    { rep: 0, die: 0, part: 0 },
    { rep: 0, die: 0, part: 1 },
    { rep: 0, die: 1, part: 0 },
  ]);
  expect(Object.values(r.chong!.faces)).toEqual([40, 7, 0]);
});

test("adv result text and total", () => {
  const r = rolled("1d20 adv + 5", [4, 17]);
  expect(getRollDisplay(r, settled(r))).toEqual({ total: "22", lines: ["2d20kh1 (~~4~~, 17) + 5 = 22"] });
});

test("nothing shows while a die is still rolling", () => {
  const r = rolled("1d20 adv + 5", [4, 17]);
  const [a] = Object.keys(r.chong!.parts);
  expect(getRollDisplay(r, { ...settled(r), [a]: null })).toBeNull();
});

test("nothing shows before the last stage is on the tray", () => {
  // Primary 6 crits: one chain die (3) in stage 1
  const r = rolled("1d6 crit", [6, 3], 0);
  expect(getRollDisplay(r, settled(r))).toBeNull();
  r.chong!.stage = 1;
  expect(getRollDisplay(r, settled(r))!.total).toBe("9");
});

test("a roll of only dice with no 3D model shows at once", () => {
  const r = rolled("1d7", [5]);
  expect(Object.keys(r.chong!.parts)).toHaveLength(0);
  expect(getRollDisplay(r, {})!.total).toBe("5");
});

test("stages list the 3D ids of each stage", () => {
  const r = rolled("1d6 crit + 1d8", [6, 2, 3]);
  const ids = Object.keys(r.chong!.parts);
  expect(stageIds(r.chong!, 0)).toEqual([ids[0], ids[1]]);
  expect(stageIds(r.chong!, 1)).toEqual([ids[2]]);
  expect(lastStage(r.chong!.record)).toBe(1);
});

test("the primary is highlighted only when the group has crit or miss", () => {
  expect(highlightedDice(rolled("1d6", [6]))).toEqual([]);
  expect(highlightedDice(rolled("1d6 crit", [5]))).toEqual([]);
  const crit = rolled("1d6 crit", [6, 3]);
  expect(highlightedDice(crit)).toEqual([Object.keys(crit.chong!.parts)[0]]);
  const miss = rolled("2d6 miss 1 + 1d8 crit", [1, 4, 5]);
  expect(highlightedDice(miss)).toEqual([Object.keys(miss.chong!.parts)[0]]);
});

test("a d100's highlight goes on its first part; each repeat has its own", () => {
  const r = rolled("1d100 crit x2", [100, 5, 100, 7]);
  const ids = Object.keys(r.chong!.parts);
  const first = (rep: number) => ids.find((id) => r.chong!.parts[id].rep === rep && r.chong!.parts[id].die === 0 && r.chong!.parts[id].part === 0);
  expect(highlightedDice(r)).toEqual([first(0), first(1)]);
});

test("old rolls have no highlights", () =>
  expect(highlightedDice({ dice: [], chong: { command: "1d6", nimble: true } } as any)).toEqual([]));

test("the outline tone comes from the record", () => {
  const crit = rolled("1d6 crit", [6, 3]);
  expect(highlightTone(crit, Object.keys(crit.chong!.parts)[0])).toBe("crit");
  const miss = rolled("1d6 crit miss 1", [1]);
  expect(highlightTone(miss, Object.keys(miss.chong!.parts)[0])).toBe("miss");
  // A chain die crit, not the primary: the primary's outline stays plain
  const chain = rolled("1d6 crit chain 5+", [5, 6, 2]);
  expect(highlightTone(chain, Object.keys(chain.chong!.parts)[0])).toBe("plain");
  expect(highlightTone(chain, "nope")).toBe("plain");
});

test("pop-out throw starts clear above the parent and flies up and sideways", () => {
  const t = popThrow(
    { position: { x: 0.1, y: 0.2, z: -0.3 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
    () => 0.5
  );
  expect(t.position).toEqual({ x: 0.1, y: 0.8, z: -0.3 });
  // Sideways so it doesn't land back on the (locked) parent
  expect(t.linearVelocity.x).toBeCloseTo(-0.8);
  expect(t.linearVelocity.z).toBeCloseTo(0);
  // Shoots up high and spins hard, like a jackpot
  expect(t.linearVelocity.y).toBeCloseTo(3.5);
  expect(t.angularVelocity).toEqual({ x: 9, y: 9, z: 9 });
});
