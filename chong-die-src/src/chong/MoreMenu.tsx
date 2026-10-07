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

import ListSubheader from "@mui/material/ListSubheader";

import MoreIcon from "@mui/icons-material/MoreVertRounded";
import CheckIcon from "@mui/icons-material/CheckRounded";
import HiddenIcon from "@mui/icons-material/VisibilityOffRounded";
import BonusIcon from "@mui/icons-material/ExposureRounded";
import HistoryIcon from "@mui/icons-material/HistoryRounded";
import PersonIcon from "@mui/icons-material/PersonRounded";
import ExportIcon from "@mui/icons-material/FileDownloadRounded";
import ImportIcon from "@mui/icons-material/FileUploadRounded";
import AboutIcon from "@mui/icons-material/InfoOutlined";

import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { DiceExtrasMenu } from "../controls/DiceExtras";
import { DiceHistoryMenu } from "../controls/DiceHistory";
import { usePartyStore } from "./partyStore";
import { usePrefsStore } from "./prefsStore";

import { useChongStore } from "./chongStore";
import { importSaved, SavedRolls } from "./savedRolls";
import { ConfirmDialog } from "./ConfirmDialog";

/** ⋯ menu: the dice settings (hide, bonus / advantage, history, players' trays), Nimble rules, export / import, about */
export function MoreMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pending, setPending] = useState<SavedRolls | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const setError = useChongStore((state) => state.setError);
  const replaceSaved = useChongStore((state) => state.replaceSaved);
  const nimble = usePrefsStore((state) => state.prefs.nimble);
  const setNimble = usePrefsStore((state) => state.setNimble);
  const hidden = useDiceControlsStore((state) => state.diceHidden);
  const toggleDiceHidden = useDiceControlsStore((state) => state.toggleDiceHidden);
  const players = usePartyStore((state) => state.players);
  const setFocused = usePartyStore((state) => state.setFocused);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // A second menu opened from this one, anchored on the ⋯ button
  const [sub, setSub] = useState<"extras" | "history" | null>(null);

  function clearRollIfNeeded() {
    const { roll, clearRoll } = useDiceRollStore.getState();
    if (roll) {
      clearRoll();
    }
  }

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
      <IconButton ref={buttonRef} size="small" aria-label="More" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          role="menuitemcheckbox"
          aria-checked={hidden}
          onClick={() => {
            toggleDiceHidden();
            clearRollIfNeeded();
            setAnchor(null);
          }}
        >
          <ListItemIcon>{hidden ? <CheckIcon fontSize="small" /> : <HiddenIcon fontSize="small" />}</ListItemIcon>
          Hide rolls
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setSub("extras");
          }}
        >
          <ListItemIcon>
            <BonusIcon fontSize="small" />
          </ListItemIcon>
          Bonus and advantage
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setSub("history");
          }}
        >
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          Roll history
        </MenuItem>
        {players.length > 0 && <ListSubheader sx={{ bgcolor: "transparent", lineHeight: "32px" }}>Players' trays</ListSubheader>}
        {players.map((player) => (
          <MenuItem
            key={player.connectionId}
            onClick={() => {
              setFocused(player.connectionId);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              <PersonIcon fontSize="small" sx={{ color: player.color }} />
            </ListItemIcon>
            {player.name}
          </MenuItem>
        ))}
        <Divider />
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
          <ListItemIcon>
            <ExportIcon fontSize="small" />
          </ListItemIcon>
          Export rolls
        </MenuItem>
        <MenuItem
          onClick={() => {
            fileRef.current?.click();
            setAnchor(null);
          }}
        >
          <ListItemIcon>
            <ImportIcon fontSize="small" />
          </ListItemIcon>
          Import rolls
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAboutOpen(true);
            setAnchor(null);
          }}
        >
          <ListItemIcon>
            <AboutIcon fontSize="small" />
          </ListItemIcon>
          About
        </MenuItem>
      </Menu>
      <DiceExtrasMenu anchorEl={sub === "extras" ? buttonRef.current : null} onClose={() => setSub(null)} />
      <DiceHistoryMenu anchorEl={sub === "history" ? buttonRef.current : null} onClose={() => setSub(null)} />
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
