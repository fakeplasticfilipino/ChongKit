import { beforeEach, expect, test } from "vitest";
import { createRunDeduper, handleIncomingRoll } from "./incoming";
import { useTrayStore } from "./trayStore";
import { SavedRolls } from "./savedRolls";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";

const saved = (instant: boolean): SavedRolls => ({
  version: 1,
  tabs: [
    { id: "a", name: "A", instant: !instant, pills: [] },
    { id: "b", name: "B", instant, pills: [] },
  ],
  history: [],
  activeTabId: "b",
});

beforeEach(() => {
  useTrayStore.getState().setPlaced(null);
  useTrayStore.getState().setError(null);
  useDiceControlsStore.getState().resetDiceCounts();
  useDiceRollStore.getState().clearRoll();
});

test("place: false rolls the command now", () => {
  expect(handleIncomingRoll("!rr 2 1d6!+1d6+3", false, saved(false))).toBe("rolled");
  expect(useDiceRollStore.getState().roll?.chong?.command).toBe("!rr 2 1d6!+1d6+3");
});

test("place: true puts the dice on the tray, even when the open tab is Instant", () => {
  expect(handleIncomingRoll("2d6", true, saved(true))).toBe("placed");
  expect(useTrayStore.getState().placed).toBe("2d6");
});

test("no place (Chong's Tracker) follows the saved active tab: Instant rolls", () =>
  expect(handleIncomingRoll("1d20", undefined, saved(true))).toBe("rolled"));

test("no place (Chong's Tracker) follows the saved active tab: not Instant places", () =>
  expect(handleIncomingRoll("1d20", undefined, saved(false))).toBe("placed"));

test("placing a command with only virtual dice rolls it", () =>
  expect(handleIncomingRoll("1d7", true, saved(false))).toBe("rolled"));

test("a command that can't roll shows its error on the tray", () => {
  expect(handleIncomingRoll("1d0", false, saved(true))).toBe("error");
  expect(useTrayStore.getState().error).toBe("Unknown die d0");
});

test("a re-sent message rolls once", () => {
  const isNew = createRunDeduper();
  expect(isNew("a")).toBe(true);
  expect(isNew("a")).toBe(false);
  expect(isNew("b")).toBe(true);
});
