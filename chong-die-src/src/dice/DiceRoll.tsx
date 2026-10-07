import { Physics, useRapier } from "@react-three/rapier";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDieDensity } from "../helpers/getDieDensity";
import { preSimulate, SimObstacle, Track } from "../helpers/preSimulate";
import { PlaybackDice } from "./PlaybackDice";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { TrayColliders } from "../colliders/TrayColliders";
import { DiceRoll as DiceRollType } from "../types/DiceRoll";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";
import { Die } from "../types/Die";
import { Dice as DefaultDice } from "./Dice";
import { PhysicsDice } from "./PhysicsDice";
import { Highlights } from "../chong/Highlights";
import { fadedDice, isCurrentMeta } from "../chong/rollMeta";

export function DiceRoll({
  roll,
  rollThrows,
  onRollFinished,
  finishedTransforms,
  transformsRef,
  Dice,
}: {
  roll: DiceRollType;
  rollThrows: Record<string, DiceThrow>;
  onRollFinished?: (
    id: string,
    number: number,
    transform: DiceTransform
  ) => void;
  finishedTransforms?: Record<string, DiceTransform>;
  /** An updated ref of the current dice transforms */
  transformsRef?: React.MutableRefObject<Record<
    string,
    DiceTransform | null
  > | null>;
  /** Override to provide a custom Dice component  */
  Dice: React.FC<JSX.IntrinsicElements["group"] & { die: Die; faded?: boolean }>;
}) {

  const dice = useMemo(() => roll && getDieFromDice(roll), [roll]);
  // Chong Die: dice the roll dropped are drawn faded once they have landed
  const faded = useMemo(() => new Set(fadedDice(roll)), [roll]);
  // Chong Die: each die lands on the record's face (every tray that has the record turns its dice)
  const faces = isCurrentMeta(roll?.chong) ? roll.chong.faces : undefined;

  const emptyCallback = useCallback(() => {}, []);

  // Use a fixed transform if we have it
  // This allows re-rolling of individual dice as
  // we can lock the dice that are already in the tray
  const fixedTransformOf = (die: Die) => transformsRef?.current?.[die.id] || undefined;

  // Chong Die: each die's pre-simulated throw, by die id, made once (a die keeps its path while
  // others land or are thrown again)
  const tracksRef = useRef(new Map<string, Track>());
  const playback =
    !finishedTransforms && faces
      ? (dice ?? []).filter(
          (die) => !fixedTransformOf(die) && faces[die.id] !== undefined && rollThrows[die.id]
        )
      : [];
  const obstacles = (dice ?? []).flatMap((die) => {
    const transform = fixedTransformOf(die);
    return transform ? [{ type: die.type, transform }] : [];
  });
  useEffect(() => {
    const ids = new Set(dice?.map((die) => die.id));
    for (const id of tracksRef.current.keys()) {
      if (!ids.has(id)) tracksRef.current.delete(id);
    }
  }, [dice]);

  /**
   * Because we recreate the physics world every new roll
   * there is a frame where all the rigid bodies need to be created
   * to ensure smooth playback we pause the physics sim until
   * the frame after everything is created
   */
  const [paused, setPaused] = useState(true);
  useEffect(() => {
    if (finishedTransforms) {
      setPaused(true);
    } else {
      requestAnimationFrame(() => {
        setPaused(false);
      });
    }
  }, [finishedTransforms]);

  if (finishedTransforms) {
    // Move to a static dice representation when all dice values have been found
    return (
      <group>
        {dice?.map((die) => {
          const dieTransform = finishedTransforms[die.id]!;
          const p = dieTransform.position;
          const r = dieTransform.rotation;
          return (
            <Dice
              userData={{ dieId: die.id }}
              key={die.id}
              die={die}
              position={[p.x, p.y, p.z]}
              quaternion={[r.x, r.y, r.z, r.w]}
              faded={faded.has(die.id)}
            />
          );
        })}
        {/* Chong Die: the Primary Die of a group that crit or missed gets an outline (from the record) */}
        <Highlights roll={roll} transforms={finishedTransforms} />
      </group>
    );
  } else {
    // If we have physics states for the dice then create a Rapier physics
    // instance for this roll.
    // We need to re-create the physics world on every new roll as the dice
    // networking relies on the deterministic nature of Rapier when given the
    // same inputs and using the same number of update timesteps.
    return (
      <Physics
        colliders={false}
        interpolate={false}
        timeStep={1 / 120}
        updateLoop="independent"
        paused={paused}
      >
        <TrayColliders />
        {/* Chong Die: dice with a record face play a pre-simulated throw that lands on it */}
        <PlaybackDiceSet
          dice={playback}
          obstacles={obstacles}
          rollThrows={rollThrows}
          faces={faces ?? {}}
          paused={paused}
          tracks={tracksRef.current}
          onRollFinished={onRollFinished}
          Dice={Dice}
          faded={faded}
        />
        {dice?.map((die) => {
          if (playback.includes(die)) {
            return null;
          }
          const dieThrow = rollThrows[die.id];
          const fixedTransform = fixedTransformOf(die);
          return (
            <PhysicsDice
              key={die.id}
              die={die}
              dieThrow={dieThrow}
              onRollFinished={onRollFinished}
              fixedTransform={fixedTransform}
              forcedFace={faces?.[die.id]}
            >
              {/* Override onClick event to make sure simulated dice can't be selected */}
              <Dice
                die={die}
                onClick={emptyCallback}
                onPointerDown={emptyCallback}
                faded={Boolean(fixedTransform) && faded.has(die.id)}
              />
            </PhysicsDice>
          );
        })}
      </Physics>
    );
  }
}

