/**
 * Chong's Tracker look (Owlbear's own panels): translucent white surfaces on Owlbear's glass
 * popover, no outlines, 8 px corners, Owlbear's purple for what's on.
 */
export const FIELD = "rgba(255, 255, 255, 0.08)";
export const HOVER = "rgba(255, 255, 255, 0.14)";
export const LINE = "rgba(255, 255, 255, 0.08)";
export const TEXT2 = "rgba(255, 255, 255, 0.7)";
export const MUTED = "rgba(255, 255, 255, 0.45)";

/** A flat chip: dice pills, saved-roll pills and the + after them */
export const pillSx = {
  height: 30,
  borderRadius: "8px",
  bgcolor: FIELD,
  border: 0,
  fontSize: 13,
  "&:hover": { bgcolor: HOVER },
  "& .MuiChip-label": { px: 1.5 },
} as const;
