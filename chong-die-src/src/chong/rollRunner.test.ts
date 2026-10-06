import { beforeEach, expect, test } from "vitest";
import { parseCommand } from "../roll";
import { nextWave, rollPickedDice, startCommandRoll } from "./rollRunner";
import { ChongRollMeta } from "./rollMeta";
import { placeCommand } from "./place";
import { useChongStore } from "./chongStore";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";

beforeEach(() => {
  useChongStore.getState().setPlaced(null);
  useDiceControlsStore.getState().resetDiceCounts();
  useDiceRollStore.getState().clearRoll();
});

test("dividing by zero after landing ends the roll with an error", () => {
  const meta: ChongRollMeta = {
    command: "1d6/(1d2-1)",
    parts: {
      a: { key: "0.0.0", size: 6, part: 0 },
      b: { key: "0.1.0", size: 2, part: 0 },
    },
    virtual: {},
    capped: false,
  };
  expect(nextWave(parseCommand(meta.command), meta, { a: 3, b: 1 })).toEqual([]);
  expect(meta.error).toBe("Can't divide by zero");
});

test("a typed roll that can't work is refused before rolling", () =>
  expect(() => startCommandRoll("1/0", { hidden: false })).toThrow("Can't divide by zero"));

test("a typed roll clears placed dice", () => {
  placeCommand("2d6");
  startCommandRoll("1d20", { hidden: false });
  const { diceSet, diceCounts } = useDiceControlsStore.getState();
  const d6 = diceSet.dice.find((d) => d.type === "D6")!;
  expect(useChongStore.getState().placed).toBeNull();
  expect(diceCounts[d6.id]).toBe(0);
});

test("rethrowing one die of a command roll keeps it in the roll", () => {
  startCommandRoll("1d20+5", { hidden: false });
  const store = useDiceRollStore.getState();
  const [oldId] = Object.keys(store.roll!.chong!.parts);
  store.finishDieRoll(oldId, 7, { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } });
  useDiceRollStore.getState().reroll([oldId]);
  const parts = useDiceRollStore.getState().roll!.chong!.parts;
  expect(Object.keys(parts)).toHaveLength(1);
  expect(parts[oldId]).toBeUndefined();
  expect(Object.values(parts)[0].key).toBe("0.0.0");
});

test("the first die of each roll uses the primary style, and Nimble is recorded", () => {
  useChongStore.getState().setPrimaryStyle("SUNSET");
  useChongStore.getState().setNimble(true);
  startCommandRoll("!rr 2 2d6", { hidden: false });
  const roll = useDiceRollStore.getState().roll!;
  const styleByKey: Record<string, string> = {};
  for (const die of roll.dice as { id: string; style: string }[]) {
    styleByKey[roll.chong!.parts[die.id].key] = die.style;
  }
  expect(roll.chong!.nimble).toBe(true);
  expect(styleByKey["0.0.0"]).toBe("SUNSET");
  expect(styleByKey["1.0.0"]).toBe("SUNSET");
  expect(styleByKey["0.0.1"]).not.toBe("SUNSET");
  useChongStore.getState().setNimble(false);
  useChongStore.getState().setPrimaryStyle(null);
});

test("dice picked by hand roll as a command with a primary die", () => {
  const controls = useDiceControlsStore.getState();
  const d8 = controls.diceSet.dice.find((d) => d.type === "D8")!;
  controls.changeDieCount(d8.id, 2);
  rollPickedDice({ hidden: false });
  expect(useDiceRollStore.getState().roll!.chong!.command).toBe("2d8");
});

test("with Nimble off the first die keeps the normal style", () => {
  useChongStore.getState().setPrimaryStyle("SUNSET");
  useChongStore.getState().setNimble(false);
  startCommandRoll("2d6", { hidden: false });
  const roll = useDiceRollStore.getState().roll!;
  expect((roll.dice as { style: string }[]).map((d) => d.style)).not.toContain("SUNSET");
  useChongStore.getState().setPrimaryStyle(null);
});
