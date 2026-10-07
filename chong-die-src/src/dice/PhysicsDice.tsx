import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CollisionEnterPayload,
  RigidBody,
  RapierRigidBody,
} from "@react-three/rapier";

import { Die } from "../types/Die";
import { DiceType } from "../types/DiceType";
import {
  getLocatorsFromDiceGroup,
  getValueFromDiceGroup,
} from "../helpers/getValueFromDiceGroup";
import { useFrame, useThree } from "@react-three/fiber";
import { useAudioListener } from "../audio/AudioListenerProvider";
import { getNextBuffer } from "../audio/getAudioBuffer";
import { PhysicalMaterial } from "../types/PhysicalMaterial";
import { getDieWeightClass } from "../helpers/getDieWeightClass";
import { getDieDensity } from "../helpers/getDieDensity";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";
import { DiceCollider } from "../colliders/DiceCollider";
import {
  diceRotationGroup,
  pivotOffset,
  symmetryOnto,
  turnedPose,
  turnPivot,
} from "../helpers/faceSymmetry";

/** Minium linear and angular speed before the dice roll is considered finished */
const MIN_ROLL_FINISHED_SPEED = 0.005;
/** Cool down in MS before dice audio can get played again */
const AUDIO_COOLDOWN = 200;
/** Force stop the physics roll after 5 seconds */
const MAX_ROLL_TIME = 5000;
/** Chong Die: how long a settled die takes to turn onto its record's face (DESIGN.md, Faces) */
const TURN_TIME = 250;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function magnitude({ x, y, z }: { x: number; y: number; z: number }) {
  return Math.sqrt(x * x + y * y + z * z);
}

type Vector3Array = [number, number, number];

