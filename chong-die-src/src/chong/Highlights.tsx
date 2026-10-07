import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";

import { DiceRoll } from "../types/DiceRoll";
import { DiceTransform } from "../types/DiceTransform";
import { highlightedDice } from "./rollMeta";

/**
 * The outline: the die's own shape, a little larger, drawn inside out in solid purple, so only a
 * rim shows around the die (shown as is: no lighting, no tone mapping)
 */
const OUTLINE = new THREE.MeshBasicMaterial({ color: "#9d5cff", side: THREE.BackSide, toneMapped: false });
const SCALE = 1.08;

/** The 3D die drawn for a die id (the finished roll tags each with `userData.dieId`) */
function findDie(scene: THREE.Object3D, id: string): THREE.Object3D | undefined {
  let found: THREE.Object3D | undefined;
  scene.traverse((object) => {
    if (!found && object.userData?.dieId === id) {
      found = object;
    }
  });
  return found;
}

/**
 * Nimble: a purple outline around the leftmost die of each dice term, once the roll has landed
 * (every player's copy of the tray). Command rolls only.
 */
export function Highlights({
  roll,
  transforms,
}: {
  roll: DiceRoll;
  transforms: Record<string, DiceTransform>;
}) {
  const { scene, invalidate } = useThree();
  const ids = useMemo(() => highlightedDice(roll, transforms), [roll, transforms]);

  useEffect(() => {
    const outlines: THREE.Mesh[] = [];
    for (const id of ids) {
      let mesh: THREE.Mesh | undefined;
      findDie(scene, id)?.traverse((object) => {
        if (!mesh && object instanceof THREE.Mesh) {
          mesh = object;
        }
      });
      if (mesh) {
        const outline = new THREE.Mesh(mesh.geometry, OUTLINE);
        outline.scale.setScalar(SCALE);
        mesh.add(outline);
        outlines.push(outline);
      }
    }
    invalidate();
    return () => {
      outlines.forEach((outline) => outline.removeFromParent());
      invalidate();
    };
  }, [ids, scene, invalidate]);

  return null;
}
