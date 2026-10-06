import { useRef, useState } from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

import MoreIcon from "@mui/icons-material/MoreVertRounded";
import CheckIcon from "@mui/icons-material/CheckRounded";

import { useChongStore } from "./chongStore";
import { importSaved, SavedRolls } from "./savedRolls";
import { ConfirmDialog } from "./ConfirmDialog";

/** ⋯ menu: Nimble rules on/off, export / import saved rolls, about */
export function MoreMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pending, setPending] = useState<SavedRolls | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const setError = useChongStore((state) => state.setError);
  const replaceSaved = useChongStore((state) => state.replaceSaved);
  const nimble = useChongStore((state) => state.prefs.nimble);
  const setNimble = useChongStore((state) => state.setNimble);

  function exportRolls() {
    const saved = useChongStore.getState().saved;
    const blob = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chong-die-rolls.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importFile(file: File) {
    try {
      setPending(importSaved(await file.text()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not a Chong Die file");
    }
  }

  return (
    <>
      <IconButton size="small" aria-label="More" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreIcon />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem
          role="menuitemcheckbox"
          aria-checked={nimble}
          onClick={() => {
            setNimble(!nimble);
            setAnchor(null);
          }}
        >
          <ListItemIcon>{nimble && <CheckIcon fontSize="small" />}</ListItemIcon>
          Nimble rules
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            exportRolls();
            setAnchor(null);
          }}
        >
          Export rolls
        </MenuItem>
        <MenuItem
          onClick={() => {
            fileRef.current?.click();
            setAnchor(null);
          }}
        >
          Import rolls
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAboutOpen(true);
            setAnchor(null);
          }}
        >
          About
        </MenuItem>
      </Menu>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            importFile(file);
          }
          e.target.value = "";
        }}
      />
      <ConfirmDialog
        open={pending !== null}
        title="Replace all your saved rolls with this file?"
        confirmLabel="Replace"
        onConfirm={() => pending && replaceSaved(pending)}
        onClose={() => setPending(null)}
      />
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} maxWidth="xs">
        <DialogTitle>Chong Die</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Based on{" "}
            <Link href="https://github.com/owlbear-rodeo/dice" target="_blank" rel="noopener">
              Owlbear Rodeo Dice
            </Link>{" "}
            (GPL-3.0).
          </Typography>
          <Typography variant="body2">
            <Link
              href="https://github.com/fakeplasticfilipino/ChongKit/tree/main/chong-die-src"
              target="_blank"
              rel="noopener"
            >
              Source
            </Link>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
