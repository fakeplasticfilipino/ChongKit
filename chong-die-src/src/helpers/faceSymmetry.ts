import * as THREE from "three";
import { COLLIDER_VERTICES } from "../colliders/colliderVertices";
import { DiceType } from "../types/DiceType";

/**
 * Landing on the record's face (DESIGN.md, Faces): once a die settles showing face U, its visible
 * model turns by R, a rotation of the solid onto itself that puts face T where U was. R comes from
 * the die's rotation group, built from its collider hull's face normals (the locators aren't an
 * exactly symmetric set), then picked as the element taking T's locator closest to U's.
 */

/** A face's locator: the face it reads and its direction from the model's centre, in the die's frame */
export interface FaceLocator {
  face: number;
  dir: THREE.Vector3;
}

/**
 * How far a rotated normal may miss a normal and still count as a symmetry (radians). The collider
 * vertices are printed to 6 digits, so the hulls are only symmetric to about 1e-3 (1e-4 is too tight).
 */
export const SYMMETRY_TOLERANCE = 2e-3;

/** The outward unit normals of a convex hull's faces, from its vertices (flat x, y, z list) */
export function hullNormals(vertices: number[]): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    points.push(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
  }
  const normals: THREE.Vector3[] = [];
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      for (let k = j + 1; k < points.length; k++) {
        ab.subVectors(points[j], points[i]);
        ac.subVectors(points[k], points[i]);
        const n = new THREE.Vector3().crossVectors(ab, ac);
        if (n.length() < 1e-9) continue;
        n.normalize();
        // A face: every point lies on one side of the plane
        const d = n.dot(points[i]);
        let above = 0;
        let below = 0;
        for (const p of points) {
          const s = n.dot(p) - d;
          if (s > 1e-4) above++;
          if (s < -1e-4) below++;
        }
        if (above && below) continue;
        if (above) n.negate();
        if (!normals.some((m) => m.dot(n) > 1 - 1e-6)) normals.push(n);
      }
    }
  }
  return normals;
}

/** A frame with x along a and z along a × b */
function frame(a: THREE.Vector3, b: THREE.Vector3): THREE.Matrix4 {
  const x = a.clone().normalize();
  const z = new THREE.Vector3().crossVectors(a, b).normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  return new THREE.Matrix4().makeBasis(x, y, z);
}

/** The largest angle from a rotated vector of `set` to its nearest vector of `set` */
function worstMiss(set: THREE.Vector3[], q: THREE.Quaternion): number {
  let worst = 0;
  const r = new THREE.Vector3();
  for (const s of set) {
    r.copy(s).applyQuaternion(q);
    let nearest = Infinity;
    for (const t of set) nearest = Math.min(nearest, r.angleTo(t));
    worst = Math.max(worst, nearest);
  }
  return worst;
}

/**
 * Every proper rotation taking a set of unit normals onto itself (within `tol` radians), the
 * identity first. Each one is found by where it sends two normals that aren't parallel.
 */
export function rotationGroup(normals: THREE.Vector3[], tol: number): THREE.Quaternion[] {
  const group = [new THREE.Quaternion()];
  const n0 = normals[0];
  const n1 = normals.find((n) => Math.abs(n.dot(n0)) < 0.99);
  if (!n0 || !n1) return group;
  const inverse = frame(n0, n1).invert();
  const angle = n0.dot(n1);
  for (const a of normals) {
    for (const b of normals) {
      if (Math.abs(a.dot(b) - angle) > 1e-3) continue;
      const q = new THREE.Quaternion().setFromRotationMatrix(frame(a, b).multiply(inverse));
      if (worstMiss(normals, q) < tol && !group.some((g) => Math.abs(g.dot(q)) > 1 - 1e-6)) {
        group.push(q);
      }
    }
  }
  return group;
}

/** How far a rotation turns (radians) */
const turnAngle = (q: THREE.Quaternion) => 2 * Math.acos(Math.min(1, Math.abs(q.w)));

/**
 * The rotation of the solid (an element of its `group`) that moves face `to`'s locator to where
 * face `from`'s locator is: the one that lands closest, and of those the smallest turn.
 */
export function symmetryOnto(
  group: THREE.Quaternion[],
  locators: FaceLocator[],
  from: number,
  to: number
): THREE.Quaternion {
  const u = locators.find((l) => l.face === from);
  const t = locators.find((l) => l.face === to);
  if (!u || !t) {
    throw new Error(`No locator for face ${!u ? from : to}`);
  }
  let best = group[0];
  let bestMiss = Infinity;
  const moved = new THREE.Vector3();
  for (const q of group) {
    const miss = moved.copy(t.dir).applyQuaternion(q).angleTo(u.dir);
    if (
      miss < bestMiss - 1e-6 ||
      (Math.abs(miss - bestMiss) <= 1e-6 && turnAngle(q) < turnAngle(best))
    ) {
      best = q;
      bestMiss = miss;
    }
  }
  return best.clone();
}

const groups: Partial<Record<DiceType, THREE.Quaternion[]>> = {};
/** A die type's rotation group, from its collider hull (built once) */
export function diceRotationGroup(type: DiceType): THREE.Quaternion[] {
  return (groups[type] ??= rotationGroup(hullNormals(COLLIDER_VERTICES[type]), SYMMETRY_TOLERANCE));
}

/**
 * The point a die's model turns about, in the die's frame (tray units). Every model is centred on
 * the origin but the d4's, centred at y ≈ −0.165 model units (×0.1 in the tray): turned about the
 * origin it would jump by a fifth of its size (measured by the Task 1 spike).
 */
export function turnPivot(type: DiceType): THREE.Vector3 {
  return type === "D4" ? new THREE.Vector3(0, -0.0165, 0) : new THREE.Vector3();
}

/**
 * The model's local position for a turn by `q` about `pivot` (the model's local rotation is `q`):
 * the pivot stays put.
 */
export function pivotOffset(q: THREE.Quaternion, pivot: THREE.Vector3): THREE.Vector3 {
  return pivot.clone().sub(pivot.clone().applyQuaternion(q));
}

/**
 * The body pose that shows the turned model with no inner turn: rotation · R, and the position moved
 * by the pivot's shift. This is what's saved and synced, so every tray draws the record's face.
 */
export function turnedPose(
  position: THREE.Vector3,
  rotation: THREE.Quaternion,
  r: THREE.Quaternion,
  pivot: THREE.Vector3 = new THREE.Vector3()
): { position: THREE.Vector3; rotation: THREE.Quaternion } {
  return {
    position: position.clone().add(pivotOffset(r, pivot).applyQuaternion(rotation)),
    rotation: rotation.clone().multiply(r),
  };
}
