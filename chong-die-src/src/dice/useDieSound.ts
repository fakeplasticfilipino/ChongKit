import * as THREE from "three";
import { useCallback, useRef } from "react";

import { Die } from "../types/Die";
import { PhysicalMaterial } from "../types/PhysicalMaterial";
import { useAudioListener } from "../audio/AudioListenerProvider";
import { getNextBuffer } from "../audio/getAudioBuffer";
import { getDieWeightClass } from "../helpers/getDieWeightClass";

/** Cool down in MS before dice audio can get played again */
const AUDIO_COOLDOWN = 200;

/**
 * The sound of a die hitting something, played from `group` at a volume set by the die's speed.
 * Shared by the live dice (`PhysicsDice`) and the played-back ones (`PlaybackDice`).
 */
export function useDieSound(die: Die) {
  const listener = useAudioListener();
  const lastAudioTimeRef = useRef(0);
  return useCallback(
    (group: THREE.Object3D | null, material: PhysicalMaterial, speed: number) => {
      if (performance.now() - lastAudioTimeRef.current < AUDIO_COOLDOWN) {
        return;
      }
      if (!group || !listener) {
        return;
      }
      const buffer = getNextBuffer(getDieWeightClass(die), material);
      if (!buffer) {
        return;
      }
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
    },
    [listener, die]
  );
}
