import { beforeEach, expect, test } from "vitest";
import { createRunDeduper, handleIncomingRoll } from "./incoming";
import { useTrayStore } from "./trayStore";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";

beforeEach(() => {
  useTrayStore.getState().setError(null);
  useDiceControlsStore.getState().resetDiceCounts();
  useDiceRollStore.getState().clearRoll();
});

test("a roll from Chong's Tracker rolls now", () => {
  expect(handleIncomingRoll("!rr 2 1d6!+1d6+3")).toBe("rolled");
  expect(useDiceRollStore.getState().roll?.chong?.command).toBe("!rr 2 1d6!+1d6+3");
});

test("a command that can't roll shows its error on the tray", () => {
  expect(handleIncomingRoll("1d0")).toBe("error");
  expect(useTrayStore.getState().error).toBe("Unknown die d0");
});

test("a re-sent message rolls once", () => {
  const isNew = createRunDeduper();
  expect(isNew("a")).toBe(true);
  expect(isNew("a")).toBe(false);
  expect(isNew("b")).toBe(true);
});
