import { useState } from "react";

import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";

import { parseCommand } from "../roll";
import { useChongStore } from "./chongStore";
import { sendRoll } from "./sendRoll";

/** The `!r` box at the top of the Rolls window: Enter rolls on the tray */
export function CommandLine() {
  const text = useChongStore((state) => state.draft);
  const setText = useChongStore((state) => state.setDraft);
  // Position while stepping through history with ↑ / ↓ (null = typing)
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const history = useChongStore((state) => state.saved.history);
  const error = useChongStore((state) => state.error);
  const setError = useChongStore((state) => state.setError);
  const recordHistory = useChongStore((state) => state.recordHistory);

  function roll() {
    const command = text.trim();
    if (!command) {
      return;
    }
    try {
      // A typo shows here instead of going to the tray
      parseCommand(command);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Can't roll this");
      return;
    }
    sendRoll(command, false);
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
    <Box component="div" sx={{ p: 1.5, pb: 0.5 }}>
      <Box
        component="div"
        sx={{
          display: "flex",
          alignItems: "center",
          height: 40,
          px: 1.5,
          borderRadius: "20px",
          bgcolor: "background.default",
          border: 1,
          borderColor: error ? "error.main" : "divider",
        }}
      >
        <InputBase
          fullWidth
          autoFocus
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
      {error && (
        <Typography variant="caption" color="error" role="alert" sx={{ display: "block", px: 1.5, pt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
