/**
 * Owlbear broadcast channels between Chong's Tracker and Chong Die (all LOCAL: this player only).
 * roll / ack:     tracker → Chong Die background, and its answer
 * run / run-ack:  background → dice window (re-sent until acknowledged), and its answer
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
}
