import Typography from "@mui/material/Typography";

import { useTrayStore } from "./trayStore";

/** Why the tray couldn't roll what it was sent, at the top of the tray until the next roll */
export function TrayError() {
  const error = useTrayStore((state) => state.error);
  if (!error) {
    return null;
  }
  return (
    <Typography
      variant="caption"
      color="error"
      role="alert"
      sx={{
        position: "absolute",
        top: 8,
        left: 8,
        right: 8,
        zIndex: 2,
        px: 1.5,
        py: 0.5,
        bgcolor: "background.paper",
        borderRadius: 1,
      }}
    >
      {error}
    </Typography>
  );
}
