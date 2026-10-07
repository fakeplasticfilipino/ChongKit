import { useDiceControlsStore } from "../controls/store";
import { useTrayStore } from "./trayStore";
import { instantFor, loadSaved, SavedRolls } from "./savedRolls";
import { placeCommand } from "./place";
import { startCommandRoll } from "./rollRunner";

export { CHANNELS } from "./channels";

/**
 * A roll sent to the tray: `place` says whether its dice are placed on the tray or rolled now;
 * without it (Chong's Tracker) the Rolls window's open tab decides. A command with only virtual
 * dice always rolls.
 */
export function handleIncomingRoll(
  command: string,
  place?: boolean,
  saved: SavedRolls = loadSaved()
): "rolled" | "placed" | "error" {
  const tray = useTrayStore.getState();
  try {
    let outcome: "rolled" | "placed" = "rolled";
    if ((place ?? !instantFor(saved)) && placeCommand(command)) {
      outcome = "placed";
    } else {
      startCommandRoll(command, { hidden: useDiceControlsStore.getState().diceHidden });
    }
    tray.setError(null);
    return outcome;
  } catch (e) {
    tray.setError(e instanceof Error ? e.message : "Can't roll this");
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
