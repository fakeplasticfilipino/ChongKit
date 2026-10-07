import OBR from "@owlbear-rodeo/sdk";

import { CHANNELS, RollMessage } from "./channels";

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * Hand a command to this player's own Chong Die background, which opens the tray and rolls it
 * (`place`: put its dice on the tray to throw instead). Nothing happens outside Owlbear.
 */
export function sendRoll(command: string, place: boolean): void {
  if (!OBR.isAvailable) {
    return;
  }
  const msg: RollMessage = { id: newId(), command, place };
  OBR.broadcast.sendMessage(CHANNELS.roll, msg, { destination: "LOCAL" }).catch(() => {});
}
