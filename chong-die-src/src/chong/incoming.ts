import { useDiceControlsStore } from "../controls/store";
import { useTrayStore } from "./trayStore";
import { placeCommand } from "./place";

export { CHANNELS } from "./channels";

/** A roll sent to the tray (from Chong's Tracker): its dice wait on the tray to be thrown */
export function handleIncomingRoll(command: string): "placed" | "rolled" | "error" {
  const tray = useTrayStore.getState();
  try {
    const outcome = placeCommand(command, { hidden: useDiceControlsStore.getState().diceHidden });
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
