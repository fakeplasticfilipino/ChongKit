import create from "zustand";
import { immer } from "zustand/middleware/immer";

interface TrayState {
  /** Command whose dice are on the tray, waiting to be held and thrown with Roll */
  placed: string | null;
  /** Why the tray couldn't roll what it was sent (banner at the top of the tray) */
  error: string | null;
  setPlaced: (cmd: string | null) => void;
  setError: (msg: string | null) => void;
}

/** The tray window's own state (never saved) */
export const useTrayStore = create<TrayState>()(
  immer((set) => ({
    placed: null,
    error: null,
    setPlaced(cmd) {
      set((state) => {
        state.placed = cmd;
      });
    },
    setError(msg) {
      set((state) => {
        state.error = msg;
      });
    },
  }))
);
