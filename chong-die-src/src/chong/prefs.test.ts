import { expect, test } from "vitest";
import {
  countsToCommand,
  isPrimaryKey,
  loadPrefs,
  PREFS_KEY,
  resolvePrimaryStyle,
  savePrefs,
} from "./prefs";
import { Die } from "../types/Die";

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  } as unknown as Storage;
}

test("default prefs: no primary style chosen, Nimble off", () =>
  expect(loadPrefs(fakeStorage())).toEqual({ primaryStyle: null, nimble: false }));

test("prefs round trip", () => {
  const storage = fakeStorage();
  savePrefs({ primaryStyle: "SUNSET", nimble: true }, storage);
  expect(loadPrefs(storage)).toEqual({ primaryStyle: "SUNSET", nimble: true });
});

test("bad prefs fall back to the defaults", () => {
  expect(loadPrefs(fakeStorage({ [PREFS_KEY]: "{bad" }))).toEqual({ primaryStyle: null, nimble: false });
  expect(loadPrefs(fakeStorage({ [PREFS_KEY]: '{"primaryStyle":"PLAID","nimble":"yes"}' }))).toEqual({
    primaryStyle: null,
    nimble: false,
  });
});

test("unchosen primary style differs from the dice style", () => {
  expect(resolvePrimaryStyle(null, "GALAXY")).toBe("GEMSTONE");
  expect(resolvePrimaryStyle(null, "GEMSTONE")).toBe("GALAXY");
  expect(resolvePrimaryStyle("WALNUT", "GALAXY")).toBe("WALNUT");
});

test("primary keys: each roll's first die and its explosions", () => {
  expect(isPrimaryKey("0.0.0")).toBe(true);
  expect(isPrimaryKey("3.0.0")).toBe(true);
  expect(isPrimaryKey("0.0.0e")).toBe(true);
  expect(isPrimaryKey("0.0.0ee")).toBe(true);
  expect(isPrimaryKey("0.0.1")).toBe(false);
  expect(isPrimaryKey("0.1.0")).toBe(false);
  expect(isPrimaryKey("0.0.0r")).toBe(false);
});

const die = (id: string, type: Die["type"]): Die => ({ id, type, style: "GALAXY" });

test("picker counts become a command", () => {
  const diceById = { a: die("a", "D6"), b: die("b", "D8"), c: die("c", "D20") };
  expect(countsToCommand({ a: 2, b: 0, c: 1 }, diceById, 3)).toBe("2d6+1d20+3");
  expect(countsToCommand({ a: 0, b: 1, c: 0 }, diceById, -2)).toBe("1d8-2");
  expect(countsToCommand({ a: 0, b: 0, c: 0 }, diceById, 0)).toBeNull();
});

test("picker d100 becomes 1d100", () =>
  expect(countsToCommand({ x: 1 }, { x: die("x", "D100") }, 0)).toBe("1d100"));
