import React from "react";
import { Die } from "../types/Die";

import { DiceMesh } from "../meshes/DiceMesh";
import { DiceMaterial } from "../materials/DiceMaterial";

/** How much of a faded die shows (Chong Die: a die the roll dropped), like the panel's muted text */
export const FADED_OPACITY = 0.4;

type DiceProps = JSX.IntrinsicElements["group"] & {
  die: Die;
  /** Chong Die: a dropped die, drawn see-through */
  faded?: boolean;
};

export const Dice = React.forwardRef<THREE.Group, DiceProps>(
  ({ die, faded, children, ...props }, ref) => {
    return (
      <DiceMesh
        diceType={die.type}
        {...props}
        sharp={die.style === "WALNUT"}
        ref={ref}
      >
        <DiceMaterial
          diceStyle={die.style}
          {...(faded ? { transparent: true, opacity: FADED_OPACITY, depthWrite: false } : {})}
        />
        {children}
      </DiceMesh>
    );
  }
);
