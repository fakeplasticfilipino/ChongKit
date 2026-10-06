import { Player } from "@owlbear-rodeo/sdk";

import { usePlayerDice } from "./usePlayerDice";
import { DiceRoll } from "../dice/DiceRoll";

export function PlayerDiceRoll({ player }: { player?: Player }) {
  const {
    diceRoll,
    rollThrows,
    finishedRollTransforms,
    finishedRolling,
    transformsRef,
    rollValues,
    rollTransforms,
  } = usePlayerDice(player);

  if (!diceRoll || !rollThrows || !finishedRollTransforms) {
    return null;
  }

  return (
    <DiceRoll
      roll={diceRoll}
      rollThrows={rollThrows}
      finishedTransforms={finishedRolling ? finishedRollTransforms : undefined}
      transformsRef={transformsRef}
      rollValues={rollValues}
      rollTransforms={rollTransforms}
    />
  );
}
