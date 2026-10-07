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

test("a roll from Chong's Tracker waits on the tray to be thrown", () => {
  expect(handleIncomingRoll("1d6 explode + 1d6 + 3 x2")).toBe("placed");
  expect(useTrayStore.getState().placed).toBe("1d6 explode + 1d6 + 3 x2");
  expect(useDiceRollStore.getState().roll).toBeNull();
});

test("a command that can't roll shows its error on the tray", () => {
  expect(handleIncomingRoll("1d0")).toBe("error");
  expect(useTrayStore.getState().error).toBe('"1d0" must have 1 to 1000 sides');
});

test("a re-sent message rolls once", () => {
  const isNew = createRunDeduper();
  expect(isNew("a")).toBe(true);
  expect(isNew("a")).toBe(false);
  expect(isNew("b")).toBe(true);
});
