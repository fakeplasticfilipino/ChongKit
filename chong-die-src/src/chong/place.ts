import { evaluate, parseCommand, toPhysical } from "../roll";
import { useDiceControlsStore, whilePlacing } from "../controls/store";
import { useChongStore } from "./chongStore";

/**
 * How many of each 3D die the command's first throw needs, as the tray's
 * dice picker counts them (a d100 is one D100 in the picker).
 * Throws `RollError`.
 */
export function placeCounts(command: string): Record<string, number> {
  const { needed } = evaluate(parseCommand(command), {});
  const counts: Record<string, number> = {};
  for (const die of needed) {
    const types = toPhysical(die.size);
    if (types) {
      counts[types[0]] = (counts[types[0]] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Put a command's dice on the tray for the player to throw.
 * Returns false (and places nothing) when it has no 3D dice.
 * Throws `RollError`.
 */
export function placeCommand(command: string): boolean {
  const counts = placeCounts(command);
  if (Object.keys(counts).length === 0) {
    return false;
  }
  whilePlacing(() => {
    const controls = useDiceControlsStore.getState();
    controls.resetDiceCounts();
    controls.setDiceBonus(0);
    controls.setDiceAdvantage(null);
    for (const die of controls.diceSet.dice) {
      if (counts[die.type]) {
        useDiceControlsStore.getState().changeDieCount(die.id, counts[die.type]);
      }
    }
  });
  const chong = useChongStore.getState();
  chong.setPlaced(command.trim());
  chong.setPanelOpen(false);
  return true;
}
