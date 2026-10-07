import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";

import { InteractiveTray } from "./tray/InteractiveTray";
import { Sidebar } from "./controls/Sidebar";
import { RollPanel } from "./chong/RollPanel";
import { IncomingRolls } from "./chong/IncomingRolls";
import { usePrefsStore } from "./chong/prefsStore";
import { PANEL_WIDTH } from "./chong/layout";

import { PluginGate } from "./plugin/PluginGate";
import { DiceRollSync } from "./plugin/DiceRollSync";
import { ResizeObserver as PluginResizeObserver } from "./plugin/ResizeObserver";

export function App() {
  const panelOpen = usePrefsStore((state) => state.prefs.panelOpen);
  return (
    <Stack direction="row" sx={{ height: "100vh" }}>
      <InteractiveTray />
      {/* The Rolls panel docks to the right: the dice sidebar, then tabs and pills.
          The window widens to fit it (ResizeObserver) */}
      {panelOpen && (
        <Box
          component="div"
          sx={{
            width: PANEL_WIDTH,
            minWidth: PANEL_WIDTH,
            display: "flex",
            bgcolor: "background.paper",
            borderLeft: 1,
            borderColor: "divider",
          }}
        >
          <Sidebar />
          <RollPanel />
        </Box>
      )}
      {/* Owlbear plumbing: runs with the panel closed too */}
      <PluginGate>
        <DiceRollSync />
        <IncomingRolls />
        <PluginResizeObserver />
      </PluginGate>
    </Stack>
  );
}
