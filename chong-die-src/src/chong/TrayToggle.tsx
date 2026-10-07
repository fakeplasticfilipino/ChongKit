import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import TrayIcon from "@mui/icons-material/CasinoRounded";

import { closeTray, isTrayOpen, openTray } from "./trayWindow";

const POLL_MS = 1000;

/** Opens or closes the dice tray (for picking dice by hand); pressed while it's open */
export function TrayToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!OBR.isAvailable) {
      return;
    }
    let stopped = false;
    const check = () => {
      isTrayOpen()
        .then((isOpen) => !stopped && setOpen(isOpen))
        .catch(() => {});
    };
    OBR.onReady(check);
    const timer = window.setInterval(() => OBR.isReady && check(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  function toggle() {
    if (!OBR.isAvailable) {
      return;
    }
    setOpen(!open);
    (open ? closeTray() : openTray()).catch(() => {});
  }

  return (
    <Tooltip title="Tray" disableInteractive>
      <IconButton
        size="small"
        aria-label="Tray"
        aria-pressed={open}
        color={open ? "primary" : "default"}
        onClick={toggle}
      >
        <TrayIcon />
      </IconButton>
    </Tooltip>
  );
}
