import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "./plugin/getPluginId";
import { CHANNELS, readRollMessage } from "./chong/channels";

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

// Rolls clicked in Chong's Tracker: answer, open the dice window and hand the command over,
// re-sending until the window says it has it (it may still be loading).
const RESEND_MS = 250;
// Long enough for a cold window to load the 3D libraries and subscribe; re-sends are deduped
const GIVE_UP_MS = 15000;

OBR.onReady(() => {
  OBR.broadcast.onMessage(CHANNELS.roll, (event) => {
    const msg = readRollMessage(event.data);
    if (!msg) {
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
