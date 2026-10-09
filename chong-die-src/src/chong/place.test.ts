import { beforeEach, describe, expect, test } from "vitest";
import { followLine, placeCounts, placeCommand, placePill, thrownFromLine } from "./place";
import { useTrayStore } from "./trayStore";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { startCommandRoll } from "./rollRunner";
import { useChongStore } from "./chongStore";
import { emptySaved } from "./savedRolls";
import { usePrefsStore } from "./prefsStore";

beforeEach(() => {
  useChongStore.getState().replaceSaved(emptySaved());
  useTrayStore.getState().setPlaced(null);
  useTrayStore.getState().setFromPill(null);
  useChongStore.getState().setDraft("");
  useDiceControlsStore.getState().resetDiceCounts();
  useDiceRollStore.getState().clearRoll();
  usePrefsStore.getState().setQuickRoll(false);
});

test("quick roll: a custom roll throws at once, nothing waits on the tray", () => {
  usePrefsStore.getState().setQuickRoll(true);
  expect(placeCommand("1d20+5", { hidden: false })).toBe("rolled");
  expect(useTrayStore.getState().placed).toBeNull();
  expect(useDiceRollStore.getState().roll?.chong?.record.text).toBe("1d20+5");
});

const countOf = (type: string) => {
  const { diceSet, diceCounts } = useDiceControlsStore.getState();
  const die = diceSet.dice.find((d) => d.type === type)!;
  return diceCounts[die.id];
};

test("first-throw counts per 3D die type (virtual dice need none)", () =>
  expect(placeCounts("2d20 + 1d100 + 1d7 + 1d3")).toEqual({ D20: 2, D100: 1, D6: 1 }));

test("adv doubles the d20", () => expect(placeCounts("1d20 adv + 5")).toEqual({ D20: 2 }));

test("placing counts advantage dice", () => expect(placeCounts("2d6 adv")).toEqual({ D6: 3 }));

test("chain dice aren't placed: they pop out after the throw", () =>
  expect(placeCounts("1d10 chain1-10")).toEqual({ D10: 1 }));

test("a command that can't roll throws before anything is placed", () => {
  expect(() => placeCommand("1d20 frob", { hidden: false })).toThrow(/frob/);
  expect(useTrayStore.getState().placed).toBeNull();
});

test("placing puts the dice on the tray and keeps the command; nothing rolls yet", () => {
  expect(placeCommand(" 2d6+1d20 ", { hidden: false })).toBe("placed");
  expect(countOf("D6")).toBe(2);
  expect(countOf("D20")).toBe(1);
  expect(useTrayStore.getState().placed).toBe("2d6+1d20");
  expect(useDiceRollStore.getState().roll).toBeNull();
});

test("placing clears a finished roll off the tray", () => {
  startCommandRoll("1d20", { hidden: false });
  placeCommand("2d6", { hidden: false });
  expect(useDiceRollStore.getState().roll).toBeNull();
});

test("a second command replaces the first", () => {
  placeCommand("2d6", { hidden: false });
  placeCommand("1d20", { hidden: false });
  expect(countOf("D6")).toBe(0);
  expect(countOf("D20")).toBe(1);
  expect(useTrayStore.getState().placed).toBe("1d20");
});

test("changing or clearing the dice by hand drops the placed command", () => {
  placeCommand("2d6", { hidden: false });
  const d6 = useDiceControlsStore.getState().diceSet.dice.find((d) => d.type === "D6")!;
  useDiceControlsStore.getState().incrementDieCount(d6.id);
  expect(useTrayStore.getState().placed).toBeNull();
  placeCommand("2d6", { hidden: false });
  useDiceControlsStore.getState().resetDiceCounts();
  expect(useTrayStore.getState().placed).toBeNull();
});

