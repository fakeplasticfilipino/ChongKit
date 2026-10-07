import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";

import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { DiceSetPicker } from "../controls/DiceSetPicker";
import { PrimaryDiePicker } from "./PrimaryDiePicker";
import { usePrefsStore } from "./prefsStore";
import { pillSx } from "./look";

/**
 * The top of the Rolls tab: dice style (and primary die, Nimble on) on the left, then a pill per
 * die. Each click puts one more of that die on the tray, to throw with the tray's Roll button.
 */
export function DicePills() {
  const dice = useDiceControlsStore((state) => state.diceSet.dice);
  const counts = useDiceControlsStore((state) => state.diceCounts);
  const increment = useDiceControlsStore((state) => state.incrementDieCount);
  const nimble = usePrefsStore((state) => state.prefs.nimble);

  return (
    <Box component="div" sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
      <Box component="div" sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <DiceSetPicker />
        {nimble && <PrimaryDiePicker />}
      </Box>
      <Box component="div" sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, flex: 1 }}>
        {dice.map((die) => {
          const count = counts[die.id] || 0;
          return (
            <Chip
              key={die.id}
              aria-label={`Add a ${die.type.toLowerCase()}`}
              label={
                <span>
                  {die.type.toLowerCase()}
                  {count > 0 && (
                    <Typography component="span" color="primary" sx={{ ml: 0.75, fontSize: 12, fontWeight: 500 }}>
                      ×{count}
                    </Typography>
                  )}
                </span>
              }
              onClick={() => {
                increment(die.id);
                // A finished roll on the tray makes way for the new dice
                const { roll, clearRoll } = useDiceRollStore.getState();
                if (roll) {
                  clearRoll();
                }
              }}
              sx={pillSx}
            />
          );
        })}
      </Box>
    </Box>
  );
}
