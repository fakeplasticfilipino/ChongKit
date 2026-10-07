import { expect, test } from "vitest";
import { readRollMessage } from "./channels";

test("a roll message is its id and command; anything else is ignored", () =>
  expect(readRollMessage({ id: "a", command: "1d6", place: true })).toEqual({ id: "a", command: "1d6" }));

test("a message without an id or command is ignored", () => {
  expect(readRollMessage({ command: "1d6" })).toBeNull();
  expect(readRollMessage(null)).toBeNull();
});
