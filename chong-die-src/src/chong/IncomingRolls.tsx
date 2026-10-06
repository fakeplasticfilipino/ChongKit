import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";

import { CHANNELS, RollMessage } from "./channels";
import { createRunDeduper, handleIncomingRoll } from "./incoming";

/** Takes rolls from Chong's Tracker (forwarded by the background page) */
export function IncomingRolls() {
  useEffect(() => {
    const isNew = createRunDeduper();
    return OBR.broadcast.onMessage(CHANNELS.run, (event) => {
      const msg = event.data as RollMessage | undefined;
      if (!msg || typeof msg.id !== "string" || typeof msg.command !== "string") {
        return;
      }
      OBR.broadcast.sendMessage(CHANNELS.runAck, { id: msg.id }, { destination: "LOCAL" });
      if (isNew(msg.id)) {
        handleIncomingRoll(msg.command);
      }
    });
  }, []);
  return null;
}
