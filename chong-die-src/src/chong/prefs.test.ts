import { expect, test } from "vitest";
import {
  countsToCommand,
  loadPrefs,
  PREFS_KEY,
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

test("default prefs: panel open", () =>
  expect(loadPrefs(fakeStorage())).toEqual({ panelOpen: true }));

test("prefs round trip", () => {
  const storage = fakeStorage();
  savePrefs({ panelOpen: false }, storage);
  expect(loadPrefs(storage)).toEqual({ panelOpen: false });
});

test("bad prefs fall back to the defaults", () => {
  expect(loadPrefs(fakeStorage({ [PREFS_KEY]: "{bad" }))).toEqual({ panelOpen: true });
  expect(
    loadPrefs(fakeStorage({ [PREFS_KEY]: '{"panelOpen":"no"}' }))
  ).toEqual({ panelOpen: true });
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

test("prefs saved before the panel setting open the panel", () =>
  expect(loadPrefs(fakeStorage({ [PREFS_KEY]: '{"primaryStyle":null,"nimble":true}' })).panelOpen).toBe(true));
