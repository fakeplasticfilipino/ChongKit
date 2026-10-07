/** The Rolls panel docked to the right of the tray: tabs, dice and pills */
export const PANEL_WIDTH = 360;
/** The command line on top of the tray (its box is 32 px, with 8 px around it, + a little air) */
export const COMMAND_LINE_HEIGHT = 52;

/** The window's width: a tray half as wide as it is tall, + the panel when it's open */
export function windowWidth(height: number, panelOpen: boolean): number {
  return height / 2 + (panelOpen ? PANEL_WIDTH : 0);
}

/** How long the Rolls panel takes to fade in or out (the window itself resizes in one step) */
export const PANEL_FADE_MS = 120;
