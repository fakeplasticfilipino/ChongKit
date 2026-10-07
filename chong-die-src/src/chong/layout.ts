/** The Rolls panel docked to the right of the tray: tabs, dice and pills */
export const PANEL_WIDTH = 360;
/** The command line on top of the tray (its box is 32 px, with 8 px around it, + a little air) */
export const COMMAND_LINE_HEIGHT = 52;

/** The window's width: a tray half as wide as it is tall, + the panel when it's open */
export function windowWidth(height: number, panelOpen: boolean): number {
  return height / 2 + (panelOpen ? PANEL_WIDTH : 0);
}

/** How long the window takes to glide wider or narrower when the Rolls panel opens or closes */
export const PANEL_GLIDE_MS = 220;

/** Ease-out for the glide (t from 0 to 1) */
export function glideEase(t: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}
