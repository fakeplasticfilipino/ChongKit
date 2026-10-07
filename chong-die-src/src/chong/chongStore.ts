import create from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  emptySaved,
  loadSaved,
  Pill,
  pushHistory,
  RollTab,
  saveSaved,
  SavedRolls,
} from "./savedRolls";

interface ChongState {
  saved: SavedRolls;
  activeTabId: string;
  /** Message shown under the command line of the Rolls window */
  error: string | null;
  /** What's typed in the command line (the + button starts a pill from it) */
  draft: string;
  setDraft: (text: string) => void;
  addTab: () => void;
  renameTab: (id: string, name: string) => void;
  deleteTab: (id: string) => void;
  moveTab: (id: string, toIndex: number) => void;
  setActiveTab: (id: string) => void;
  addPill: (tabId: string, name: string, command: string, description?: string) => void;
  editPill: (id: string, name: string, command: string, description?: string) => void;
  deletePill: (id: string) => void;
  movePill: (id: string, toTabId: string, toIndex: number) => void;
  setError: (msg: string | null) => void;
  recordHistory: (cmd: string) => void;
  replaceSaved: (s: SavedRolls) => void;
}

const newId = () => Math.random().toString(36).slice(2, 10);

function findPill(s: SavedRolls, id: string) {
  for (const tab of s.tabs) {
    const index = tab.pills.findIndex((p) => p.id === id);
    if (index >= 0) {
      return { tab, index };
    }
  }
  return null;
}

const initial = loadSaved();

export const useChongStore = create<ChongState>()(
  immer((set) => ({
    saved: initial,
    activeTabId: initial.tabs[0].id,
    error: null,
    draft: "",
    setDraft(text) {
      set((state) => {
        state.draft = text;
      });
    },
    addTab() {
      set((state) => {
        const tab: RollTab = {
          id: newId(),
          name: "New tab",
          pills: [],
        };
        state.saved.tabs.push(tab);
        state.activeTabId = tab.id;
      });
    },
    renameTab(id, name) {
      set((state) => {
        const tab = state.saved.tabs.find((t) => t.id === id);
        if (tab && name.trim()) {
          tab.name = name.trim();
        }
      });
    },
    deleteTab(id) {
      set((state) => {
        const index = state.saved.tabs.findIndex((t) => t.id === id);
        // The first tab (Rolls, with the dice) stays
        if (index <= 0) {
          return;
        }
        state.saved.tabs.splice(index, 1);
        if (state.saved.tabs.length === 0) {
          state.saved.tabs.push(emptySaved().tabs[0]);
        }
        if (state.activeTabId === id) {
          state.activeTabId =
            state.saved.tabs[Math.min(index, state.saved.tabs.length - 1)].id;
        }
      });
    },
    moveTab(id, toIndex) {
      set((state) => {
        const tabs = state.saved.tabs;
        const from = tabs.findIndex((t) => t.id === id);
        // The first tab (Rolls, with the dice) stays first
        if (from > 0) {
          const [tab] = tabs.splice(from, 1);
          tabs.splice(Math.max(1, Math.min(toIndex, tabs.length)), 0, tab);
        }
      });
    },
    setActiveTab(id) {
      set((state) => {
        state.activeTabId = id;
      });
    },
    addPill(tabId, name, command, description) {
      set((state) => {
        const tab = state.saved.tabs.find((t) => t.id === tabId);
        const pill: Pill = { id: newId(), name: name.trim() || command, command };
        if (description?.trim()) {
          pill.description = description.trim();
        }
        tab?.pills.push(pill);
      });
    },
    editPill(id, name, command, description) {
      set((state) => {
        const found = findPill(state.saved, id);
        if (found) {
          const pill = found.tab.pills[found.index];
          pill.name = name.trim() || command;
          pill.command = command;
          if (description?.trim()) {
            pill.description = description.trim();
          } else {
            delete pill.description;
          }
        }
      });
    },
    deletePill(id) {
      set((state) => {
        const found = findPill(state.saved, id);
        found?.tab.pills.splice(found.index, 1);
      });
    },
    movePill(id, toTabId, toIndex) {
      set((state) => {
        const found = findPill(state.saved, id);
        const to = state.saved.tabs.find((t) => t.id === toTabId);
        if (found && to) {
          const [pill] = found.tab.pills.splice(found.index, 1);
          to.pills.splice(Math.max(0, Math.min(toIndex, to.pills.length)), 0, pill);
        }
      });
    },
    setError(msg) {
      set((state) => {
        state.error = msg;
      });
    },
    recordHistory(cmd) {
      set((state) => {
        state.saved.history = pushHistory(state.saved.history, cmd);
      });
    },
    replaceSaved(s) {
      set((state) => {
        state.saved = s;
        state.activeTabId = s.tabs[0].id;
      });
    },
  }))
);

// Save on every change to the saved rolls
useChongStore.subscribe((state, prev) => {
  if (state.saved !== prev.saved) {
    saveSaved(state.saved);
  }
});
