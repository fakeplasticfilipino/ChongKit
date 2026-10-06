import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { useChongStore } from "./chongStore";

/** Nimble rules on/off: the primary die explodes on its max, a 1 on it is a miss */
export function NimbleToggle() {
  const nimble = useChongStore((state) => state.prefs.nimble);
  const setNimble = useChongStore((state) => state.setNimble);
  return (
    <Tooltip title={nimble ? "Nimble rules: on" : "Nimble rules: off"} placement="top" disableInteractive>
      <IconButton
        aria-label="Nimble rules"
        aria-pressed={nimble}
        onClick={() => setNimble(!nimble)}
        color={nimble ? "primary" : "default"}
        sx={{ width: 40, height: 40, opacity: nimble ? 1 : 0.6 }}
      >
        <Typography component="span" sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>
          N
        </Typography>
      </IconButton>
    </Tooltip>
  );
}
