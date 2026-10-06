import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import RollsIcon from "@mui/icons-material/ListAltRounded";

import { useChongStore } from "./chongStore";

/** Sidebar button that shows or hides the saved-rolls panel */
export function PanelToggle() {
  const open = useChongStore((state) => state.panelOpen);
  const setPanelOpen = useChongStore((state) => state.setPanelOpen);
  return (
    <Tooltip title="Rolls" placement="top" disableInteractive>
      <IconButton
        onClick={() => setPanelOpen(!open)}
        color={open ? "primary" : "default"}
        aria-pressed={open}
      >
        <RollsIcon />
      </IconButton>
    </Tooltip>
  );
}
