import { beforeEach, expect, test, vi } from "vitest";

const obr = vi.hoisted(() => ({
  isAvailable: true,
  broadcast: { sendMessage: vi.fn(async (..._args: unknown[]) => {}) },
}));
vi.mock("@owlbear-rodeo/sdk", () => ({ default: obr }));

import { sendRoll } from "./sendRoll";
import { CHANNELS } from "./channels";

beforeEach(() => obr.broadcast.sendMessage.mockClear());

test("a roll goes to this player's own Chong Die background with its place", () => {
  sendRoll("2d6+1", true);
  const [channel, data, options] = obr.broadcast.sendMessage.mock.calls[0];
  expect(channel).toBe(CHANNELS.roll);
  expect(data).toMatchObject({ command: "2d6+1", place: true });
  expect(typeof (data as { id: string }).id).toBe("string");
  expect(options).toEqual({ destination: "LOCAL" });
});

test("each roll gets its own id", () => {
  sendRoll("1d20", false);
  sendRoll("1d20", false);
  const [a, b] = obr.broadcast.sendMessage.mock.calls.map((c) => (c[1] as { id: string }).id);
  expect(a).not.toBe(b);
});
