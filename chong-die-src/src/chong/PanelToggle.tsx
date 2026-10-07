import RollsIcon from "@mui/icons-material/ListAltRounded";

import { usePrefsStore } from "./prefsStore";
import { TrayButton } from "./TrayButton";

/** Beside the command line: opens or closes the Rolls panel docked to the right of the tray */
export function PanelToggle() {
  const open = usePrefsStore((state) => state.prefs.panelOpen);
  const setPanelOpen = usePrefsStore((state) => state.setPanelOpen);
  return (
    <TrayButton title="Rolls" pressed={open} onClick={() => setPanelOpen(!open)}>
      <RollsIcon />
    </TrayButton>
  );
}
