import { useEffect } from "react";

import Box from "@mui/material/Box";

import { CommandLine } from "./CommandLine";
import { RollPanel } from "./RollPanel";
import { listenForPrefChanges } from "./prefsStore";

/** The Rolls window (the toolbar button): command line, then tabs of saved rolls */
export function RollsApp() {
  // The primary die style is chosen on the tray
  useEffect(() => listenForPrefChanges(), []);
  return (
    <Box component="div" sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <CommandLine />
      <RollPanel />
    </Box>
  );
}
