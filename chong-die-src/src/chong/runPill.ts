import { placeCommand } from "./place";
import { startCommandRoll } from "./rollRunner";

/**
 * A pill clicked in the Rolls panel: Instant rolls it on the tray now, otherwise its dice are
 * placed on the tray to throw (a command with only virtual dice rolls). Throws `RollError`.
 */
export function runPill(command: string, instant: boolean, hidden: boolean): "rolled" | "placed" {
  if (!instant && placeCommand(command)) {
    return "placed";
  }
  startCommandRoll(command, { hidden });
  return "rolled";
}
