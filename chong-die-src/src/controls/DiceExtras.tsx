import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Menu from "@mui/material/Menu";

import { DieBonus } from "./DieBonus";
import { DieAdvantage } from "./DieAdvantage";
import { useDiceControlsStore } from "./store";
import { useDiceRollStore } from "../dice/store";

/** Bonus and advantage for dice picked by hand (⋯ → Bonus and advantage) */
export function DiceExtrasMenu({ anchorEl, onClose }: { anchorEl: HTMLElement | null; onClose: () => void }) {
  const bonus = useDiceControlsStore((state) => state.diceBonus);
  const setBonus = useDiceControlsStore((state) => state.setDiceBonus);
  const advantage = useDiceControlsStore((state) => state.diceAdvantage);
  const setAdvantage = useDiceControlsStore((state) => state.setDiceAdvantage);

  const clearRoll = useDiceRollStore((state) => state.clearRoll);
  const roll = useDiceRollStore((state) => state.roll);
  function clearRollIfNeeded() {
    if (roll) {
      clearRoll();
    }
  }

  const open = Boolean(anchorEl);
  const handleClose = onClose;

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Stack>
          <DieBonus
            bonus={bonus}
            onChange={(bonus) => {
              setBonus(bonus);
              clearRollIfNeeded();
            }}
            onIncrease={() => {
              setBonus(bonus + 1);
              clearRollIfNeeded();
            }}
            onDecrease={() => {
              setBonus(bonus - 1);
              clearRollIfNeeded();
            }}
          />
          <Divider variant="middle" />
          <DieAdvantage
            advantage={advantage}
            onChange={(advantage) => {
              setAdvantage(advantage);
              clearRollIfNeeded();
            }}
          />
        </Stack>
      </Menu>
    </>
  );
}
