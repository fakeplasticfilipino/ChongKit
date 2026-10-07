import { Player } from "@owlbear-rodeo/sdk";

import { usePlayerDice } from "./usePlayerDice";
import { DiceRoll } from "../dice/DiceRoll";

export function PlayerDiceRoll({ player }: { player?: Player }) {
  const {
    diceRoll,
    rollThrows,
    rollValues,
    finishedRollTransforms,
    finishedRolling,
    transformsRef,
  } = usePlayerDice(player);

  if (!diceRoll || !rollThrows || !finishedRollTransforms) {
    return null;
  }

  return (
    <DiceRoll
      roll={diceRoll}
      rollThrows={rollThrows}
      finishedTransforms={finishedRolling ? finishedRollTransforms : undefined}
      rollValues={rollValues}
      transformsRef={transformsRef}
    />
  );
}
