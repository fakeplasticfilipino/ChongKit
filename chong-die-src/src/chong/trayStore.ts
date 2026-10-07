import create from "zustand";
import { immer } from "zustand/middleware/immer";

interface TrayState {
  /** Why the tray couldn't roll what it was sent (banner at the top of the tray) */
  error: string | null;
  setError: (msg: string | null) => void;
}

/** The tray window's own state (never saved) */
export const useTrayStore = create<TrayState>()(
  immer((set) => ({
    error: null,
    setError(msg) {
      set((state) => {
        state.error = msg;
      });
    },
  }))
);
