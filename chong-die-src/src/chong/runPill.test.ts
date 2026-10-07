import { beforeEach, expect, test } from "vitest";
import { runPill } from "./runPill";
import { useTrayStore } from "./trayStore";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";

beforeEach(() => {
  useTrayStore.getState().setPlaced(null);
  useDiceControlsStore.getState().resetDiceCounts();
  useDiceRollStore.getState().clearRoll();
});

test("an Instant pill rolls on the tray now", () => {
  expect(runPill("1d20+5", true, false)).toBe("rolled");
  expect(useDiceRollStore.getState().roll?.chong?.command).toBe("1d20+5");
});

test("otherwise the pill places its dice on the tray to throw", () => {
  expect(runPill("2d6", false, false)).toBe("placed");
  expect(useTrayStore.getState().placed).toBe("2d6");
  expect(useDiceRollStore.getState().roll).toBeNull();
});

test("a pill with only virtual dice rolls even when not Instant", () =>
  expect(runPill("1d7", false, false)).toBe("rolled"));
