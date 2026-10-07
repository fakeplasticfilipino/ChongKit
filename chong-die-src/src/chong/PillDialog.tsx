import { useEffect, useState } from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";

import { pillError } from "./savedRolls";

/** Name and command of a pill, for saving a new one or editing one */
export function PillDialog({
  open,
  title,
  initialName,
  initialCommand,
  initialDescription = "",
  onSave,
  onClose,
}: {
  open: boolean;
  title: string;
  initialName: string;
  initialCommand: string;
  initialDescription?: string;
  onSave: (name: string, command: string, description: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [command, setCommand] = useState(initialCommand);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setCommand(initialCommand);
      setDescription(initialDescription);
    }
  }, [open, initialName, initialCommand, initialDescription]);

  const error = command.trim()
    ? pillError({ id: "", name, command })
    : "Type a roll";

  function save() {
    if (!error) {
      onSave(name.trim() || command.trim(), command.trim(), description.trim());
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <TextField
          margin="dense"
          label="Roll"
          fullWidth
          value={command}
          error={Boolean(error)}
          helperText={error || " "}
          inputProps={{ spellCheck: false, style: { fontFamily: "monospace" } }}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <TextField
          margin="dense"
          label="Description"
          fullWidth
          multiline
          minRows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={Boolean(error)} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
