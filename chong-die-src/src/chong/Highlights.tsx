import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";

import { DiceRoll } from "../types/DiceRoll";
import { DiceTransform } from "../types/DiceTransform";
import { highlightedDice, highlightTone } from "./rollMeta";

/**
 * The outline: the die's own shape, a little larger, drawn inside out in a solid color, so only a
 * rim shows around the die (shown as is: no lighting, no tone mapping). Purple, dark red on a 1,
 * bright gold on the highest face.
 */
const outline = (color: string) =>
  new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, toneMapped: false });
const OUTLINES = {
  plain: outline("#9d5cff"),
  miss: outline("#8b0f0f"),
  crit: outline("#ffc61a"),
};
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
 * Nimble: an outline around the leftmost die of each dice term, once the roll has landed
 * (every player's copy of the tray). Command rolls only.
 */
export function Highlights({
  roll,
  transforms,
  values,
}: {
  roll: DiceRoll;
  transforms: Record<string, DiceTransform>;
  values?: Record<string, number | null>;
}) {
  const { scene, invalidate } = useThree();
  const ids = useMemo(() => highlightedDice(roll, transforms), [roll, transforms]);
  const tones = useMemo(
    () => ids.map((id) => (roll.chong && values ? highlightTone(roll.chong, id, values) : "plain")).join(),
    [ids, roll, values]
  );

  useEffect(() => {
    const outlines: THREE.Mesh[] = [];
    const toneList = tones.split(",") as (keyof typeof OUTLINES)[];
    ids.forEach((id, i) => {
      let mesh: THREE.Mesh | undefined;
      findDie(scene, id)?.traverse((object) => {
        if (!mesh && object instanceof THREE.Mesh) {
          mesh = object;
        }
      });
      if (mesh) {
        const rim = new THREE.Mesh(mesh.geometry, OUTLINES[toneList[i]] || OUTLINES.plain);
        rim.scale.setScalar(SCALE);
        mesh.add(rim);
        outlines.push(rim);
      }
    });
    invalidate();
    return () => {
      outlines.forEach((rim) => rim.removeFromParent());
      invalidate();
    };
  }, [ids, tones, scene, invalidate]);

  return null;
}
