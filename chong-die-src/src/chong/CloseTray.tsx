import { useEffect } from "react";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import CloseIcon from "@mui/icons-material/CloseRounded";

import { listenForPrefChanges } from "./prefsStore";
import { closeTray } from "./trayWindow";

/** Closes the tray window (it doesn't close by clicking the map, so a roll can't be cut short) */
export function CloseTray() {
  // Nimble switched in the Rolls window applies to dice picked here too
  useEffect(() => listenForPrefChanges(), []);
  return (
    <Tooltip title="Close" placement="top" disableInteractive>
      <IconButton aria-label="Close" onClick={() => closeTray()}>
        <CloseIcon />
      </IconButton>
    </Tooltip>
  );
}
