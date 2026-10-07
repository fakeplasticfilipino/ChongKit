import type * as RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";

import { COLLIDER_VERTICES } from "../colliders/colliderVertices";
import { TRAY_BODIES } from "../colliders/trayShape";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";
import { DiceType } from "../types/DiceType";
import { PhysicalMaterial } from "../types/PhysicalMaterial";

/**
 * Chong Die: a throw run out of sight before the tray shows it (DESIGN.md, Faces). The tray then
 * plays the recorded path back, with the die's model already turned so the face it lands on is the
 * record's: no turn after landing. Pure (the Rapier module is passed in), so it runs in tests.
 */

type Rapier = Pick<
  typeof RAPIER,
  "World" | "EventQueue" | "RigidBodyDesc" | "ColliderDesc" | "ActiveEvents"
>;

/** The live world's step (`DiceRoll`'s `<Physics timeStep>`) */
export const SIM_STEP = 1 / 120;
/** The live world stops a die after 5 s (`PhysicsDice`'s MAX_ROLL_TIME) */
export const MAX_STEPS = 600;
/** Linear plus angular speed under which a die has settled (`PhysicsDice`'s MIN_ROLL_FINISHED_SPEED) */
const SETTLED_SPEED = 0.005;
/** Numbers per recorded pose: position x y z, rotation x y z w */
export const POSE_SIZE = 7;

/** A die to throw: its shape, its density (`getDieDensity`) and its throw */
export interface SimDie {
  type: DiceType;
  density: number;
  dieThrow: DiceThrow;
}

/** A die already lying in the tray: the thrown dice bounce off it */
export interface SimObstacle {
  type: DiceType;
  transform: DiceTransform;
}

/** A collision that should sound: the step it happened after, what it hit and the die's speed */
export interface SimHit {
  step: number;
  material: PhysicalMaterial;
  speed: number;
}

/** A die's recorded path: pose 0 is the throw, pose i is after step i; the last is where it rests */
export interface Track {
  poses: Float32Array;
  /** Number of poses (steps taken + 1) */
  count: number;
  hits: SimHit[];
}

/** Pose `i` of a track (clamped to its last) */
export function trackPose(track: Track, i: number): DiceTransform {
  const at = Math.max(0, Math.min(track.count - 1, i)) * POSE_SIZE;
  const p = track.poses;
  return {
    position: { x: p[at], y: p[at + 1], z: p[at + 2] },
    rotation: { x: p[at + 3], y: p[at + 4], z: p[at + 5], w: p[at + 6] },
  };
}

function hullDesc(rapier: Rapier, type: DiceType): RAPIER.ColliderDesc {
  // The colliders divide the hull by 10 (`D6Collider` …)
  const vertices = COLLIDER_VERTICES[type];
  const desc = rapier.ColliderDesc.convexHull(new Float32Array(vertices.map((n) => n / 10)));
  if (!desc) {
    throw new Error(`No hull for a ${type}`);
  }
  return desc;
}

/**
 * Throw `dice` into the tray (with `obstacles` lying in it) and record every die's path until it
 * settles or 5 s pass. Set up like the live world: `<Physics>`'s defaults, `TrayColliders`, and
 * `PhysicsDice`'s body (gravity ×2, friction 0.1, the die's density). The same input gives the same
 * paths on every machine (Rapier is deterministic for one build and one input).
 */
