import { parse, stageZeroSizes, toPhysical } from "../engine";
import { useDiceControlsStore, whilePlacing } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { usePrefsStore } from "./prefsStore";
import { startCommandRoll } from "./rollRunner";
import { useTrayStore } from "./trayStore";

/**
 * How many of each 3D die the command's first throw needs, as the tray's dice pills count them
 * (a d100 is one D100; dice with no 3D model need none).
 * Throws `EngineError` when the command can't be rolled.
 */
export function placeCounts(command: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const size of stageZeroSizes(parse(command.trim()))) {
    const type = toPhysical(size)?.[0];
    if (type) {
      counts[type] = (counts[type] || 0) + 1;
    }
  }
  return counts;
}

/**
 * A custom roll (typed, a pill, history): its dice go on the tray to be held and
 * thrown with Roll, like dice picked by hand; the tray keeps the typed command. A command with
 * no 3D dice, or any command with Quick roll on, rolls now. Throws `EngineError`.
 */
export function placeCommand(input: string, opts: { hidden: boolean }): "placed" | "rolled" {
  const command = input.trim();
  const counts = placeCounts(command);
  if (Object.keys(counts).length === 0 || usePrefsStore.getState().prefs.quickRoll) {
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
