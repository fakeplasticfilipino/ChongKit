import { useState } from "react";

import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";

import { standardPreviews } from "../sets/diceSets";
import { useDiceControlsStore } from "../controls/store";
import { usePrefsStore } from "./prefsStore";
import { resolvePrimaryStyle, STYLES } from "./prefs";

const PreviewImage = styled("img")({ width: "24px", height: "24px" });

/** Sidebar button (under the dice style picker) choosing the primary die's style */
export function PrimaryDiePicker() {
  const choice = usePrefsStore((state) => state.prefs.primaryStyle);
  const setPrimaryStyle = usePrefsStore((state) => state.setPrimaryStyle);
  const diceStyle = useDiceControlsStore((state) => state.diceSet.dice[0].style);
  const style = resolvePrimaryStyle(choice, diceStyle);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title="Primary die" placement="top" disableInteractive>
        <IconButton
          aria-label="Primary die"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ padding: "6px", border: 1, borderColor: "primary.main" }}
        >
          <PreviewImage src={standardPreviews[style]} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ my: 1 }}
        marginThreshold={0}
      >
        <Stack gap={1} alignItems="center" p="2px">
          {STYLES.map((s) => (
            <IconButton
              key={s}
              aria-label={s.toLowerCase()}
              onClick={() => {
                setPrimaryStyle(s);
                setAnchorEl(null);
              }}
              sx={{
                padding: "4px",
                backgroundColor: s === style ? "rgba(255, 255, 255, 0.16) !important" : undefined,
              }}
            >
              <PreviewImage src={standardPreviews[s]} sx={{ width: 32, height: 32 }} />
            </IconButton>
          ))}
        </Stack>
      </Menu>
    </>
  );
}
