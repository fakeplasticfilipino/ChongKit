import * as THREE from "three";
import { useMemo } from "react";

import { DiceRoll } from "../types/DiceRoll";
import { DiceTransform } from "../types/DiceTransform";
import { PrimaryState, primaryDice } from "./rollMeta";

/** Glow colours: Owlbear purple, gold for a crit, red for a miss */
const COLORS: Record<PrimaryState, string> = {
  normal: "#bb99ff",
  crit: "#ffc94d",
  miss: "#ff5c6c",
};
const RADIUS = 0.13;
const OPACITY = 0.35;

let glowTexture: THREE.Texture | null = null;
/** A soft white dot fading to nothing, tinted per glow */
function getGlowTexture() {
  if (!glowTexture) {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.45, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    glowTexture = new THREE.CanvasTexture(canvas);
  }
  return glowTexture;
}

/**
 * A faint glow on the tray floor under each roll's primary die once it has landed
 * (gold on a crit, red on a miss). Command rolls only.
 */
export function PrimaryGlows({
  roll,
  rollValues,
  rollTransforms,
}: {
  roll: DiceRoll;
  rollValues?: Record<string, number | null>;
  rollTransforms?: Record<string, DiceTransform | null>;
}) {
  const glows = useMemo(() => {
    if (!rollTransforms) {
      return [];
    }
    return primaryDice(roll, rollValues).flatMap(({ id, state }) => {
      const transform = rollTransforms[id];
      return transform ? [{ id, state, position: transform.position }] : [];
    });
  }, [roll, rollValues, rollTransforms]);

  return (
    <>
      {glows.map(({ id, state, position }) => (
        <mesh
          key={id}
          position={[position.x, 0.003, position.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <circleGeometry args={[RADIUS, 48]} />
          <meshBasicMaterial
            map={getGlowTexture()}
            color={COLORS[state]}
            transparent
            opacity={OPACITY}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}
