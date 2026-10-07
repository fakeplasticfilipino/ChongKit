import { readFileSync } from "fs";
import * as THREE from "three";
import { describe, expect, test } from "vitest";
import { COLLIDER_VERTICES } from "../colliders/colliderVertices";
import {
  FaceLocator,
  hullNormals,
  rotationGroup,
  symmetryOnto,
  SYMMETRY_TOLERANCE,
  turnedPose,
} from "./faceSymmetry";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const close = (a: THREE.Vector3, b: THREE.Vector3, tol = 1e-6) => a.distanceTo(b) < tol;
const up = v(0, 1, 0);

/** Read the face on top the way getValueFromDiceGroup does: the locator pointing most up */
function read(locators: FaceLocator[], q: THREE.Quaternion): number {
  let best = { dot: -2, face: 0 };
  for (const l of locators) {
    const dot = l.dir.clone().applyQuaternion(q).dot(up);
    if (dot > best.dot) best = { dot, face: l.face };
  }
  return best.face;
}

describe("a cube", () => {
  // ±x, ±y, ±z named 1 to 6
  const dirs = [v(1, 0, 0), v(-1, 0, 0), v(0, 1, 0), v(0, -1, 0), v(0, 0, 1), v(0, 0, -1)];
  const cube: FaceLocator[] = dirs.map((dir, i) => ({ face: i + 1, dir }));
  const group = rotationGroup(dirs, SYMMETRY_TOLERANCE);

  test("has the 24 rotations of the cube, the identity first", () => {
    expect(group).toHaveLength(24);
    expect(group[0].equals(new THREE.Quaternion())).toBe(true);
  });

  test("symmetryOnto(2, 5) takes face 5's locator to face 2's and the cube onto itself", () => {
    const r = symmetryOnto(group, cube, 2, 5);
    expect(close(cube[4].dir.clone().applyQuaternion(r), cube[1].dir)).toBe(true);
    for (const l of cube) {
      const moved = l.dir.clone().applyQuaternion(r);
      expect(cube.some((m) => close(moved, m.dir))).toBe(true);
    }
  });

  test("a face already on top doesn't turn", () => {
    const r = symmetryOnto(group, cube, 3, 3);
    expect(Math.abs(r.w)).toBeCloseTo(1, 9);
  });

  test("an unknown face throws", () => {
    expect(() => symmetryOnto(group, cube, 3, 9)).toThrow();
  });
});

// The real dice: the collider hulls (what the group is built from) and the locators the app reads
// (parsed from the gltfjsx meshes, both styles).
const SRC = new URL("../", import.meta.url);
function locatorsOf(style: string, die: string): FaceLocator[] {
  const text = readFileSync(new URL(`meshes/${style}/${die}.tsx`, SRC), "utf8");
  // The mesh may be rotated in the die's frame (the d20 is): its locators turn with it
  const meshTag = text.match(/<mesh[\s\S]*?>/)![0];
  const angles = meshTag.match(/rotation=\{\[([^\]]*)\]\}/)?.[1].split(",").map(Number) || [0, 0, 0];
  const meshRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(angles[0], angles[1], angles[2])
  );
  const out: FaceLocator[] = [];
  const re = /name="(\d+_locator_\d+)"\s*(?:position=\{\[([^\]]*)\]\})?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const p = m[2] ? m[2].split(",").map(Number) : [0, 0, 0];
    out.push({ face: parseInt(m[1].slice(12)), dir: v(p[0], p[1], p[2]).applyQuaternion(meshRotation).normalize() });
  }
  return out;
}

const DICE = [
  ["D4", 12, 4],
  ["D6", 24, 6],
  ["D8", 24, 8],
  ["D10", 10, 10],
  ["D12", 60, 12],
  ["D20", 60, 20],
  ["D100", 10, 10],
] as const;

describe.each(DICE)("%s", (die, order, faces) => {
  const normals = hullNormals(COLLIDER_VERTICES[die]);
  const group = rotationGroup(normals, SYMMETRY_TOLERANCE);

  test(`the hull has ${faces} faces and ${order} rotations onto itself`, () => {
    expect(normals).toHaveLength(faces);
    expect(group).toHaveLength(order);
  });

  test.each(["rounded", "sharp"])("%s: every landed face can turn to read every face", (style) => {
    const locators = locatorsOf(style, die);
    expect(locators).toHaveLength(faces);
    let checked = 0;
    for (const n of normals) {
      // Rest on each face (a d4 rests with a face down and reads its top corner)
      const rest = new THREE.Quaternion().setFromUnitVectors(
        die === "D4" ? n.clone().negate() : n,
        up
      );
      const landed = read(locators, rest);
      for (const t of locators) {
        const r = symmetryOnto(group, locators, landed, t.face);
        expect(read(locators, rest.clone().multiply(r)), `${landed} → ${t.face}`).toBe(t.face);
        checked++;
      }
    }
    expect(checked).toBe(faces * faces);
  });
});

describe("turnedPose", () => {
  test("keeps the pivot where it was and turns the body by R after its rotation", () => {
    const position = v(0.3, 0.05, -0.2);
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, -1.1, 2));
    const r = new THREE.Quaternion().setFromAxisAngle(v(0, 1, 0).normalize(), (2 * Math.PI) / 3);
    const pivot = v(0, -0.0165, 0);
    const pose = turnedPose(position, rotation, r, pivot);
    expect(pose.rotation.angleTo(rotation.clone().multiply(r))).toBeLessThan(1e-9);
    // The pivot's world position is the same before and after
    const before = pivot.clone().applyQuaternion(rotation).add(position);
    const after = pivot.clone().applyQuaternion(pose.rotation).add(pose.position);
    expect(close(before, after, 1e-9)).toBe(true);
  });

  test("with no pivot only the rotation changes", () => {
    const position = v(1, 2, 3);
    const rotation = new THREE.Quaternion(0.1, 0.2, 0.3, 0.9).normalize();
    const r = new THREE.Quaternion().setFromAxisAngle(v(1, 0, 0), Math.PI / 2);
    const pose = turnedPose(position, rotation, r);
    expect(close(pose.position, position, 1e-12)).toBe(true);
  });
});
