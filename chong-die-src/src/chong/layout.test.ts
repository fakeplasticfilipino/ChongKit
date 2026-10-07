import { expect, test } from "vitest";
import { glideEase, PANEL_WIDTH, windowWidth } from "./layout";

test("closed: just the tray, half as wide as it is tall", () => expect(windowWidth(700, false)).toBe(350));

test("open: the panel (dice sidebar + pills) docks to the right", () => {
  expect(PANEL_WIDTH).toBe(360);
  expect(windowWidth(700, true)).toBe(710);
});

test("the panel's glide starts and ends exactly, easing out between", () => {
  expect(glideEase(0)).toBe(0);
  expect(glideEase(1)).toBe(1);
  expect(glideEase(1.4)).toBe(1);
  expect(glideEase(0.5)).toBeGreaterThan(0.5);
});
