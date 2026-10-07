import { useState } from "react";

import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { useChongStore } from "./chongStore";
import { placeCommand } from "./place";
import { PanelToggle } from "./PanelToggle";
import { COMMAND_LINE_HEIGHT } from "./layout";
import { FIELD, HOVER } from "./look";

/** The command box always on top of the tray, with the Rolls button beside it: Enter puts the roll on the tray */
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
      placeCommand(command, { hidden });
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
      <Box component="div" sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
        <Box
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
            height: COMMAND_LINE_HEIGHT - 20,
            mr: 0.5,
            px: 1.25,
            borderRadius: "8px",
            bgcolor: FIELD,
            // Over the 3D tray: a little blur keeps the text readable
            backdropFilter: "blur(8px)",
            boxShadow: error ? `inset 0 0 0 1px ${theme.palette.error.main}` : "none",
            "&:hover": { bgcolor: HOVER },
            "&:focus-within": {
              bgcolor: HOVER,
              boxShadow: `inset 0 0 0 1px ${error ? theme.palette.error.main : theme.palette.primary.main}`,
            },
          }}
        >
          <InputBase
            fullWidth
            placeholder="1d20+5"
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
            sx={{ fontFamily: "'Roboto Mono', Consolas, monospace", fontSize: 13 }}
          />
        </Box>
        <PanelToggle />
      </Box>
      {error && (
        <Typography
          variant="caption"
          color="error"
          role="alert"
          sx={{ display: "block", mt: 0.5, px: 1.25, py: 0.25, bgcolor: FIELD, backdropFilter: "blur(8px)", borderRadius: "8px" }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
