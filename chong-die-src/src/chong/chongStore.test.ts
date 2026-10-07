import { beforeEach, expect, test } from "vitest";
import { useChongStore } from "./chongStore";
import { emptySaved } from "./savedRolls";

const ids = () => useChongStore.getState().saved.tabs.map((t) => t.id);

beforeEach(() => {
  useChongStore.getState().replaceSaved(emptySaved());
  useChongStore.getState().addTab();
  useChongStore.getState().addTab();
});

test("the Rolls tab (first) can't be deleted", () => {
  const [rolls] = ids();
  useChongStore.getState().deleteTab(rolls);
  expect(ids()[0]).toBe(rolls);
  expect(ids()).toHaveLength(3);
});

test("the Rolls tab can't be moved", () => {
  const [rolls] = ids();
  useChongStore.getState().moveTab(rolls, 2);
  expect(ids()[0]).toBe(rolls);
});

test("another tab can't be moved in front of the Rolls tab", () => {
  const [rolls, , last] = ids();
  useChongStore.getState().moveTab(last, 0);
  expect(ids()).toEqual([rolls, last, ids()[2]]);
  expect(ids()[0]).toBe(rolls);
});

test("other tabs can still be deleted", () => {
  const [, second] = ids();
  useChongStore.getState().deleteTab(second);
  expect(ids()).not.toContain(second);
});
