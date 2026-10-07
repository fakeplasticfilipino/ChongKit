import { expect, test } from "vitest";
import { readRollMessage } from "./channels";

test("a roll message keeps a boolean place", () =>
  expect(readRollMessage({ id: "a", command: "1d6", place: true })).toEqual({ id: "a", command: "1d6", place: true }));

test("a place that isn't true or false counts as missing", () =>
  expect(readRollMessage({ id: "a", command: "1d6", place: "yes" })).toEqual({ id: "a", command: "1d6" }));

test("a message without an id or command is ignored", () => {
  expect(readRollMessage({ command: "1d6" })).toBeNull();
  expect(readRollMessage(null)).toBeNull();
});
