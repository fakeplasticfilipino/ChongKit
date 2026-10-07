import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";

import { DiceRoll } from "../types/DiceRoll";
import { DiceTransform } from "../types/DiceTransform";
import { highlightedDice } from "./rollMeta";
import { findNumber } from "./numberMask";
// Every dice style shares one texture layout; the glass style's mask marks where the numbers are
import maskUrl from "../materials/glass/mask.png";

/** A saturated take on Owlbear's purple, shown as is (no tone mapping, which would wash it to white) */
const COLOR = new THREE.Color("#9d5cff");
const INTENSITY = 1.6;
/** Glow textures are built at this size (the mask is 2048) */
const SIZE = 1024;
/** How far (px at SIZE) from the point under the top of the die to look for its number */
const SEARCH = 72;
/** Pieces of one number ("13", the dot under a 6) are closer than this (px at SIZE); numbers on other faces are 35+ px away */
const GAP = 14;

let digits: Promise<Uint8Array> | null = null;
/** Where numbers are drawn, 1 per pixel at SIZE (blue numbers on magenta in the file) */
function loadDigits(): Promise<Uint8Array> {
  if (!digits) {
    digits = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = SIZE;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0, SIZE, SIZE);
        const px = ctx.getImageData(0, 0, SIZE, SIZE).data;
        const lit = new Uint8Array(SIZE * SIZE);
        for (let i = 0; i < lit.length; i++) {
          // Numbers have no red; the background is full red
          lit[i] = px[i * 4] < 128 ? 1 : 0;
        }
        resolve(lit);
      };
      image.onerror = reject;
      image.src = maskUrl;
    });
  }
  return digits;
}

/** The number nearest (u, v) in white, black everywhere else; null when there's none near */
function glowMap(lit: Uint8Array, u: number, v: number): THREE.Texture | null {
  const pixels = findNumber(lit, SIZE, u, v, SEARCH, GAP);
  if (pixels.length === 0) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(SIZE, SIZE);
  // Opaque black, then the number white (and 1 px around it, so the glow fills the strokes)
  for (let i = 3; i < image.data.length; i += 4) {
    image.data[i] = 255;
  }
  for (const i of pixels) {
    const x0 = i % SIZE;
    const y0 = Math.floor(i / SIZE);
    for (let y = Math.max(0, y0 - 1); y <= Math.min(SIZE - 1, y0 + 1); y++) {
      for (let x = Math.max(0, x0 - 1); x <= Math.min(SIZE - 1, x0 + 1); x++) {
        const j = (y * SIZE + x) * 4;
        image.data[j] = image.data[j + 1] = image.data[j + 2] = 255;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  // Die textures aren't flipped (glTF): v runs down the image like canvas y
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  return texture;
}

/**
 * The die's material, with one number glowing: the number's own colour is blacked out (so a white
 * number doesn't wash the glow out) and it shines in COLOR instead
 */
function glowingMaterial(original: THREE.MeshStandardMaterial, map: THREE.Texture): THREE.MeshStandardMaterial {
  const material = original.clone();
  material.emissive = COLOR;
  material.emissiveMap = map;
  material.emissiveIntensity = INTENSITY;
  material.toneMapped = false;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.chongGlow = { value: map };
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform sampler2D chongGlow;\nvoid main() {")
      .replace(
        "#include <map_fragment>",
        "#include <map_fragment>\n\tdiffuseColor.rgb *= 1.0 - texture2D( chongGlow, vMapUv ).r;"
      );
  };
  material.customProgramCacheKey = () => "chong-number-glow";
  return material;
}

const raycaster = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);

/** The 3D die drawn for a die id (the finished roll tags each with `userData.dieId`) */
function findDie(scene: THREE.Object3D, id: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  scene.traverse((object) => {
    if (!found && object.userData?.dieId === id) {
      found = object;
    }
  });
  return found;
}

/**
 * Nimble: the number facing up on the leftmost die of each dice term lights up, once the roll has
 * landed (every player's copy of the tray). Command rolls only.
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
    if (ids.length === 0) {
      return;
    }
    let cancelled = false;
    const undo: (() => void)[] = [];
    loadDigits()
      .then((lit) => {
        if (cancelled) {
          return;
        }
        for (const id of ids) {
          const die = findDie(scene, id);
          const position = transforms[id]?.position;
          if (!die || !position) {
            continue;
          }
          die.updateWorldMatrix(true, true);
          // Straight down onto the die: the first hit is its top face
          raycaster.set(new THREE.Vector3(position.x, 3, position.z), DOWN);
          const hit = raycaster.intersectObject(die, true).find((h) => h.uv && h.object instanceof THREE.Mesh);
          if (!hit || !hit.uv) {
            continue;
          }
          const mesh = hit.object as THREE.Mesh;
          const map = glowMap(lit, hit.uv.x, hit.uv.y);
          if (!map) {
            continue;
          }
          const original = mesh.material as THREE.MeshStandardMaterial;
          const glowing = glowingMaterial(original, map);
          mesh.material = glowing;
          undo.push(() => {
            mesh.material = original;
            glowing.dispose();
            map.dispose();
          });
        }
        invalidate();
      })
      .catch(() => {
        // No mask: no highlight
      });
    return () => {
      cancelled = true;
      undo.forEach((fn) => fn());
      invalidate();
    };
  }, [ids, transforms, scene, invalidate]);

  return null;
}
