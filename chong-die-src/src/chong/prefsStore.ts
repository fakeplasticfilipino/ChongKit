import create from "zustand";
import { immer } from "zustand/middleware/immer";

import { loadPrefs, Prefs, PREFS_KEY, savePrefs } from "./prefs";
import { DiceStyle } from "../types/DiceStyle";

interface PrefsState {
  /** Primary die style, Nimble rules, Rolls panel open (saved in this browser) */
  prefs: Prefs;
  setPrimaryStyle: (style: DiceStyle | null) => void;
  setNimble: (on: boolean) => void;
  setPanelOpen: (open: boolean) => void;
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
    setPanelOpen(open) {
      set((state) => {
        state.prefs.panelOpen = open;
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

/** Follow prefs changed in another Owlbear tab of this browser */
export function listenForPrefChanges(): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === PREFS_KEY) {
      usePrefsStore.getState().reload();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
