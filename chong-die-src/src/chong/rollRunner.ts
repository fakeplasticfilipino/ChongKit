import { useEffect } from "react";

import { parse, roll, rollFair, toPhysical } from "../engine";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { useDiceHistoryStore } from "../controls/history";
import { getRandomDiceThrow } from "../helpers/DiceThrower";
import { Dice } from "../types/Dice";
import { Die } from "../types/Die";
import { DiceThrow } from "../types/DiceThrow";
import { DiceType } from "../types/DiceType";
import { buildMeta, ChongRollMeta, isCurrentMeta, lastStage, partId, popThrow, stageIds } from "./rollMeta";
import { useTrayStore } from "./trayStore";
import { countsToCommand } from "./prefs";

/**
 * Roll a command now: the engine rolls every die up front, then the tray acts the record out,
 * stage 0 first. Throws `EngineError` when it can't be rolled.
 */
export function startCommandRoll(
  input: string,
  opts: { hidden: boolean; speedMultiplier?: number }
): void {
  const text = input.trim();
  const record = roll(parse(text), rollFair);
  const meta = buildMeta(record);
  const dice = makeDice(meta, stageIds(meta, 0));

  // A command roll replaces any dice picked by hand,
  // otherwise the tray keeps showing them instead of this roll's result
  useDiceControlsStore.getState().resetDiceCounts();

  useDiceRollStore
    .getState()
    .startRoll({ dice, combination: "NONE", hidden: opts.hidden, chong: meta }, opts.speedMultiplier);
  useTrayStore.getState().setError(null);
  useDiceHistoryStore.getState().pushRecentRoll({
    counts: {},
    bonus: 0,
    advantage: null,
    diceById: {},
    command: record.text,
  });
  // Stage 0 may have no 3D dice at all (`1d7`): move on now
  revealNext();
}

/**
 * Dice picked by hand on the tray roll as a command too. Returns false when no dice are picked.
 * Throws `EngineError`.
 */
export function rollPickedDice(opts: { hidden: boolean; speedMultiplier?: number }): boolean {
  const { diceCounts, diceById } = useDiceControlsStore.getState();
  const command = countsToCommand(diceCounts, diceById, 0);
  if (!command) {
    return false;
  }
  startCommandRoll(command, opts);
  return true;
}

/** The dice set's style for this die */
function styleFor(type: DiceType) {
  const set = useDiceControlsStore.getState().diceSet;
  return (set.dice.find((d) => d.type === type) || set.dice[0]).style;
}

/** Upstream dice for these 3D ids (a d100's two parts as one pair) */
function makeDice(meta: ChongRollMeta, ids: string[]): (Die | Dice)[] {
  const out: (Die | Dice)[] = [];
  let pair: Die[] | null = null;
  for (const id of ids) {
    const { rep, die: dieId, part } = meta.parts[id];
    const size = meta.record.reps[rep].dice[dieId].size;
    const physical = toPhysical(size)!;
    const die: Die = { id, style: styleFor(physical[part]), type: physical[part] };
    if (physical.length === 1) {
      out.push(die);
    } else {
      if (part === 0) {
        pair = [];
        out.push({ dice: pair });
      }
      pair?.push(die);
    }
  }
  return out;
}

/** Chain dice pop out of the die that made them (both dice of an advantage pick from the same parent) */
function stageThrows(meta: ChongRollMeta, ids: string[]): Record<string, DiceThrow> {
  const { rollTransforms } = useDiceRollStore.getState();
  const throws: Record<string, DiceThrow> = {};
  for (const id of ids) {
    const { rep, die } = meta.parts[id];
    const parent = meta.record.reps[rep].dice[die].parent;
    const parentId = parent === null ? undefined : partId(meta, rep, parent);
    const transform = parentId ? rollTransforms[parentId] : null;
    throws[id] = transform ? popThrow(transform) : getRandomDiceThrow();
  }
  return throws;
}

/**
 * When every 3D die on the tray has settled, show the next stage: its dice pop out of their
 * parents. Stages with no 3D dice (`1d7`'s chain dice) pass at once. The roller's tray only.
 */
export function revealNext(): void {
  const state = useDiceRollStore.getState();
  const meta = state.roll?.chong;
  if (!isCurrentMeta(meta)) {
    return;
  }
  if (Object.values(state.rollValues).some((v) => v === null)) {
    return;
  }
  const last = lastStage(meta.record);
  for (let stage = meta.stage + 1; stage <= last; stage++) {
    const ids = stageIds(meta, stage);
    if (ids.length > 0) {
      const next = { ...meta, stage };
      state.addDice(makeDice(next, ids), stageThrows(next, ids), next);
      return;
    }
  }
  if (meta.stage !== last) {
    state.setChong({ ...meta, stage: last });
  }
}

/** Runs `revealNext` on every change to the roll (the roller's tray only) */
export function useRevealRunner(): void {
  useEffect(() => useDiceRollStore.subscribe(() => revealNext()), []);
}
