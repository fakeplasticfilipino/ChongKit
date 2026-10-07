import React from "react";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import { HOVER, TEXT2 } from "./look";

/** A round icon button beside the command line, like Chong's Tracker's (transparent, purple when on) */
export function TrayButton({
  title,
  pressed,
  onClick,
  children,
}: {
  title: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={title} disableInteractive>
      <IconButton
        aria-label={title}
        aria-pressed={pressed}
        color={pressed ? "primary" : "default"}
        onClick={onClick}
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          color: pressed ? "primary.main" : TEXT2,
          "&:hover": { bgcolor: HOVER, color: pressed ? "primary.main" : "text.primary" },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}
