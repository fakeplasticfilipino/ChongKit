import { useDiceControlsStore } from "../controls/store";
import { useTrayStore } from "./trayStore";
import { startCommandRoll } from "./rollRunner";

export { CHANNELS } from "./channels";

/** A roll sent to the tray (from Chong's Tracker): rolls it now */
export function handleIncomingRoll(command: string): "rolled" | "error" {
  const tray = useTrayStore.getState();
  try {
    startCommandRoll(command, { hidden: useDiceControlsStore.getState().diceHidden });
    tray.setError(null);
    return "rolled";
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
