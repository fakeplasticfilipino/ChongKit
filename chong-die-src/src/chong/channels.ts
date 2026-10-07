/**
 * Owlbear broadcast channels into Chong Die (all LOCAL: this player only).
 * roll / ack:     Rolls window or Chong's Tracker → Chong Die background, and its answer
 * run / run-ack:  background → dice tray (re-sent until acknowledged), and its answer
 */
export const CHANNELS = {
  roll: "com.chongkit.chongdie/roll",
  ack: "com.chongkit.chongdie/ack",
  run: "com.chongkit.chongdie/run",
  runAck: "com.chongkit.chongdie/run-ack",
} as const;

export interface RollMessage {
  id: string;
  command: string;
  /** true: put the dice on the tray to throw, false: roll now. Missing (Chong's Tracker): the open tab's Instant switch decides */
  place?: boolean;
}

/** A roll message from another page, or null when it isn't one */
export function readRollMessage(data: unknown): RollMessage | null {
  const raw = data as Partial<RollMessage> | null | undefined;
  if (!raw || typeof raw.id !== "string" || typeof raw.command !== "string") {
    return null;
  }
  const msg: RollMessage = { id: raw.id, command: raw.command };
  if (typeof raw.place === "boolean") {
    msg.place = raw.place;
  }
  return msg;
}