DiceRoll.defaultProps = {
  Dice: DefaultDice,
};

/**
 * Chong Die: dice thrown together, pre-simulated as one throw (with the dice already lying in the
 * tray as obstacles) and played back. A die whose pre-simulation fails rolls live and turns onto its
 * face once it settles.
 */
function PlaybackDiceSet({
  dice,
  obstacles,
  rollThrows,
  faces,
  paused,
  tracks,
  onRollFinished,
  Dice,
  faded,
}: {
  dice: Die[];
  obstacles: SimObstacle[];
  rollThrows: Record<string, DiceThrow>;
  faces: Record<string, number>;
  paused: boolean;
  tracks: Map<string, Track>;
  onRollFinished?: (id: string, number: number, transform: DiceTransform) => void;
  Dice: React.FC<JSX.IntrinsicElements["group"] & { die: Die; faded?: boolean }>;
  faded: Set<string>;
}) {
  const { rapier } = useRapier();
  const emptyCallback = useCallback(() => {}, []);

  const missing = dice.filter((die) => !tracks.has(die.id));
  if (missing.length) {
    try {
      const made = preSimulate(
        rapier,
        missing.map((die) => ({
          type: die.type,
          density: getDieDensity(die),
          dieThrow: rollThrows[die.id],
        })),
        obstacles
      );
      missing.forEach((die, i) => tracks.set(die.id, made[i]));
    } catch (e) {
      console.warn("Pre-simulation failed: rolling live", e);
    }
  }

  return (
    <>
      {dice.map((die) => {
        const track = tracks.get(die.id);
        const model = (landed: boolean) => (
          <Dice
            die={die}
            onClick={emptyCallback}
            onPointerDown={emptyCallback}
            faded={landed && faded.has(die.id)}
          />
        );
        return track ? (
          <PlaybackDice
            key={die.id}
            die={die}
            track={track}
            forcedFace={faces[die.id]}
            paused={paused}
            onRollFinished={onRollFinished}
          >
            {model}
          </PlaybackDice>
        ) : (
          <PhysicsDice
            key={die.id}
            die={die}
            dieThrow={rollThrows[die.id]}
            onRollFinished={onRollFinished}
            forcedFace={faces[die.id]}
          >
            {model(false)}
          </PhysicsDice>
        );
      })}
    </>
  );
}