export function preSimulate(rapier: Rapier, dice: SimDie[], obstacles: SimObstacle[] = []): Track[] {
  const world = new rapier.World({ x: 0, y: -9.81, z: 0 });
  const queue = new rapier.EventQueue(true);
  try {
    const params = world.integrationParameters;
    params.maxStabilizationIterations = 1;
    params.maxVelocityFrictionIterations = 8;
    params.maxVelocityIterations = 4;
    params.predictionDistance = 0.002;
    params.erp = 0.8;
    world.timestep = SIM_STEP;

    /** Collider handle → the sound material of what it is */
    const materials = new Map<number, PhysicalMaterial>();
    const euler = new THREE.Euler();
    const q = new THREE.Quaternion();
    for (const tray of TRAY_BODIES) {
      const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());
      for (const box of tray.boxes) {
        q.setFromEuler(euler.set(...(box.rotation ?? [0, 0, 0])));
        const collider = world.createCollider(
          rapier.ColliderDesc.cuboid(...box.args)
            .setTranslation(...box.position)
            .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
            .setFriction(tray.friction)
            .setRestitution(tray.restitution),
          body
        );
        materials.set(collider.handle, tray.material);
      }
    }
    for (const o of obstacles) {
      const { position: p, rotation: r } = o.transform;
      const body = world.createRigidBody(
        rapier.RigidBodyDesc.fixed().setTranslation(p.x, p.y, p.z).setRotation(r)
      );
      const collider = world.createCollider(hullDesc(rapier, o.type).setFriction(0.1), body);
      materials.set(collider.handle, "DICE");
    }

    const bodies = dice.map((d) => {
      const { position: p, rotation: r, linearVelocity: v, angularVelocity: w } = d.dieThrow;
      const body = world.createRigidBody(
        rapier.RigidBodyDesc.dynamic()
          .setTranslation(p.x, p.y, p.z)
          .setRotation(r)
          .setLinvel(v.x, v.y, v.z)
          .setAngvel(w)
          .setGravityScale(2)
      );
      const collider = world.createCollider(
        hullDesc(rapier, d.type)
          .setDensity(d.density)
          .setFriction(0.1)
          .setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS),
        body
      );
      materials.set(collider.handle, "DICE");
      return { body, collider: collider.handle };
    });
    const dieOfCollider = new Map(bodies.map((b, i) => [b.collider, i]));

    const poses = dice.map(() => new Float32Array((MAX_STEPS + 1) * POSE_SIZE));
    const counts = dice.map(() => 0);
    const hits: SimHit[][] = dice.map(() => []);
    const settled = dice.map(() => false);
    const record = (i: number) => {
      const t = bodies[i].body.translation();
      const r = bodies[i].body.rotation();
      poses[i].set([t.x, t.y, t.z, r.x, r.y, r.z, r.w], counts[i] * POSE_SIZE);
      counts[i]++;
    };
    dice.forEach((_, i) => record(i));

    for (let step = 1; step <= MAX_STEPS && settled.includes(false); step++) {
      world.step(queue);
      queue.drainCollisionEvents((h1, h2, started) => {
        if (!started) return;
        for (const [self, other] of [
          [h1, h2],
          [h2, h1],
        ]) {
          const i = dieOfCollider.get(self);
          if (i === undefined || settled[i]) continue;
          const v = bodies[i].body.linvel();
          hits[i].push({
            step,
            material: materials.get(other) ?? "LEATHER",
            speed: Math.hypot(v.x, v.y, v.z),
          });
        }
      });
      bodies.forEach(({ body }, i) => {
        if (settled[i]) return;
        record(i);
        const v = body.linvel();
        const w = body.angvel();
        const speed = Math.hypot(v.x, v.y, v.z) + Math.hypot(w.x, w.y, w.z);
        if (speed < SETTLED_SPEED && body.translation().y < 1.5) {
          // Locked where it lies, as `PhysicsDice` does: the others now bounce off a still die
          settled[i] = true;
          body.setEnabledRotations(false, false, false, false);
          body.setAngvel({ x: 0, y: 0, z: 0 }, false);
          body.setEnabledTranslations(false, false, false, false);
          body.setLinvel({ x: 0, y: 0, z: 0 }, false);
        }
      });
    }

    return dice.map((_, i) => ({
      poses: poses[i].slice(0, counts[i] * POSE_SIZE),
      count: counts[i],
      hits: hits[i],
    }));
  } finally {
    queue.free();
    world.free();
  }
}
