import BoltIcon from "@mui/icons-material/BoltRounded";

import { useChongStore } from "./chongStore";
import { TrayButton } from "./TrayButton";

/** Beside the command line: quick roll, the open tab's Instant switch (pills roll now, or place their dice) */
export function InstantToggle() {
  const tabs = useChongStore((state) => state.saved.tabs);
  const activeTabId = useChongStore((state) => state.activeTabId);
  const setInstant = useChongStore((state) => state.setInstant);
  const tab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  return (
    <TrayButton title="Quick roll" pressed={tab.instant} onClick={() => setInstant(tab.id, !tab.instant)}>
      <BoltIcon />
    </TrayButton>
  );
}
