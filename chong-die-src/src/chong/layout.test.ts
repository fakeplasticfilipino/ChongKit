import { expect, test } from "vitest";
import { PANEL_WIDTH, windowWidth } from "./layout";

test("closed: just the tray, half as wide as it is tall", () => expect(windowWidth(700, false)).toBe(350));

test("open: the panel (dice sidebar + pills) docks to the right", () => {
  expect(PANEL_WIDTH).toBe(280);
  expect(windowWidth(700, true)).toBe(630);
});
