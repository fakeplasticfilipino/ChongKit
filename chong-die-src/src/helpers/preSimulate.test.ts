import * as RAPIER from "@dimforge/rapier3d-compat";
import { beforeAll, describe, expect, test } from "vitest";
import { DiceThrow } from "../types/DiceThrow";
import { DiceType } from "../types/DiceType";
import { MAX_STEPS, POSE_SIZE, preSimulate, SimDie, trackPose } from "./preSimulate";

beforeAll(async () => {
  await RAPIER.init();
});

/** A seeded throw, like `getRandomDiceThrow` but repeatable */
function seeded(seed: number) {
  let s = seed;
  const rnd = (min: number, max: number) => {
    s = (s * 16807) % 2147483647;
    return min + ((s - 1) / 2147483646) * (max - min);
  };
  return (): DiceThrow => {
    const position = { x: rnd(-0.3, 0.3), y: rnd(1, 1.2), z: rnd(-0.8, 0.8) };
    const len = Math.hypot(position.x, position.z);
    const speed = rnd(1, 2);
    const a = rnd(0, Math.PI * 2);
    const b = rnd(0, Math.PI * 2);
    return {
      position,
      rotation: { x: Math.sin(a) * Math.cos(b), y: Math.sin(a) * Math.sin(b), z: 0, w: Math.cos(a) },
      linearVelocity: { x: (-position.x / len) * speed, y: 0, z: (-position.z / len) * speed },
      angularVelocity: { x: rnd(2, 6), y: rnd(2, 6), z: rnd(2, 6) },
    };
  };
}

const TYPES: DiceType[] = ["D4", "D6", "D8", "D10", "D12", "D20", "D100"];

function throwSet(seed: number, n: number): SimDie[] {
  const next = seeded(seed);
  return Array.from({ length: n }, (_, i) => ({
    type: TYPES[(seed + i) % TYPES.length],
    density: 1,
    dieThrow: next(),
  }));
}

describe("preSimulate", () => {
  test("the same throw gives the same paths, bit for bit", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const a = preSimulate(RAPIER, throwSet(seed, 4));
      const b = preSimulate(RAPIER, throwSet(seed, 4));
      expect(a.map((t) => Array.from(t.poses))).toEqual(b.map((t) => Array.from(t.poses)));
      expect(a.map((t) => t.hits)).toEqual(b.map((t) => t.hits));
    }
  });

  test("every die starts at its throw and comes to rest on the tray floor", () => {
    const dice = throwSet(7, 6);
    const tracks = preSimulate(RAPIER, dice);
    tracks.forEach((track, i) => {
      expect(track.poses.length).toBe(track.count * POSE_SIZE);
      expect(track.count).toBeGreaterThan(1);
      expect(track.count).toBeLessThanOrEqual(MAX_STEPS + 1);
      const start = trackPose(track, 0).position;
      const p = dice[i].dieThrow.position;
      expect(Math.hypot(start.x - p.x, start.y - p.y, start.z - p.z)).toBeLessThan(1e-6);
      const rest = trackPose(track, track.count - 1).position;
      expect(rest.y).toBeGreaterThan(0);
      expect(rest.y).toBeLessThan(0.3);
      expect(Math.abs(rest.x)).toBeLessThan(0.5);
      expect(Math.abs(rest.z)).toBeLessThan(1);
    });
  });

  test("dice hit the tray and are heard (the floor is leather, the walls wood)", () => {
    const tracks = preSimulate(RAPIER, throwSet(3, 3));
    for (const track of tracks) {
      expect(track.hits.length).toBeGreaterThan(0);
      expect(track.hits.some((h) => h.material === "LEATHER")).toBe(true);
      for (const h of track.hits) {
        expect(h.step).toBeGreaterThan(0);
        expect(h.step).toBeLessThan(track.count);
      }
    }
  });

  test("a die lying in the tray changes the path of a die thrown at it", () => {
    const [die] = throwSet(11, 1);
    const alone = preSimulate(RAPIER, [die]);
    const rest = trackPose(alone[0], alone[0].count - 1);
    const blocked = preSimulate(RAPIER, [die], [{ type: "D20", transform: rest }]);
    expect(Array.from(blocked[0].poses)).not.toEqual(Array.from(alone[0].poses));
    expect(blocked[0].hits.some((h) => h.material === "DICE")).toBe(true);
  });

  test("100 dice settle within the time cap", () => {
    const tracks = preSimulate(RAPIER, throwSet(5, 100));
    expect(tracks).toHaveLength(100);
    for (const t of tracks) expect(t.count).toBeLessThanOrEqual(MAX_STEPS + 1);
  });
});
