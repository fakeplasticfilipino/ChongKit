import { useState } from "react";

import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { useChongStore } from "./chongStore";
import { startCommandRoll } from "./rollRunner";
import { InstantToggle } from "./InstantToggle";
import { PanelToggle } from "./PanelToggle";
import { COMMAND_LINE_HEIGHT } from "./layout";

/** The `!r` box always on top of the tray, with quick roll and Rolls beside it: Enter rolls */
export function CommandLine() {
  const theme = useTheme();
  const rolling = useDiceRollStore((state) =>
    Object.values(state.rollValues).some((v) => v === null)
  );
  const text = useChongStore((state) => state.draft);
  const setText = useChongStore((state) => state.setDraft);
  // Position while stepping through history with ↑ / ↓ (null = typing)
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const history = useChongStore((state) => state.saved.history);
  const error = useChongStore((state) => state.error);
  const setError = useChongStore((state) => state.setError);
  const recordHistory = useChongStore((state) => state.recordHistory);
  const hidden = useDiceControlsStore((state) => state.diceHidden);

  function roll() {
    const command = text.trim();
    if (!command) {
      return;
    }
    try {
      // A typo shows here and nothing rolls
      startCommandRoll(command, { hidden });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Can't roll this");
      return;
    }
    recordHistory(command);
    setText("");
    setHistoryIndex(null);
    setError(null);
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
        // Out of the way while dice roll; back when you point at it
        opacity: rolling ? 0.4 : 1,
        transition: theme.transitions.create("opacity"),
        ":hover, :focus-within": { opacity: 1 },
      }}
    >
      <Box component="div" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
            height: COMMAND_LINE_HEIGHT - 16,
            px: 1.5,
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
        </Box>
        <InstantToggle />
        <PanelToggle />
      </Box>
      {error && (
        <Typography
          variant="caption"
          color="error"
          role="alert"
          sx={{ display: "block", mt: 0.5, px: 1.5, py: 0.25, bgcolor: "background.paper", borderRadius: 1 }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
