import { beforeEach, expect, test } from "vitest";
import { revealNext, rollPickedDice, startCommandRoll } from "./rollRunner";
import { getRollDisplay } from "./rollMeta";
import { useChongStore } from "./chongStore";
import { useTrayStore } from "./trayStore";
import { emptySaved } from "./savedRolls";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { getDieFromDice } from "../helpers/getDieFromDice";

const LANDED = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };

const trayIds = () => getDieFromDice(useDiceRollStore.getState().roll!).map((d) => d.id);
const settleAll = () => {
  for (const id of trayIds()) {
    if (useDiceRollStore.getState().rollValues[id] === null) {
      useDiceRollStore.getState().finishDieRoll(id, 1, LANDED);
    }
  }
};

beforeEach(() => {
  useChongStore.getState().replaceSaved(emptySaved());
  useDiceControlsStore.getState().resetDiceCounts();
  useDiceRollStore.getState().clearRoll();
});

test("a command roll puts stage 0 on the tray and records the faces", () => {
  startCommandRoll("2d6 adv", { hidden: false });
  const { roll } = useDiceRollStore.getState();
  expect(roll!.chong!.v).toBe(4);
  expect(Object.keys(roll!.chong!.parts)).toHaveLength(3);
  expect(Object.keys(roll!.chong!.faces)).toHaveLength(3);
  expect(trayIds()).toHaveLength(3);
  expect(roll!.chong!.stage).toBe(0);
});

test("chain dice wait for their parent to settle", () => {
  // crit1-6: the Primary Die always adds a chain die
  startCommandRoll("1d6 crit1-6", { hidden: false });
  expect(trayIds()).toHaveLength(1);
  revealNext();
  expect(trayIds()).toHaveLength(1);
  useDiceRollStore.getState().finishDieRoll(trayIds()[0], 2, LANDED);
  revealNext();
  expect(trayIds()).toHaveLength(2);
  expect(useDiceRollStore.getState().roll!.chong!.stage).toBe(1);
  // The chain die pops out of its parent
  const [, child] = trayIds();
  expect(useDiceRollStore.getState().rollThrows[child].position.y).toBeCloseTo(0.6);
});

test("the result shows once every stage has settled, from the record", () => {
  startCommandRoll("1d6 crit1-6 + 2", { hidden: false });
  for (let i = 0; i < 30 && !getRollDisplay(useDiceRollStore.getState().roll!, useDiceRollStore.getState().rollValues); i++) {
    settleAll();
    revealNext();
  }
  const { roll, rollValues } = useDiceRollStore.getState();
  const display = getRollDisplay(roll!, rollValues)!;
  expect(display.total).toBe(String(roll!.chong!.record.reps[0].total));
  expect(display.lines[0]).toMatch(/^1d6 \(\**\d\**\) \+ chain/);
});

test("a roll of dice with no 3D model finishes at once", () => {
  startCommandRoll("1d7 + 1", { hidden: false });
  const { roll, rollValues } = useDiceRollStore.getState();
  expect(trayIds()).toHaveLength(0);
  expect(getRollDisplay(roll!, rollValues)).not.toBeNull();
});

test("a typed roll that can't work is refused before rolling", () => {
  expect(() => startCommandRoll("1d20 frob", { hidden: false })).toThrow(/frob/);
  expect(useDiceRollStore.getState().roll).toBeNull();
});

test("a typed roll clears dice picked by hand", () => {
  const { diceSet, changeDieCount } = useDiceControlsStore.getState();
  const d6 = diceSet.dice.find((d) => d.type === "D6")!;
  changeDieCount(d6.id, 2);
  startCommandRoll("1d20", { hidden: false });
  expect(useDiceControlsStore.getState().diceCounts[d6.id]).toBe(0);
});

test("rethrowing one die of a command roll keeps it in the roll, with its face", () => {
  startCommandRoll("1d20+5", { hidden: false });
  const store = useDiceRollStore.getState();
  const [oldId] = Object.keys(store.roll!.chong!.parts);
  const face = store.roll!.chong!.faces[oldId];
  store.finishDieRoll(oldId, 7, LANDED);
  useDiceRollStore.getState().reroll([oldId]);
  const { parts, faces } = useDiceRollStore.getState().roll!.chong!;
  expect(Object.keys(parts)).toHaveLength(1);
  expect(parts[oldId]).toBeUndefined();
  expect(Object.values(parts)[0]).toEqual({ rep: 0, die: 0, part: 0 });
  expect(Object.values(faces)).toEqual([face]);
});

test("dice picked by hand roll as a command", () => {
  const controls = useDiceControlsStore.getState();
  const d8 = controls.diceSet.dice.find((d) => d.type === "D8")!;
  controls.changeDieCount(d8.id, 2);
  rollPickedDice({ hidden: false });
  expect(useDiceRollStore.getState().roll!.chong!.record.text).toBe("2d8");
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
