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
import { useChongStore } from "./chongStore";

/**
 * Roll a command now. Throws `RollError` when it can't be rolled.
 */
export function startCommandRoll(
  input: string,
  opts: { hidden: boolean; speedMultiplier?: number }
): void {
  const command = input.trim();
  const cmd = parseCommand(command);
  const meta: ChongRollMeta = { command, parts: {}, virtual: {}, capped: false };
  const wave = nextWave(cmd, meta, {});
  const dice = makeDice(wave, meta);

  useDiceRollStore
    .getState()
    .startRoll({ dice, combination: "NONE", hidden: opts.hidden, chong: meta }, opts.speedMultiplier);
  useChongStore.getState().recordHistory(command);
  useDiceHistoryStore.getState().pushRecentRoll({
    counts: {},
    bonus: 0,
    advantage: null,
    diceById: {},
    command,
  });
}

/**
 * The next physical dice a command needs. Rolls any virtual dice
 * (sizes with no 3D model) on the way and records them in `meta`.
 * Returns [] when the command is finished.
 */
export function nextWave(
  cmd: Command,
  meta: ChongRollMeta,
  rollValues: Record<string, number | null>
): LogicalDie[] {
  for (;;) {
    const ev = evaluate(cmd, {
      ...logicalValues(meta, rollValues),
      ...meta.virtual,
    });
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

function styleFor(type: DiceType) {
  const set = useDiceControlsStore.getState().diceSet;
  return (set.dice.find((d) => d.type === type) || set.dice[0]).style;
}

/** Upstream dice for logical dice; records each part in `meta.parts` */
function makeDice(wave: LogicalDie[], meta: ChongRollMeta): (Die | Dice)[] {
  return wave.map((logical) => {
    const parts: Die[] = toPhysical(logical.size)!.map((type, part) => {
      const die: Die = { id: generateDiceId(), style: styleFor(type), type };
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
