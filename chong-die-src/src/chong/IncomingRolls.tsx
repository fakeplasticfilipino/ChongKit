import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";

import { CHANNELS, readRollMessage } from "./channels";
import { createRunDeduper, handleIncomingRoll } from "./incoming";

/** Takes rolls from the Rolls window and Chong's Tracker (forwarded by the background page) */
export function IncomingRolls() {
  useEffect(() => {
    const isNew = createRunDeduper();
    return OBR.broadcast.onMessage(CHANNELS.run, (event) => {
      const msg = readRollMessage(event.data);
      if (!msg) {
        return;
      }
      OBR.broadcast.sendMessage(CHANNELS.runAck, { id: msg.id }, { destination: "LOCAL" });
      if (isNew(msg.id)) {
        handleIncomingRoll(msg.command, msg.place);
      }
    });
  }, []);
  return null;
}
