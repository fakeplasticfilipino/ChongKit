import { parseCommand, RollError, toPhysical } from "../roll";
import { useDiceControlsStore, whilePlacing } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { ChongRollMeta } from "./rollMeta";
import { nextWave, startCommandRoll } from "./rollRunner";
import { useTrayStore } from "./trayStore";

/**
 * How many of each 3D die the command's first throw needs, as the tray's dice pills count them
 * (a d100 is one D100). Throws `RollError` when the command can't be rolled.
 */
export function placeCounts(command: string): Record<string, number> {
  const meta: ChongRollMeta = { command, parts: {}, virtual: {}, capped: false };
  const wave = nextWave(parseCommand(command), meta, {});
  if (meta.error) {
    throw new RollError(meta.error);
  }
  const counts: Record<string, number> = {};
  for (const die of wave) {
    const type = toPhysical(die.size)![0];
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

/**
 * A custom roll (typed, a pill, Chong's Tracker, history): its dice go on the tray to be held and
 * thrown with Roll, like dice picked by hand. A command with no 3D dice rolls now.
 * Throws `RollError`.
 */
export function placeCommand(input: string, opts: { hidden: boolean }): "placed" | "rolled" {
  const command = input.trim();
  const counts = placeCounts(command);
  if (Object.keys(counts).length === 0) {
    startCommandRoll(command, opts);
    return "rolled";
  }
  // A finished roll on the tray makes way for the new dice
  const { roll, clearRoll } = useDiceRollStore.getState();
  if (roll) {
    clearRoll();
  }
  whilePlacing(() => {
    const controls = useDiceControlsStore.getState();
    controls.resetDiceCounts();
    for (const die of controls.diceSet.dice) {
      if (counts[die.type]) {
        useDiceControlsStore.getState().changeDieCount(die.id, counts[die.type]);
      }
    }
  });
  useTrayStore.getState().setPlaced(command);
  useTrayStore.getState().setError(null);
  return "placed";
}
