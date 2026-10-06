import { useState } from "react";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import StarIcon from "@mui/icons-material/StarRounded";

import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { useChongStore } from "./chongStore";
import { startCommandRoll } from "./rollRunner";
import { PillDialog } from "./PillDialog";

export const COMMAND_LINE_HEIGHT = 52;

/** Always-visible `!r` box at the top of the tray */
export function CommandLine() {
  const theme = useTheme();
  const [text, setText] = useState("");
  // Position while stepping through history with ↑ / ↓ (null = typing)
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const history = useChongStore((state) => state.saved.history);
  const error = useChongStore((state) => state.error);
  const setError = useChongStore((state) => state.setError);
  const setPanelOpen = useChongStore((state) => state.setPanelOpen);
  const activeTabId = useChongStore((state) => state.activeTabId);
  const addPill = useChongStore((state) => state.addPill);
  const hidden = useDiceControlsStore((state) => state.diceHidden);

  const rolling = useDiceRollStore((state) =>
    Object.values(state.rollValues).some((v) => v === null)
  );

  function roll() {
    if (!text.trim()) {
      return;
    }
    try {
      startCommandRoll(text, { hidden });
      setText("");
      setHistoryIndex(null);
      setError(null);
      setPanelOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Can't roll this");
    }
  }

  function step(direction: -1 | 1) {
    if (history.length === 0) {
      return;
    }
    const current = historyIndex === null ? history.length : historyIndex;
    const next = Math.max(0, Math.min(history.length, current + direction));
    setHistoryIndex(next === history.length ? null : next);
    setText(next === history.length ? "" : history[next]);
  }

  return (
    <Box
      component="div"
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3,
        p: 1,
        opacity: rolling ? 0.4 : 1,
        transition: theme.transitions.create("opacity"),
        ":hover, :focus-within": { opacity: 1 },
      }}
    >
      <Box
        component="div"
        sx={{
          display: "flex",
          alignItems: "center",
          height: COMMAND_LINE_HEIGHT - 16,
          pl: 1.5,
          borderRadius: "18px",
          bgcolor: "background.paper",
          border: 1,
          borderColor: error ? "error.main" : "divider",
        }}
      >
        <InputBase
          fullWidth
          placeholder="!r 1d20+5"
          value={text}
          inputProps={{ "aria-label": "Roll command", spellCheck: false }}
          onChange={(e) => {
            setText(e.target.value);
            setHistoryIndex(null);
            if (error) {
              setError(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              roll();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              step(-1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              step(1);
            }
          }}
          sx={{ fontFamily: "monospace" }}
        />
        <Tooltip title="Save as a pill" disableInteractive>
          <span>
            <IconButton
              size="small"
              disabled={!text.trim()}
              onClick={() => setSaving(true)}
            >
              <StarIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ display: "block", px: 1.5, pt: 0.5, bgcolor: "background.paper", borderRadius: 1 }}
        >
          {error}
        </Typography>
      )}
      <PillDialog
        open={saving}
        title="Save roll"
        initialName={text.trim()}
        initialCommand={text.trim()}
        onClose={() => setSaving(false)}
        onSave={(name, command) => {
          addPill(activeTabId, name, command);
          setSaving(false);
        }}
      />
    </Box>
  );
}
