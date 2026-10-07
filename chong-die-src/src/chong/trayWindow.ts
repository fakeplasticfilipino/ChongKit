import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../plugin/getPluginId";

/** The dice tray: a second window of Chong Die (the toolbar button opens the Rolls window) */
export const TRAY_ID = getPluginId("tray");
export const SIDEBAR_WIDTH = 60;
const TRAY_HEIGHT = 700;
// Below Owlbear's top bar, clear of the screen's right edge
const TOP = 64;
const MARGIN = 16;

/** The tray's width for a height: the tray is twice as tall as wide, plus the sidebar */
export const trayWidth = (height: number) => height / 2 + SIDEBAR_WIDTH;

export async function isTrayOpen(): Promise<boolean> {
  return (await OBR.popover.getWidth(TRAY_ID)) !== undefined;
}

// The open in progress, so two rolls at once open the tray once
let opening: Promise<void> | null = null;

/** Opens the tray at the top right; does nothing when it's open (opening again would reload it mid-roll) */
export function openTray(): Promise<void> {
  if (!opening) {
    opening = openClosedTray().finally(() => {
      opening = null;
    });
  }
  return opening;
}

async function openClosedTray(): Promise<void> {
  if (await isTrayOpen()) {
    return;
  }
  const [width, height] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
  const trayHeight = Math.min(TRAY_HEIGHT, height - TOP - MARGIN);
  await OBR.popover.open({
    id: TRAY_ID,
    url: "/ChongKit/chong-die/tray.html",
    height: trayHeight,
    width: trayWidth(trayHeight),
    anchorReference: "POSITION",
    anchorPosition: { left: width - MARGIN, top: TOP },
    anchorOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    transformOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    // Clicking the map mustn't close the tray mid-roll: it closes from its own × or the Rolls window
    disableClickAway: true,
  });
}

export function closeTray(): Promise<void> {
  return OBR.popover.close(TRAY_ID);
}
