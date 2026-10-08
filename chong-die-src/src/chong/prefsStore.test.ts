import { expect, test } from "vitest";
import { usePrefsStore } from "./prefsStore";
import { savePrefs } from "./prefs";

function fakeStorage(): Storage {
  const data: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  } as unknown as Storage;
}

test("reload picks up prefs another window saved", () => {
  const storage = fakeStorage();
  savePrefs({ panelOpen: false, quickRoll: true }, storage);
  usePrefsStore.getState().reload(storage);
  expect(usePrefsStore.getState().prefs).toEqual({ panelOpen: false, quickRoll: true });
});
