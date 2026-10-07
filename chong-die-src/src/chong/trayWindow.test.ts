import { beforeEach, expect, test, vi } from "vitest";

const popover = vi.hoisted(() => ({
  open: vi.fn(async (_popover: Record<string, unknown>) => {}),
  close: vi.fn(async () => {}),
  getWidth: vi.fn(async (): Promise<number | undefined> => undefined),
}));
vi.mock("@owlbear-rodeo/sdk", () => ({
  default: {
    popover,
    viewport: { getWidth: async () => 1600, getHeight: async () => 900 },
  },
}));

import { isTrayOpen, openTray, TRAY_ID } from "./trayWindow";

beforeEach(() => {
  popover.open.mockClear();
  popover.getWidth.mockReset();
});

test("the tray id is Chong Die's", () => expect(TRAY_ID).toBe("com.chongkit.chongdie/tray"));

test("a closed tray opens once, and clicking the map can't close it", async () => {
  popover.getWidth.mockResolvedValue(undefined);
  await openTray();
  expect(popover.open).toHaveBeenCalledTimes(1);
  expect(popover.open.mock.calls[0][0]).toMatchObject({
    id: TRAY_ID,
    url: "/ChongKit/chong-die/tray.html",
    disableClickAway: true,
  });
});

test("an open tray isn't opened again (that would reload it mid-roll)", async () => {
  popover.getWidth.mockResolvedValue(410);
  await openTray();
  expect(popover.open).not.toHaveBeenCalled();
});

test("isTrayOpen follows the popover's width", async () => {
  popover.getWidth.mockResolvedValue(410);
  expect(await isTrayOpen()).toBe(true);
  popover.getWidth.mockResolvedValue(undefined);
  expect(await isTrayOpen()).toBe(false);
});

test("two rolls at once open a closed tray only once", async () => {
  popover.getWidth.mockResolvedValue(undefined);
  await Promise.all([openTray(), openTray()]);
  expect(popover.open).toHaveBeenCalledTimes(1);
});
