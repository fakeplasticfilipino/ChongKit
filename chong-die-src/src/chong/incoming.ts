import { useDiceControlsStore } from "../controls/store";
import { useChongStore } from "./chongStore";
import { placeCommand } from "./place";
import { startCommandRoll } from "./rollRunner";

export { CHANNELS } from "./channels";

/**
 * A roll clicked in Chong's Tracker: the open tab's Instant switch decides whether it rolls now
 * or its dice are placed on the tray. A command with only virtual dice always rolls.
 */
export function handleIncomingRoll(command: string): "rolled" | "placed" | "error" {
  const chong = useChongStore.getState();
  const tab = chong.saved.tabs.find((t) => t.id === chong.activeTabId) || chong.saved.tabs[0];
  try {
    let outcome: "rolled" | "placed" = "rolled";
    if (!tab.instant && placeCommand(command)) {
      outcome = "placed";
    } else {
      startCommandRoll(command, { hidden: useDiceControlsStore.getState().diceHidden });
      chong.setPanelOpen(false);
    }
    chong.setError(null);
    return outcome;
  } catch (e) {
    chong.setError(e instanceof Error ? e.message : "Can't roll this");
    return "error";
  }
}

/** The background page re-sends until acknowledged: true only the first time an id is seen */
export function createRunDeduper(): (id: string) => boolean {
  const seen = new Set<string>();
  return (id) => {
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  };
}
