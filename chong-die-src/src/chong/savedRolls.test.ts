import { expect, test } from "vitest";
import {
  emptySaved,
  importSaved,
  loadSaved,
  pillError,
  pushHistory,
  saveSaved,
  STORAGE_KEY,
  validateSavedRolls,
} from "./savedRolls";

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage;
}

test("empty storage gives one Rolls tab", () => {
  const s = loadSaved(fakeStorage());
  expect(s).toEqual(emptySaved());
  expect(s.tabs.map((t) => [t.name, t.instant, t.pills.length])).toEqual([
    ["Rolls", false, 0],
  ]);
});

test("corrupt data gives the empty state", () =>
  expect(loadSaved(fakeStorage({ [STORAGE_KEY]: "{bad" }))).toEqual(
    emptySaved()
  ));

test("storage that throws gives the empty state", () => {
  const broken = {
    getItem: () => {
      throw new Error("denied");
    },
  } as unknown as Storage;
  expect(loadSaved(broken)).toEqual(emptySaved());
});

test("save that throws is ignored", () => {
  const broken = {
    setItem: () => {
      throw new Error("full");
    },
  } as unknown as Storage;
  expect(() => saveSaved(emptySaved(), broken)).not.toThrow();
});

test("round trip", () => {
  const storage = fakeStorage();
  const s = emptySaved();
  s.tabs[0].pills.push({ id: "p1", name: "Sword", command: "!r 1d20+5" });
  s.tabs[0].instant = true;
  s.history = ["1d6"];
  saveSaved(s, storage);
  expect(loadSaved(storage)).toEqual(s);
});

test("validate drops pills without a command, keeps unparseable ones", () => {
  const v = validateSavedRolls({
    version: 1,
    tabs: [
      {
        id: "t",
        name: "A",
        instant: false,
        pills: [
          { id: "a", name: "No command" },
          { id: "b", name: "Broken", command: "1d0" },
        ],
      },
    ],
    history: [],
  });
  expect(v!.tabs[0].pills.map((p) => p.id)).toEqual(["b"]);
});

test("validate rejects non-objects and missing tabs", () => {
  expect(validateSavedRolls([])).toBeNull();
  expect(validateSavedRolls({ version: 1 })).toBeNull();
  expect(validateSavedRolls({ version: 1, tabs: [] })).toBeNull();
});

test("pill error", () => {
  expect(pillError({ id: "x", name: "x", command: "1d0" })).toBe(
    "Unknown die d0"
  );
  expect(pillError({ id: "x", name: "x", command: "!r 1d20" })).toBeNull();
});

test("history keeps the last 50 and skips an immediate repeat", () => {
  let h: string[] = [];
  for (let i = 0; i < 60; i++) h = pushHistory(h, `1d${i + 1}`);
  expect(h.length).toBe(50);
  expect(h[h.length - 1]).toBe("1d60");
  expect(pushHistory(h, "1d60")).toBe(h);
});

test("import rejects other files", () =>
  expect(() => importSaved("[]")).toThrow("Not a Chong Die file"));

test("import rejects big files", () =>
  expect(() => importSaved("x".repeat(1_048_577))).toThrow("File is over 1 MB"));

test("import accepts an export", () => {
  const s = emptySaved();
  s.tabs[0].name = "Attacks";
  expect(importSaved(JSON.stringify(s)).tabs[0].name).toBe("Attacks");
});

test("a pill's description survives a round trip", () => {
  const storage = fakeStorage();
  const s = emptySaved();
  s.tabs[0].pills.push({ id: "p", name: "Sword", command: "1d8", description: "Versatile" });
  saveSaved(s, storage);
  expect(loadSaved(storage).tabs[0].pills[0].description).toBe("Versatile");
});

test("a non-text description is dropped, the pill kept", () => {
  const v = validateSavedRolls({
    version: 1,
    tabs: [{ id: "t", name: "A", instant: false, pills: [{ id: "a", name: "A", command: "1d4", description: 5 }] }],
    history: [],
  });
  expect(v!.tabs[0].pills[0]).toEqual({ id: "a", name: "A", command: "1d4" });
});

test("old pills without a description load unchanged", () => {
  const v = validateSavedRolls({
    version: 1,
    tabs: [{ id: "t", name: "A", instant: false, pills: [{ id: "a", name: "A", command: "1d4" }] }],
    history: [],
  });
  expect(v!.tabs[0].pills[0]).toEqual({ id: "a", name: "A", command: "1d4" });
});
