import { expect, test } from "vitest";
import { DiceRoll } from "../types/DiceRoll";
import { ChongRollMeta, getRollDisplay, logicalValues, popThrow } from "./rollMeta";

const advMeta: ChongRollMeta = {
  command: "!r 1d20+5 adv",
  parts: {
    a: { key: "0.0.0", size: 20, part: 0 },
    b: { key: "0.0.1", size: 20, part: 0 },
  },
  virtual: {},
  capped: false,
};

const advRoll: DiceRoll = {
  dice: [
    { id: "a", style: "NEBULA", type: "D20" },
    { id: "b", style: "NEBULA", type: "D20" },
  ],
  combination: "NONE",
  chong: advMeta,
};

test("d100 pair becomes one logical value", () => {
  const meta: ChongRollMeta = {
    command: "1d100",
    parts: {
      a: { key: "0.0.0", size: 100, part: 0 },
      b: { key: "0.0.0", size: 100, part: 1 },
    },
    virtual: {},
    capped: false,
  };
  expect(logicalValues(meta, { a: 40, b: 7 })).toEqual({ "0.0.0": 47 });
});

test("a logical die with an unfinished part is left out", () => {
  const meta: ChongRollMeta = {
    command: "1d100+1d6",
    parts: {
      a: { key: "0.0.0", size: 100, part: 0 },
      b: { key: "0.0.0", size: 100, part: 1 },
      c: { key: "0.1.0", size: 6, part: 0 },
    },
    virtual: {},
    capped: false,
  };
  expect(logicalValues(meta, { a: 40, b: null, c: 3 })).toEqual({ "0.1.0": 3 });
});

test("hidden roll (no values) shows nothing", () =>
  expect(getRollDisplay(advRoll, undefined)).toBeNull());

test("unfinished roll shows nothing", () =>
  expect(getRollDisplay(advRoll, { a: 4, b: null })).toBeNull());

test("finished adv roll", () =>
  expect(getRollDisplay(advRoll, { a: 4, b: 17 })).toEqual({
    total: "22",
    lines: ["2d20kh1 (~~4~~, 17) + 5 = 22"],
  }));

test("virtual dice count toward the result", () => {
  const roll: DiceRoll = {
    dice: [],
    combination: "NONE",
    chong: { command: "1d7", parts: {}, virtual: { "0.0.0": 5 }, capped: false },
  };
  expect(getRollDisplay(roll, {})!.total).toBe("5");
});

test("a roll still waiting for a wave shows nothing", () => {
  const roll: DiceRoll = {
    dice: [{ id: "a", style: "NEBULA", type: "D6" }],
    combination: "NONE",
    chong: {
      command: "1d6rr1",
      parts: { a: { key: "0.0.0", size: 6, part: 0 } },
      virtual: {},
      capped: false,
    },
  };
  expect(getRollDisplay(roll, { a: 1 })).toBeNull();
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
  expect(t.linearVelocity.y).toBe(2);
  expect(t.angularVelocity).toEqual({ x: 4, y: 4, z: 4 });
});

test("a roll that failed after landing shows the error", () => {
  const roll: DiceRoll = {
    dice: [],
    combination: "NONE",
    chong: { command: "1d6/0", parts: {}, virtual: {}, capped: false, error: "Can't divide by zero" },
  };
  expect(getRollDisplay(roll, {})).toEqual({ total: "Error", lines: ["Can't divide by zero"] });
});

