import { beforeEach, expect, test } from "vitest";
import { placeCounts, placeCommand } from "./place";
import { useTrayStore } from "./trayStore";
import { useDiceControlsStore } from "../controls/store";

beforeEach(() => {
  useTrayStore.getState().setPlaced(null);
  useDiceControlsStore.getState().resetDiceCounts();
});

const countOf = (type: string) => {
  const { diceSet, diceCounts } = useDiceControlsStore.getState();
  const die = diceSet.dice.find((d) => d.type === type)!;
  return diceCounts[die.id];
};

test("wave-1 counts per 3D die type", () =>
  expect(placeCounts("!r 2d20kh1+1d100+1d7+1d3")).toEqual({
    D20: 2,
    D100: 1,
    D6: 1,
  }));

test("adv doubles the d20", () =>
  expect(placeCounts("1d20+5 adv")).toEqual({ D20: 2 }));

test("only virtual dice gives nothing to place", () =>
  expect(placeCounts("1d7")).toEqual({}));

test("placing sets the tray counts and keeps the command", () => {
  expect(placeCommand("2d6+1d20")).toBe(true);
  expect(countOf("D6")).toBe(2);
  expect(countOf("D20")).toBe(1);
  expect(useTrayStore.getState().placed).toBe("2d6+1d20");
});

test("changing dice by hand drops the placed command", () => {
  placeCommand("2d6");
  const d6 = useDiceControlsStore
    .getState()
    .diceSet.dice.find((d) => d.type === "D6")!;
  useDiceControlsStore.getState().incrementDieCount(d6.id);
  expect(useTrayStore.getState().placed).toBeNull();
});

test("bonus or advantage by hand drops the placed command", () => {
  placeCommand("2d6");
  useDiceControlsStore.getState().setDiceBonus(2);
  expect(useTrayStore.getState().placed).toBeNull();
});

test("a command with only virtual dice is not placed", () => {
  expect(placeCommand("1d7")).toBe(false);
  expect(useTrayStore.getState().placed).toBeNull();
});
