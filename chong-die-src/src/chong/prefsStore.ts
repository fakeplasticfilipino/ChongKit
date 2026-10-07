import create from "zustand";
import { immer } from "zustand/middleware/immer";

import { loadPrefs, Prefs, PREFS_KEY, savePrefs } from "./prefs";
import { DiceStyle } from "../types/DiceStyle";

interface PrefsState {
  /** Primary die style and Nimble rules (saved in this browser, shared by both windows) */
  prefs: Prefs;
  setPrimaryStyle: (style: DiceStyle | null) => void;
  setNimble: (on: boolean) => void;
  /** Read the prefs again (another window changed them) */
  reload: (storage?: Storage) => void;
}

export const usePrefsStore = create<PrefsState>()(
  immer((set) => ({
    prefs: loadPrefs(),
    setPrimaryStyle(style) {
      set((state) => {
        state.prefs.primaryStyle = style;
      });
    },
    setNimble(on) {
      set((state) => {
        state.prefs.nimble = on;
      });
    },
    reload(storage) {
      set((state) => {
        state.prefs = loadPrefs(storage);
      });
    },
  }))
);

usePrefsStore.subscribe((state, prev) => {
  if (state.prefs !== prev.prefs) {
    savePrefs(state.prefs);
  }
});

/** Follow prefs changed in the other window (Nimble in the Rolls window, primary style on the tray) */
export function listenForPrefChanges(): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === PREFS_KEY) {
      usePrefsStore.getState().reload();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
