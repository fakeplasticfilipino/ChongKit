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
import { IncomingRolls } from "../chong/IncomingRolls";
import { CloseTray } from "../chong/CloseTray";

import { FairnessTesterButton } from "../tests/FairnessTesterButton";

import { PluginGate } from "../plugin/PluginGate";
import { DiceRollSync } from "../plugin/DiceRollSync";
import { PartyTrays } from "../plugin/PartyTrays";
import { ResizeObserver as PluginResizeObserver } from "../plugin/ResizeObserver";

export function Sidebar() {
  // The primary die only matters with Nimble rules on (⋯ menu in the Rolls window)
  const nimble = usePrefsStore((state) => state.prefs.nimble);
  return (
    <SimpleBar
      style={{
        maxHeight: "100vh",
        width: "60px",
        minWidth: "60px",
        overflowY: "auto",
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
        <PluginGate>
          <Divider flexItem sx={{ mx: 1 }} />
          <DiceRollSync />
          <IncomingRolls />
          <PartyTrays />
          <PluginResizeObserver />
          <CloseTray />
        </PluginGate>
      </Stack>
    </SimpleBar>
  );
}
