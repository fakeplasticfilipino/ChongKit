import * as THREE from "three";
import { useLayoutEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import { Die } from "../types/Die";
import { DiceTransform } from "../types/DiceTransform";
import { getLocatorsFromDiceGroup } from "../helpers/getValueFromDiceGroup";
import {
  diceRotationGroup,
  pivotOffset,
  symmetryOnto,
  turnedPose,
  turnPivot,
} from "../helpers/faceSymmetry";
import { SIM_STEP, Track, trackPose } from "../helpers/preSimulate";
import { useDieSound } from "./useDieSound";

const up = new THREE.Vector3(0, 1, 0);

/**
 * Chong Die: a die playing back its pre-simulated throw (`helpers/preSimulate.ts`). Its model is
 * turned by R from the first frame, a rotation of the solid onto itself chosen so the face the
 * throw lands on shows the record's: the die tumbles and stops on that face, with no turn after it
 * lands (DESIGN.md, Faces).
 */
export function PlaybackDice({
  die,
  track,
  forcedFace,
  paused,
  onRollFinished,
  children,
}: {
  die: Die;
  track: Track;
  forcedFace: number;
  /** The tray's first frame: hold the throw pose */
  paused: boolean;
  onRollFinished?: (id: string, number: number, transform: DiceTransform) => void;
  /** The die's model; `landed` once the throw has played out */
  children: (landed: boolean) => React.ReactNode;
}) {
  const outerRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const turnRef = useRef({ r: new THREE.Quaternion(), pivot: new THREE.Vector3() });
  const startRef = useRef<number | null>(null);
  const nextHitRef = useRef(0);
  const doneRef = useRef(false);
  const [landed, setLanded] = useState(false);
  const invalidate = useThree((state) => state.invalidate);
  const playSound = useDieSound(die);

  const showPose = (i: number, alpha = 0) => {
    const outer = outerRef.current;
    if (!outer) return;
    const a = trackPose(track, i);
    outer.position.set(a.position.x, a.position.y, a.position.z);
    outer.quaternion.set(a.rotation.x, a.rotation.y, a.rotation.z, a.rotation.w);
    if (alpha > 0) {
      const b = trackPose(track, i + 1);
      outer.position.lerp(new THREE.Vector3(b.position.x, b.position.y, b.position.z), alpha);
      outer.quaternion.slerp(
        new THREE.Quaternion(b.rotation.x, b.rotation.y, b.rotation.z, b.rotation.w),
        alpha
      );
    }
  };

  // Before the first paint: the throw pose, and the model turned for the face it will land on
  useLayoutEffect(() => {
    showPose(0);
    const model = modelRef.current;
    if (!model) return;
    model.updateWorldMatrix(true, true);
    const r = landingTurn(model, die, track, forcedFace);
    const pivot = turnPivot(die.type);
    turnRef.current = { r, pivot };
    model.quaternion.copy(r);
    model.position.copy(pivotOffset(r, pivot));
    invalidate();
  }, []);

  useFrame(() => {
    if (doneRef.current || paused) return;
    const now = performance.now();
    startRef.current ??= now;
    const f = (now - startRef.current) / 1000 / SIM_STEP;
    const i = Math.floor(f);
    const hits = track.hits;
    while (nextHitRef.current < hits.length && hits[nextHitRef.current].step <= i) {
      const hit = hits[nextHitRef.current++];
      playSound(outerRef.current, hit.material, hit.speed);
    }
    if (i < track.count - 1) {
      showPose(i, f - i);
      invalidate();
      return;
    }
    // Landed: report the pose that shows the turned model with no inner turn (what syncs)
    showPose(track.count - 1);
    doneRef.current = true;
    setLanded(true);
    const rest = trackPose(track, track.count - 1);
    const { r, pivot } = turnRef.current;
    const pose = turnedPose(
      new THREE.Vector3(rest.position.x, rest.position.y, rest.position.z),
      new THREE.Quaternion(rest.rotation.x, rest.rotation.y, rest.rotation.z, rest.rotation.w),
      r,
      pivot
    );
    onRollFinished?.(die.id, forcedFace, {
      position: { x: pose.position.x, y: pose.position.y, z: pose.position.z },
      rotation: { x: pose.rotation.x, y: pose.rotation.y, z: pose.rotation.z, w: pose.rotation.w },
    });
    invalidate();
  });

  return (
    <group ref={outerRef}>
      <group ref={modelRef}>{children(landed)}</group>
    </group>
  );
}

/**
 * The model's turn R: the face the throw lands on (read off its last pose the way
 * `getValueFromDiceGroup` reads a die) is turned onto `forcedFace`. Identity when they're the same
 * or the die has no such face.
 */
function landingTurn(model: THREE.Group, die: Die, track: Track, forcedFace: number): THREE.Quaternion {
  const locators = getLocatorsFromDiceGroup(model);
  const { rotation: o } = trackPose(track, track.count - 1);
  const rest = new THREE.Quaternion(o.x, o.y, o.z, o.w);
  let landed = 0;
  let best = -Infinity;
  for (const l of locators) {
    const dot = l.dir.clone().applyQuaternion(rest).dot(up);
    if (dot > best) {
      best = dot;
      landed = l.face;
    }
  }
  if (landed === forcedFace) {
    return new THREE.Quaternion();
  }
  if (!locators.some((l) => l.face === forcedFace)) {
    console.warn(`A ${die.type} has no face ${forcedFace}: left as it lands`);
    return new THREE.Quaternion();
  }
  return symmetryOnto(diceRotationGroup(die.type), locators, landed, forcedFace);
}
