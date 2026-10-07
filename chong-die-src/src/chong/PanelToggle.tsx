import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import RollsIcon from "@mui/icons-material/ListAltRounded";

import { usePrefsStore } from "./prefsStore";

/** Sidebar button: opens or closes the Rolls panel docked beside the tray */
export function PanelToggle() {
  const open = usePrefsStore((state) => state.prefs.panelOpen);
  const setPanelOpen = usePrefsStore((state) => state.setPanelOpen);
  return (
    <Tooltip title="Rolls" placement="top" disableInteractive>
      <IconButton
        aria-label="Rolls"
        aria-pressed={open}
        color={open ? "primary" : "default"}
        onClick={() => setPanelOpen(!open)}
      >
        <RollsIcon />
      </IconButton>
    </Tooltip>
  );
}
