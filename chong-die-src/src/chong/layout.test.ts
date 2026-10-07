import { expect, test } from "vitest";
import { PANEL_WIDTH, windowWidth } from "./layout";

test("closed: sidebar plus a tray half as wide as it is tall (stock)", () =>
  expect(windowWidth(700, false)).toBe(410));

test("open: the panel docks to the right", () => {
  expect(PANEL_WIDTH).toBe(300);
  expect(windowWidth(700, true)).toBe(710);
});
