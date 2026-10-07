import { readFileSync } from "fs";
import { expect, test } from "vitest";
import { parseCommand } from "../roll";

// Note lines from Chong's Tracker and the commands its findRolls makes from them
// (chongs-tracker/tests/roll-examples.json, also tested on the tracker's side)
const examples: { line: string; commands: string[] }[] = JSON.parse(
  readFileSync(new URL("../../../chongs-tracker/tests/roll-examples.json", import.meta.url), "utf8")
).lines;

test("every roll Chong's Tracker sends can be rolled", () => {
  const commands = examples.flatMap((e) => e.commands);
  expect(commands.length).toBeGreaterThan(5);
  for (const command of commands) {
    expect(() => parseCommand(command), command).not.toThrow();
  }
});
