import SimpleBar from "simplebar-react";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";

import { DiceSetPicker } from "./DiceSetPicker";
import { DicePicker } from "./DicePicker";
import { DiceExtras } from "./DiceExtras";
import { DiceHidden } from "./DiceHidden";
import { DiceHistory } from "./DiceHistory";
import { PrimaryDiePicker } from "../chong/PrimaryDiePicker";
import { usePrefsStore } from "../chong/prefsStore";
import { SIDEBAR_WIDTH } from "../chong/layout";
import { useTheme } from "@mui/material/styles";

import { FairnessTesterButton } from "../tests/FairnessTesterButton";

import { PluginGate } from "../plugin/PluginGate";
import { PartyTrays } from "../plugin/PartyTrays";


/** Upstream's dice sidebar, on the left edge of the Rolls panel */
export function Sidebar() {
  // The primary die only matters with Nimble rules on (⋯ menu in the Rolls panel)
  const nimble = usePrefsStore((state) => state.prefs.nimble);
  const theme = useTheme();
  return (
    <SimpleBar
      style={{
        maxHeight: "100vh",
        width: SIDEBAR_WIDTH,
        minWidth: SIDEBAR_WIDTH,
        borderRight: `1px solid ${theme.palette.divider}`,
        overflowY: "auto",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Stack p={1} gap={1} alignItems="center">
        <DiceSetPicker />
        {nimble && <PrimaryDiePicker />}
        <Divider flexItem sx={{ mx: 1 }} />
        <DicePicker />
        <Divider flexItem sx={{ mx: 1 }} />
        <DiceHidden />
        <DiceExtras />
        <DiceHistory />
        <FairnessTesterButton />
        {/* Other players' trays */}
        <PluginGate>
          <Divider flexItem sx={{ mx: 1 }} />
          <PartyTrays />
        </PluginGate>
      </Stack>
    </SimpleBar>
  );
}
