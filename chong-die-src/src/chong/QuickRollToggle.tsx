import BoltIcon from "@mui/icons-material/BoltRounded";

import { usePrefsStore } from "./prefsStore";
import { TrayButton } from "./TrayButton";

/** Beside the command line: Quick roll, custom rolls throw at once instead of waiting to be held */
export function QuickRollToggle() {
  const on = usePrefsStore((state) => state.prefs.quickRoll);
  const setQuickRoll = usePrefsStore((state) => state.setQuickRoll);
  return (
    <TrayButton title="Quick roll" pressed={on} onClick={() => setQuickRoll(!on)}>
      <BoltIcon />
    </TrayButton>
  );
}
