import { beforeEach, expect, test } from "vitest";
import { useChongStore } from "./chongStore";
import { allNames, emptySaved } from "./savedRolls";
import { expand } from "../engine";

const names = () => useChongStore.getState().saved.names;

test("`atk = …` saves a name and `atk +3` rolls its text", () => {
  useChongStore.getState().setName("atk", "1d10 nimble chain 5+ chain adv");
  expect(expand("atk +3", allNames(useChongStore.getState().saved))).toBe(
    "1d10 crit miss 1 chain 5+ chain adv +3"
  );
});

test("empty text deletes a name", () => {
  useChongStore.getState().setName("atk", "1d10");
  useChongStore.getState().setName("atk", "");
  expect(names()).toEqual({});
});

test("deleting the user's nimble restores the built-in", () => {
  useChongStore.getState().setName("nimble", "crit");
  expect(allNames(useChongStore.getState().saved).nimble).toBe("crit");
  useChongStore.getState().setName("nimble", "");
  expect(allNames(useChongStore.getState().saved).nimble).toBe("crit miss 1");
});

test("names that can't be saved are refused", () => {
  useChongStore.getState().setName("crit", "1d6");
  useChongStore.getState().setName("2d6", "1d6");
  expect(names()).toEqual({});
});

test("names are saved lower case", () => {
  useChongStore.getState().setName("Atk", " 1d10 ");
  expect(names()).toEqual({ atk: "1d10" });
});

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