export function PhysicsDice({
  die,
  dieThrow,
  onRollFinished,
  children,
  fixedTransform,
  forcedFace,
  ...props
}: JSX.IntrinsicElements["group"] & {
  die: Die;
  dieThrow: DiceThrow;
  onRollFinished?: (
    id: string,
    number: number,
    transform: DiceTransform
  ) => void;
  fixedTransform?: DiceTransform;
  /**
   * Chong Die: the face this die must show (the record's). Once it settles it turns onto it and
   * reports it; a die placed by a fixed transform already shows it.
   */
  forcedFace?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const invalidate = useThree((state) => state.invalidate);
  const [placed] = useState(() => Boolean(fixedTransform));
  /** The turn onto the forced face under way: the model slerps from identity to `r` about `pivot` */
  const turnRef = useRef<{
    start: number;
    r: THREE.Quaternion;
    pivot: THREE.Vector3;
  } | null>(null);

  // Convert dice throw into THREE values
  const [position] = useState<Vector3Array>(() => {
    const p = fixedTransform ? fixedTransform.position : dieThrow.position;
    return [p.x, p.y, p.z];
  });

  const [rotation] = useState<Vector3Array>(() => {
    const r = fixedTransform ? fixedTransform.rotation : dieThrow.rotation;
    const quaternion = new THREE.Quaternion(r.x, r.y, r.z, r.w);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z];
  });

  const [linearVelocity] = useState<Vector3Array>(() => {
    const v = fixedTransform ? { x: 0, y: 0, z: 0 } : dieThrow.linearVelocity;
    return [v.x, v.y, v.z];
  });

  const [angularVelocity] = useState<Vector3Array>(() => {
    const v = fixedTransform ? { x: 0, y: 0, z: 0 } : dieThrow.angularVelocity;
    return [v.x, v.y, v.z];
  });

  const lockedRef = useRef(false);
  const lockDice = useCallback(() => {
    const rigidBody = rigidBodyRef.current;
    if (rigidBody) {
      // Disable rigid body rotation and translation
      // This stops the dice from getting changed after it has finished rolling
      rigidBody.setEnabledRotations(false, false, false, false);
      rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, false);
      rigidBody.setEnabledTranslations(false, false, false, false);
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, false);
      lockedRef.current = true;
    }
  }, []);

  const checkRollFinished = useCallback(
    (ignorePhysics?: boolean) => {
      const rigidBody = rigidBodyRef.current;
      const group = ref.current;
      if (rigidBody && !lockedRef.current && group) {
        // Get the total speed for the dice
        const linVel = rigidBody.linvel();
        const angVel = rigidBody.angvel();
        const speed = magnitude(linVel) + magnitude(angVel);
        // Ensure that the dice is in the tray
        const validPosition = rigidBody.translation().y < 1.5;
        if (
          ignorePhysics ||
          (speed < MIN_ROLL_FINISHED_SPEED && validPosition)
        ) {
          const value = getValueFromDiceGroup(group);
          const position = rigidBody.translation();
          const rotation = rigidBody.rotation();
          const transform = {
            position: { x: position.x, y: position.y, z: position.z },
            rotation: {
              x: rotation.x,
              y: rotation.y,
              z: rotation.z,
              w: rotation.w,
            },
          };
          // Chong Die: a die showing another face than the record's turns onto it, where it lies
          const r =
            forcedFace !== undefined && !placed && value !== forcedFace
              ? findTurn(group, die.type, value, forcedFace)
              : null;
          if (r) {
            lockDice();
            turnRef.current = {
              start: performance.now(),
              r,
              pivot: turnPivot(die.type),
            };
            invalidate();
            return;
          }
          onRollFinished?.(die.id, value, transform);
          lockDice();
        }
      }
    },
    [die.id, die.type, lockDice, forcedFace, placed, invalidate, onRollFinished]
  );

  /** Chong Die: one frame of the turn; at its end the turned pose is what's reported (and synced) */
  const stepTurn = useCallback(() => {
    const turn = turnRef.current;
    const group = ref.current;
    const rigidBody = rigidBodyRef.current;
    if (!turn || !group || !rigidBody) {
      return;
    }
    const t = Math.min(1, (performance.now() - turn.start) / TURN_TIME);
    const q = new THREE.Quaternion().slerp(turn.r, easeInOut(t));
    group.quaternion.copy(q);
    group.position.copy(pivotOffset(q, turn.pivot));
    if (t < 1) {
      invalidate();
      return;
    }
    turnRef.current = null;
    const p = rigidBody.translation();
    const o = rigidBody.rotation();
    const pose = turnedPose(
      new THREE.Vector3(p.x, p.y, p.z),
      new THREE.Quaternion(o.x, o.y, o.z, o.w),
      turn.r,
      turn.pivot
    );
    onRollFinished?.(die.id, forcedFace!, {
      position: { x: pose.position.x, y: pose.position.y, z: pose.position.z },
      rotation: {
        x: pose.rotation.x,
        y: pose.rotation.y,
        z: pose.rotation.z,
        w: pose.rotation.w,
      },
    });
  }, [die.id, forcedFace, invalidate, onRollFinished]);

  const handleFrame = useCallback(() => {
    if (turnRef.current) {
      stepTurn();
    } else {
      checkRollFinished();
    }
  }, [checkRollFinished, stepTurn]);
  useFrame(handleFrame);

  // Lock the dice when we have a manual transform
  useEffect(() => {
    if (fixedTransform) {
      lockDice();
    }
  }, [fixedTransform]);

  // Stop the roll if over the max roll time
  useEffect(() => {
    let timeout = setTimeout(() => {
      if (!lockedRef.current) {
        console.warn("Roll exceeded max roll time: stopping dice");
        checkRollFinished(true);
      }
    }, MAX_ROLL_TIME);

    return () => {
      clearTimeout(timeout);
    };
  }, [checkRollFinished]);

  const listener = useAudioListener();
  const lastAudioTimeRef = useRef(0);
  const handleCollision = useCallback(
    ({ rigidBodyObject }: CollisionEnterPayload) => {
      if (performance.now() - lastAudioTimeRef.current < AUDIO_COOLDOWN) {
        return;
      }
      const group = ref.current;
      // TODO: remove conditional when this gets merged https://github.com/pmndrs/react-three-rapier/pull/151/commits
      const physicalMaterial: PhysicalMaterial =
        rigidBodyObject?.userData?.material || "LEATHER";
      const linvel = rigidBodyRef.current?.linvel();
      if (group && physicalMaterial && linvel) {
        const speed = magnitude(linvel);
        const weightClass = getDieWeightClass(die);
        const buffer = getNextBuffer(weightClass, physicalMaterial);
        if (buffer && listener) {
          const sound = new THREE.PositionalAudio(listener);
          sound.setBuffer(buffer);
          sound.setRefDistance(3);
          sound.play();
          // Modulate sound volume based off of the speed of the colliding dice
          sound.setVolume(Math.min(speed / 5, 1));
          sound.onEnded = () => {
            group.remove(sound);
          };
          group.add(sound);
          lastAudioTimeRef.current = performance.now();
        }
      }
    },
    []
  );

  const userData = useMemo(
    () => ({ material: "DICE", dieId: die.id }),
    [die.id]
  );

  return (
    <RigidBody
      // Increase gravity on the dice to offset the non-standard dice size.
      // Dice are around 10x larger then they should be to account for
      // physics errors when shown at proper size.
      gravityScale={2}
      density={getDieDensity(die)}
      friction={0.1}
      position={position}
      rotation={rotation}
      linearVelocity={linearVelocity}
      angularVelocity={angularVelocity}
      ref={rigidBodyRef}
      onCollisionEnter={handleCollision}
      userData={userData}
    >
      <group ref={ref} {...props}>
        <DiceCollider diceType={die.type} />
        {children}
      </group>
    </RigidBody>
  );
}

/** Chong Die: the turn putting `forcedFace` where `landed` is, or null when the die can't make it */
function findTurn(
  group: THREE.Group,
  type: DiceType,
  landed: number,
  forcedFace: number
): THREE.Quaternion | null {
  const locators = getLocatorsFromDiceGroup(group);
  if (
    !locators.some((l) => l.face === landed) ||
    !locators.some((l) => l.face === forcedFace)
  ) {
    console.warn(`A ${type} has no face ${forcedFace}: left as it landed`);
    return null;
  }
  return symmetryOnto(diceRotationGroup(type), locators, landed, forcedFace);
}
