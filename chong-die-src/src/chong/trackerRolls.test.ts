import { readFileSync } from "fs";
import { expect, test } from "vitest";
import { expand, parse } from "../engine";

// Note lines from Chong's Tracker and the commands its findRolls makes from them
// (chongs-tracker/tests/roll-examples.json, also tested on the tracker's side)
const examples: { line: string; commands: string[] }[] = JSON.parse(
  readFileSync(new URL("../../../chongs-tracker/tests/roll-examples.json", import.meta.url), "utf8")
).lines;

// Skipped until Task 9 of the 3.0 plan (.superpowers/sdd/2026-10-07-roll-engine-plan): the shared
// examples are still in Avrae syntax; Task 9 moves them and the tracker's findRolls to the new words.
test("every roll Chong's Tracker sends can be rolled", () => {
  const commands = examples.flatMap((e) => e.commands);
  expect(commands.length).toBeGreaterThan(5);
  for (const command of commands) {
    expect(() => parse(expand(command, {})), command).not.toThrow();
  }
});
