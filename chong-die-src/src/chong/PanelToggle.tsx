import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import RollsIcon from "@mui/icons-material/ListAltRounded";

import { useChongStore } from "./chongStore";

/** Shows or hides the saved-rolls panel (in the sidebar and at the end of the command line) */
export function PanelToggle({ size = "medium" }: { size?: "small" | "medium" }) {
  const open = useChongStore((state) => state.panelOpen);
  const setPanelOpen = useChongStore((state) => state.setPanelOpen);
  return (
    <Tooltip title="Rolls" placement="top" disableInteractive>
      <IconButton
        size={size}
        aria-label="Rolls"
        onClick={() => setPanelOpen(!open)}
        color={open ? "primary" : "default"}
        aria-pressed={open}
      >
        <RollsIcon />
      </IconButton>
    </Tooltip>
  );
}
