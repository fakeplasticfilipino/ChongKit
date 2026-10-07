import { beforeEach, expect, test } from "vitest";
import { createRunDeduper, handleIncomingRoll } from "./incoming";
import { useChongStore } from "./chongStore";
import { useTrayStore } from "./trayStore";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";

function setInstant(on: boolean) {
  const { activeTabId, setInstant } = useChongStore.getState();
  setInstant(activeTabId, on);
}

beforeEach(() => {
  useTrayStore.getState().setPlaced(null);
  useTrayStore.getState().setError(null);
  useDiceControlsStore.getState().resetDiceCounts();
  useDiceRollStore.getState().clearRoll();
});

test("instant tab rolls the command now", () => {
  setInstant(true);
  expect(handleIncomingRoll("!rr 2 1d6!+1d6+3")).toBe("rolled");
  expect(useDiceRollStore.getState().roll?.chong?.command).toBe("!rr 2 1d6!+1d6+3");
});

test("place tab puts the dice on the tray", () => {
  setInstant(false);
  expect(handleIncomingRoll("2d6")).toBe("placed");
  expect(useTrayStore.getState().placed).toBe("2d6");
});

test("place tab rolls a command with only virtual dice", () => {
  setInstant(false);
  expect(handleIncomingRoll("1d7")).toBe("rolled");
});

test("a command that can't roll shows its error", () => {
  setInstant(true);
  expect(handleIncomingRoll("1d0")).toBe("error");
  expect(useTrayStore.getState().error).toBe("Unknown die d0");
});

test("a re-sent message rolls once", () => {
  const isNew = createRunDeduper();
  expect(isNew("a")).toBe(true);
  expect(isNew("a")).toBe(false);
  expect(isNew("b")).toBe(true);
});