test("throwing a placed command rolls it as itself and clears the tray", () => {
  placeCommand("2d6+3", { hidden: false });
  startCommandRoll(useTrayStore.getState().placed!, { hidden: false, speedMultiplier: 3 });
  expect(useDiceRollStore.getState().roll?.chong?.record.text).toBe("2d6+3");
  expect(useTrayStore.getState().placed).toBeNull();
  expect(countOf("D6")).toBe(0);
});

test("a command with only virtual dice rolls right away", () => {
  expect(placeCommand("1d7", { hidden: false })).toBe("rolled");
  expect(useTrayStore.getState().placed).toBeNull();
  expect(useDiceRollStore.getState().roll?.chong?.record.text).toBe("1d7");
});

describe("a pill goes into the command line, and the tray follows the line", () => {
  test("clicking a pill places its dice and puts its roll in the line", () => {
    expect(placePill("1d20+5", { hidden: false })).toBe("placed");
    expect(useTrayStore.getState().placed).toBe("1d20+5");
    expect(useChongStore.getState().draft).toBe("1d20+5");
    expect(countOf("D20")).toBe(1);
  });

  test("typing adv after it adds the die on the tray; half-typed text keeps the last good roll", () => {
    placePill("1d20+5", { hidden: false });
    followLine("1d20+5 a", { hidden: false });
    expect(useTrayStore.getState().placed).toBe("1d20+5");
    followLine("1d20+5 adv", { hidden: false });
    expect(useTrayStore.getState().placed).toBe("1d20+5 adv");
    expect(countOf("D20")).toBe(2);
    expect(useTrayStore.getState().error).toBeNull();
  });

  test("the line only steers dice it placed: nothing placed, an empty line or Quick roll leave the tray alone", () => {
    followLine("1d20", { hidden: false });
    expect(useTrayStore.getState().placed).toBeNull();
    placePill("1d20+5", { hidden: false });
    followLine("  ", { hidden: false });
    expect(useTrayStore.getState().placed).toBe("1d20+5");
    usePrefsStore.getState().setQuickRoll(true);
    followLine("1d6", { hidden: false });
    expect(useTrayStore.getState().placed).toBe("1d20+5");
    expect(useDiceRollStore.getState().roll).toBeNull();
  });

  test("Quick roll: a pill still throws at once and leaves the line alone", () => {
    usePrefsStore.getState().setQuickRoll(true);
    expect(placePill("1d20+5", { hidden: false })).toBe("rolled");
    expect(useChongStore.getState().draft).toBe("");
  });

  test("after the throw the line clears; an edited pill goes into history, an unchanged one doesn't", () => {
    placePill("1d20+5", { hidden: false });
    thrownFromLine("1d20+5");
    expect(useChongStore.getState().draft).toBe("");
    expect(useChongStore.getState().saved.history).toEqual([]);
    placePill("1d20+5", { hidden: false });
    followLine("1d20+5 dis", { hidden: false });
    thrownFromLine("1d20+5 dis");
    expect(useChongStore.getState().saved.history).toEqual(["1d20+5 dis"]);
    expect(useTrayStore.getState().fromPill).toBeNull();
  });

  test("a line that no longer matches the thrown roll is kept", () => {
    placePill("1d20+5", { hidden: false });
    useChongStore.getState().setDraft("1d20+5 ad");
    thrownFromLine("1d20+5");
    expect(useChongStore.getState().draft).toBe("1d20+5 ad");
  });
});

test("an edited pill thrown with Roll goes into history (read before the throw clears the tray)", () => {
  placePill("1d20+5", { hidden: false });
  useChongStore.getState().setDraft("1d20+5 adv"); // what the command line does as you type
  followLine("1d20+5 adv", { hidden: false });
  const { placed, fromPill } = useTrayStore.getState();
  startCommandRoll(placed!, { hidden: false });
  thrownFromLine(placed!, fromPill);
  expect(useChongStore.getState().saved.history).toEqual(["1d20+5 adv"]);
  expect(useChongStore.getState().draft).toBe("");
});
