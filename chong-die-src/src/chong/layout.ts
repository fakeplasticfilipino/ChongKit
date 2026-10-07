/** Upstream's dice sidebar, now on the left edge of the Rolls panel */
export const SIDEBAR_WIDTH = 60;
/** The Rolls panel docked to the right of the tray: the dice sidebar + tabs and pills */
export const PANEL_WIDTH = SIDEBAR_WIDTH + 300;
/** The command line on top of the tray (its box is 36 px, with 8 px around it) */
export const COMMAND_LINE_HEIGHT = 52;

/** The window's width: a tray half as wide as it is tall, + the panel when it's open */
export function windowWidth(height: number, panelOpen: boolean): number {
  return height / 2 + (panelOpen ? PANEL_WIDTH : 0);
}
