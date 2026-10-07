import * as THREE from "three";
import { useMemo } from "react";

import { DiceRoll } from "../types/DiceRoll";
import { DiceTransform } from "../types/DiceTransform";
import { highlightedDice } from "./rollMeta";

/** Owlbear's purple, faint */
const COLOR = "#bb99ff";
const RADIUS = 0.13;
const OPACITY = 0.3;
/** Just above the tray floor (its collider top is 0.005) so the floor doesn't hide it */
const FLOOR_Y = 0.007;

let glowTexture: THREE.Texture | null = null;
/** A soft white dot fading to nothing, tinted by the material */
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
 * A faint glow on the tray floor under the leftmost die of each dice term, once the roll has
 * landed (every player's copy of the tray). Command rolls only.
 */
export function Highlights({
  roll,
  transforms,
}: {
  roll: DiceRoll;
  transforms: Record<string, DiceTransform>;
}) {
  const glows = useMemo(() => {
    // Every die has landed (these are the finished transforms)
    const landed = Object.fromEntries(Object.keys(transforms).map((id) => [id, 0]));
    return highlightedDice(roll, landed).flatMap((id) =>
      transforms[id] ? [{ id, position: transforms[id].position }] : []
    );
  }, [roll, transforms]);

  return (
    <>
      {glows.map(({ id, position }) => (
        <mesh key={id} position={[position.x, FLOOR_Y, position.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <circleGeometry args={[RADIUS, 48]} />
          <meshBasicMaterial
            map={getGlowTexture()}
            color={COLOR}
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
