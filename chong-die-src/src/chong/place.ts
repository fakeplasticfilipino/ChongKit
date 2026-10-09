import { parse, stageZeroSizes, toPhysical } from "../engine";
import { useDiceControlsStore, whilePlacing } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { usePrefsStore } from "./prefsStore";
import { startCommandRoll } from "./rollRunner";
import { useTrayStore } from "./trayStore";
import { useChongStore } from "./chongStore";

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

/**
 * Clicking a saved pill: its dice go on the tray and its roll goes in the command line, so the
 * player can add to it (` adv`, ` dis`, `+2`) before throwing; the tray follows the line
 * (`followLine`). With Quick roll on, the pill throws at once, as before. Throws `EngineError`.
 */
export function placePill(command: string, opts: { hidden: boolean }): "placed" | "rolled" {
  const done = placeCommand(command, opts);
  if (done === "placed") {
    useChongStore.getState().setDraft(command.trim());
    useTrayStore.getState().setFromPill(command.trim());
  }
  return done;
}

/**
 * The command line changed: while dice it placed wait on the tray, the tray follows it, so Roll
 * always throws what the line says. Text that isn't a roll yet (half-typed) keeps the last good
 * one; errors show on Enter, as for any typed roll. Quick roll never throws from here.
 */
export function followLine(text: string, opts: { hidden: boolean }): void {
  const command = text.trim();
  const { placed } = useTrayStore.getState();
  if (!placed || !command || command === placed || usePrefsStore.getState().prefs.quickRoll) {
    return;
  }
  try {
    placeCounts(command);
  } catch {
    return;
  }
  placeCommand(command, opts);
}

/**
 * A placed roll was thrown with Roll: the line that put it there clears, and a pill the player
 * changed goes into the ↑ history (an unchanged pill is already one click away). `fromPill` is read
 * before the throw (throwing clears the tray, which drops it).
 */
export function thrownFromLine(command: string, fromPill = useTrayStore.getState().fromPill): void {
  const chong = useChongStore.getState();
  const tray = useTrayStore.getState();
  if (chong.draft.trim() === command) {
    chong.setDraft("");
  }
  if (fromPill !== null && fromPill !== command) {
    chong.recordHistory(command);
  }
  tray.setFromPill(null);
}
