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
import { FIELD, HOVER } from "./look";

const PreviewImage = styled("img")({ width: "24px", height: "24px" });

/** Under the dice style button (Rolls tab, Nimble on): the primary die's style */
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
          sx={{
            width: 36,
            height: 36,
            padding: 0,
            borderRadius: "8px",
            bgcolor: FIELD,
            boxShadow: (theme) => `inset 0 0 0 1.5px ${theme.palette.primary.main}`,
            "&:hover": { bgcolor: HOVER },
          }}
        >
          <PreviewImage src={standardPreviews[style]} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
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
