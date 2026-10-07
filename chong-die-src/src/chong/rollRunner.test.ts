import { beforeEach, expect, test } from "vitest";
import { parseCommand } from "../roll";
import { explodeDie, nextWave, rollPickedDice, startCommandRoll } from "./rollRunner";
import { ChongRollMeta } from "./rollMeta";
import { placeCommand } from "./place";
import { useChongStore } from "./chongStore";
import { useTrayStore } from "./trayStore";
import { usePrefsStore } from "./prefsStore";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";

const LANDED = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };

beforeEach(() => {
  useTrayStore.getState().setPlaced(null);
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
  expect(useTrayStore.getState().placed).toBeNull();
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

test("dice picked by hand roll as a command", () => {
  const controls = useDiceControlsStore.getState();
  const d8 = controls.diceSet.dice.find((d) => d.type === "D8")!;
  controls.changeDieCount(d8.id, 2);
  rollPickedDice({ hidden: false });
  expect(useDiceRollStore.getState().roll!.chong!.command).toBe("2d8");
});

test("rolling on the tray leaves the saved rolls alone (only the Rolls window writes them)", () => {
  const before = useChongStore.getState().saved;
  startCommandRoll("1d20+3", { hidden: false });
  expect(useChongStore.getState().saved).toBe(before);
});

test("the next roll clears the tray's error banner", () => {
  useTrayStore.getState().setError("Unknown die d0");
  startCommandRoll("1d20", { hidden: false });
  expect(useTrayStore.getState().error).toBeNull();
});


test("a roll records whether Nimble was on", () => {
  usePrefsStore.getState().setNimble(true);
  startCommandRoll("1d6", { hidden: false });
  expect(useDiceRollStore.getState().roll!.chong!.nimble).toBe(true);
  usePrefsStore.getState().setNimble(false);
  startCommandRoll("1d6", { hidden: false });
  expect(useDiceRollStore.getState().roll!.chong!.nimble).toBe(false);
});

test("without Nimble a die can't be exploded", () => {
  usePrefsStore.getState().setNimble(false);
  startCommandRoll("1d6", { hidden: false });
  const [id] = Object.keys(useDiceRollStore.getState().roll!.chong!.parts);
  useDiceRollStore.getState().finishDieRoll(id, 2, LANDED);
  expect(explodeDie(id)).toBe(false);
});

test("exploding a landed die records it and throws a new die out of it", () => {
  usePrefsStore.getState().setNimble(true);
  startCommandRoll("1d6+2d6", { hidden: false });
  const store = useDiceRollStore.getState();
  const parts = store.roll!.chong!.parts;
  for (const id of Object.keys(parts)) {
    useDiceRollStore.getState().finishDieRoll(id, 3, LANDED);
  }
  const id = Object.keys(parts).find((i) => parts[i].key === "0.1.0")!;
  expect(explodeDie(id)).toBe(true);
  const roll = useDiceRollStore.getState().roll!;
  expect(roll.chong!.manual).toEqual(["0.1.0"]);
  expect(Object.values(roll.chong!.parts).map((p) => p.key)).toContain("0.1.0m");
});

test("a die still rolling can't be exploded", () => {
  usePrefsStore.getState().setNimble(true);
  startCommandRoll("1d6", { hidden: false });
  const [id] = Object.keys(useDiceRollStore.getState().roll!.chong!.parts);
  expect(explodeDie(id)).toBe(false);
  expect(useDiceRollStore.getState().roll!.chong!.manual).toBeUndefined();
});

test("exploding the same die twice does nothing the second time", () => {
  usePrefsStore.getState().setNimble(true);
  startCommandRoll("1d6", { hidden: false });
  const [id] = Object.keys(useDiceRollStore.getState().roll!.chong!.parts);
  useDiceRollStore.getState().finishDieRoll(id, 2, LANDED);
  expect(explodeDie(id)).toBe(true);
  expect(explodeDie(id)).toBe(false);
  expect(useDiceRollStore.getState().roll!.chong!.manual).toEqual(["0.0.0"]);
});
