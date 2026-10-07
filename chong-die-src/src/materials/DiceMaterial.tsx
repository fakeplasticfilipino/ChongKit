import { DiceStyle } from "../types/DiceStyle";
import { GalaxyMaterial } from "./galaxy/GalaxyMaterial";
import { GemstoneMaterial } from "./gemstone/GemstoneMaterial";
import { GlassMaterial } from "./glass/GlassMaterial";
import { IronMaterial } from "./iron/IronMaterial";
import { NebulaMaterial } from "./nebula/NebulaMaterial";
import { SunriseMaterial } from "./sunrise/SunriseMaterial";
import { SunsetMaterial } from "./sunset/SunsetMaterial";
import { WalnutMaterial } from "./walnut/WalnutMaterial";

/** Extra material props (e.g. a faded die's opacity) pass through to the style's material */
export function DiceMaterial({
  diceStyle,
  ...props
}: {
  diceStyle: DiceStyle;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
}) {
  switch (diceStyle) {
    case "GALAXY":
      return <GalaxyMaterial {...props} />;
    case "GEMSTONE":
      return <GemstoneMaterial {...props} />;
    case "GLASS":
      return <GlassMaterial {...props} />;
    case "IRON":
      return <IronMaterial {...props} />;
    case "NEBULA":
      return <NebulaMaterial {...props} />;
    case "SUNRISE":
      return <SunriseMaterial {...props} />;
    case "SUNSET":
      return <SunsetMaterial {...props} />;
    case "WALNUT":
      return <WalnutMaterial {...props} />;
    default:
      throw Error(`Dice style ${diceStyle} error: not implemented`);
  }
}
