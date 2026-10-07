import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getPluginId } from "./getPluginId";

/** Sync the current dice roll to the plugin */
export function DiceRollSync() {
  const prevIds = useRef<string[]>([]);
  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        let changed = false;
        if (!state.roll) {
          changed = true;
          prevIds.current = [];
        } else {
          const ids = getDieFromDice(state.roll).map((die) => die.id);
          // Check array length for early change check
          if (prevIds.current.length !== ids.length) {
            changed = true;
          }
          // Check the ids have changed
          else if (!ids.every((id, index) => id === prevIds.current[index])) {
            changed = true;
          }
          // Check if we'e completed a roll
          else if (
            Object.values(state.rollValues).every((value) => value !== null)
          ) {
            changed = true;
          }
          prevIds.current = ids;
        }

        if (changed) {
          // Hide values if needed
          const throws = state.roll?.hidden ? undefined : state.rollThrows;
          const values = state.roll?.hidden ? undefined : state.rollValues;
          const transforms = state.roll?.hidden
            ? undefined
            : state.rollTransforms;
          // A hidden command roll's record holds every value: keep it to this tray
          const roll =
            state.roll?.hidden && state.roll.chong
              ? { ...state.roll, chong: undefined }
              : state.roll;
          OBR.player.setMetadata({
            [getPluginId("roll")]: roll,
            [getPluginId("rollThrows")]: throws,
            [getPluginId("rollValues")]: values,
            [getPluginId("rollTransforms")]: transforms,
          });
        }
      }),
    []
  );

  return null;
}
