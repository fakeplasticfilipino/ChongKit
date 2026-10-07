import { useEffect } from "react";

import {
  Command,
  evaluate,
  LogicalDie,
  parseCommand,
  rollVirtual,
  toPhysical,
} from "../roll";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { useDiceHistoryStore } from "../controls/history";
import { generateDiceId } from "../helpers/generateDiceId";
import { getRandomDiceThrow } from "../helpers/DiceThrower";
import { Dice } from "../types/Dice";
import { Die } from "../types/Die";
import { DiceThrow } from "../types/DiceThrow";
import { DiceType } from "../types/DiceType";
import { ChongRollMeta, logicalValues, popThrow } from "./rollMeta";
import { RollError } from "../roll";
import { usePrefsStore } from "./prefsStore";
import { useTrayStore } from "./trayStore";
import { countsToCommand, isPrimaryKey, resolvePrimaryStyle } from "./prefs";

/**
 * Roll a command now. Throws `RollError` when it can't be rolled.
 */
export function startCommandRoll(
  input: string,
  opts: { hidden: boolean; speedMultiplier?: number }
): void {
  const command = input.trim();
  const cmd = parseCommand(command);
  const meta: ChongRollMeta = {
    command,
    parts: {},
    virtual: {},
    capped: false,
    nimble: usePrefsStore.getState().prefs.nimble,
  };
  const wave = nextWave(cmd, meta, {});
  if (meta.error) {
    throw new RollError(meta.error);
  }
  const dice = makeDice(wave, meta);

  // A typed roll or Instant pill replaces any dice placed or picked by hand,
  // otherwise the tray keeps showing them instead of this roll's result
  const controls = useDiceControlsStore.getState();
  controls.resetDiceCounts();
  controls.setDiceBonus(0);
  controls.setDiceAdvantage(null);

  useDiceRollStore
    .getState()
    .startRoll({ dice, combination: "NONE", hidden: opts.hidden, chong: meta }, opts.speedMultiplier);
  useTrayStore.getState().setError(null);
  useDiceHistoryStore.getState().pushRecentRoll({
    counts: {},
    bonus: 0,
    advantage: null,
    diceById: {},
    command,
  });
}

/**
 * Dice picked by hand on the tray roll as a command too, so they get a primary die and Nimble
 * rules. Returns false (leaving it to the upstream roll) for advantage / disadvantage picks.
 */
export function rollPickedDice(opts: { hidden: boolean; speedMultiplier?: number }): boolean {
  const { diceCounts, diceById, diceBonus, diceAdvantage } = useDiceControlsStore.getState();
  if (diceAdvantage !== null) {
    return false;
  }
  const command = countsToCommand(diceCounts, diceById, diceBonus);
  if (!command) {
    return false;
  }
  startCommandRoll(command, opts);
  return true;
}

/**
 * The next physical dice a command needs. Rolls any virtual dice
 * (sizes with no 3D model) on the way and records them in `meta`.
 * Returns [] when the command is finished, or when it can't go on
 * (then `meta.error` says why).
 */
export function nextWave(
  cmd: Command,
  meta: ChongRollMeta,
  rollValues: Record<string, number | null>
): LogicalDie[] {
  for (;;) {
    let ev;
    try {
      ev = evaluate(
        cmd,
        { ...logicalValues(meta, rollValues), ...meta.virtual },
        { nimble: meta.nimble }
      );
    } catch (e) {
      meta.error = e instanceof Error ? e.message : "Can't roll this";
      return [];
    }
    if (ev.result) {
      meta.capped = ev.result.capped;
      return [];
    }
    const physical = ev.needed.filter((d) => toPhysical(d.size));
    for (const d of ev.needed) {
      if (!toPhysical(d.size)) {
        meta.virtual[d.key] = rollVirtual(d.size);
      }
    }
    if (physical.length > 0) {
      return physical;
    }
  }
}

/** The dice set's style for this die; with Nimble on, the primary style for each roll's first die */
function styleFor(type: DiceType, key: string) {
  const set = useDiceControlsStore.getState().diceSet;
  const style = (set.dice.find((d) => d.type === type) || set.dice[0]).style;
  const { primaryStyle, nimble } = usePrefsStore.getState().prefs;
  if (nimble && isPrimaryKey(key)) {
    return resolvePrimaryStyle(primaryStyle, style);
  }
  return style;
}

/** Upstream dice for logical dice; records each part in `meta.parts` */
function makeDice(wave: LogicalDie[], meta: ChongRollMeta): (Die | Dice)[] {
  return wave.map((logical) => {
    const parts: Die[] = toPhysical(logical.size)!.map((type, part) => {
      const die: Die = { id: generateDiceId(), style: styleFor(type, logical.key), type };
      meta.parts[die.id] = { key: logical.key, size: logical.size, part };
      return die;
    });
    return parts.length === 1 ? parts[0] : { dice: parts };
  });
}

/** Where a follow-up die starts: popping out of its parent when it exploded */
function waveThrows(
  wave: LogicalDie[],
  dice: (Die | Dice)[],
  meta: ChongRollMeta
): Record<string, DiceThrow> {
  const { rollTransforms } = useDiceRollStore.getState();
  const throws: Record<string, DiceThrow> = {};
  wave.forEach((logical, i) => {
    const entry = dice[i];
    const ids = "id" in entry ? [entry.id] : (entry.dice as Die[]).map((d) => d.id);
    let parentTransform = null;
    if (logical.reason === "explode" && logical.parent) {
      const parentId = Object.keys(meta.parts).find(
        (id) => meta.parts[id].key === logical.parent && meta.parts[id].part === 0
      );
      parentTransform = parentId ? rollTransforms[parentId] : null;
    }
    for (const id of ids) {
      throws[id] = parentTransform ? popThrow(parentTransform) : getRandomDiceThrow();
    }
  });
  return throws;
}

/** When every die of a command roll has landed, throw the next wave if there is one */
export function useWaveRunner(): void {
  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        const roll = state.roll;
        if (!roll?.chong) {
          return;
        }
        const values = Object.values(state.rollValues);
        if (values.some((v) => v === null)) {
          return;
        }
        let cmd: Command;
        try {
          cmd = parseCommand(roll.chong.command);
        } catch {
          return;
        }
        // The store's copy is frozen
        const meta: ChongRollMeta = JSON.parse(JSON.stringify(roll.chong));
        const wave = nextWave(cmd, meta, state.rollValues);
        if (wave.length > 0) {
          const dice = makeDice(wave, meta);
          state.addDice(dice, waveThrows(wave, dice, meta), meta);
        } else if (JSON.stringify(meta) !== JSON.stringify(roll.chong)) {
          state.setChong(meta);
        }
      }),
    []
  );
}
