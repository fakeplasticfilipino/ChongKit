import React from "react";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

/** A round button floating on the tray beside the command line, like Owlbear's map buttons */
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
          width: 36,
          height: 36,
          flexShrink: 0,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          "&:hover": { bgcolor: "background.paper", borderColor: "text.secondary" },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}
