import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import { useEffect, useState } from "react";

import { InteractiveTray } from "./tray/InteractiveTray";
import { RollPanel } from "./chong/RollPanel";
import { IncomingRolls } from "./chong/IncomingRolls";
import { usePrefsStore } from "./chong/prefsStore";
import { PANEL_GLIDE_MS, PANEL_WIDTH } from "./chong/layout";
import { LINE } from "./chong/look";

import { PluginGate } from "./plugin/PluginGate";
import { DiceRollSync } from "./plugin/DiceRollSync";
import { PartyTrays } from "./plugin/PartyTrays";
import { ResizeObserver as PluginResizeObserver } from "./plugin/ResizeObserver";

export function App() {
  const panelOpen = usePrefsStore((state) => state.prefs.panelOpen);
  // The panel stays until the window has glided narrow again, so closing doesn't cut it off
  const [panelShown, setPanelShown] = useState(panelOpen);
  useEffect(() => {
    if (panelOpen) {
      setPanelShown(true);
      return;
    }
    const timeout = setTimeout(() => setPanelShown(false), PANEL_GLIDE_MS + 50);
    return () => clearTimeout(timeout);
  }, [panelOpen]);

  return (
    <Stack direction="row" sx={{ height: "100vh", "& > *": { flexShrink: 0 } }}>
      <InteractiveTray />
      {/* The Rolls panel docks to the right: tabs, the dice and your pills.
          The window glides wider to show it (ResizeObserver); the tray never shrinks */}
      {(panelOpen || panelShown) && (
        <Box
          component="div"
          sx={{
            width: PANEL_WIDTH,
            minWidth: PANEL_WIDTH,
            display: "flex",
            borderLeft: `1px solid ${LINE}`,
          }}
        >
          <RollPanel />
        </Box>
      )}
      {/* Owlbear plumbing: runs with the panel closed too */}
      <PluginGate>
        <DiceRollSync />
        <PartyTrays />
        <IncomingRolls />
        <PluginResizeObserver />
      </PluginGate>
    </Stack>
  );
}
