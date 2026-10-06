import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "./plugin/getPluginId";
import { CHANNELS, RollMessage } from "./chong/channels";

OBR.onReady(() => {
  OBR.popover.open({
    id: getPluginId("popover"),
    url: "/ChongKit/chong-die/popover.html",
    width: 0,
    height: 0,
    anchorOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
    transformOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
    disableClickAway: true,
    hidePaper: true,
    marginThreshold: 0,
  });
});

// Rolls clicked in Chong's Tracker: answer it, open the dice window and hand the command over,
// re-sending until the window says it has it (it may still be loading).
const RESEND_MS = 250;
const GIVE_UP_MS = 3000;

OBR.onReady(() => {
  OBR.broadcast.onMessage(CHANNELS.roll, (event) => {
    const msg = event.data as RollMessage | undefined;
    if (!msg || typeof msg.id !== "string" || typeof msg.command !== "string") {
      return;
    }
    OBR.broadcast.sendMessage(CHANNELS.ack, { id: msg.id }, { destination: "LOCAL" });
    OBR.action.open();

    let done = false;
    const stopListening = OBR.broadcast.onMessage(CHANNELS.runAck, (ack) => {
      if ((ack.data as { id?: string } | undefined)?.id === msg.id) {
        done = true;
      }
    });
    const started = Date.now();
    const send = () => {
      if (done || Date.now() - started > GIVE_UP_MS) {
        stopListening();
        return;
      }
      OBR.broadcast.sendMessage(CHANNELS.run, msg, { destination: "LOCAL" });
      setTimeout(send, RESEND_MS);
    };
    send();
  });
});
