import { Player } from "@owlbear-rodeo/sdk";
import create from "zustand";

interface PartyState {
  /** The other players in the room */
  players: Player[];
  /** The player whose tray is shown full size (⋯ → a player, or their roll popover) */
  focused: string | null;
  setPlayers: (players: Player[]) => void;
  setFocused: (connectionId: string | null) => void;
}

export const usePartyStore = create<PartyState>()((set) => ({
  players: [],
  focused: null,
  setPlayers: (players) => set({ players }),
  setFocused: (focused) => set({ focused }),
}));
