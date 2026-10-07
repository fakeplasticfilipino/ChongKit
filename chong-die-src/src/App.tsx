import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";

import { InteractiveTray } from "./tray/InteractiveTray";
import { Sidebar } from "./controls/Sidebar";
import { CommandLine } from "./chong/CommandLine";
import { RollPanel } from "./chong/RollPanel";
import { usePrefsStore } from "./chong/prefsStore";
import { PANEL_WIDTH } from "./chong/layout";

export function App() {
  const panelOpen = usePrefsStore((state) => state.prefs.panelOpen);
  return (
    <Stack direction="row" sx={{ height: "100vh" }}>
      <Sidebar />
      <InteractiveTray />
      {/* The Rolls panel docks to the right; the window widens to fit it (ResizeObserver) */}
      {panelOpen && (
        <Box
          component="div"
          sx={{
            width: PANEL_WIDTH,
            minWidth: PANEL_WIDTH,
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
            borderLeft: 1,
            borderColor: "divider",
          }}
        >
          <CommandLine />
          <RollPanel />
        </Box>
      )}
    </Stack>
  );
}
