/** Upstream's sidebar beside the tray */
export const SIDEBAR_WIDTH = 60;
/** The Rolls panel docked to the right of the tray */
export const PANEL_WIDTH = 300;

/** The window's width: sidebar + a tray half as wide as it is tall, + the panel when it's open */
export function windowWidth(height: number, panelOpen: boolean): number {
  return height / 2 + SIDEBAR_WIDTH + (panelOpen ? PANEL_WIDTH : 0);
}
