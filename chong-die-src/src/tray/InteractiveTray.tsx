import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";

import Box from "@mui/material/Box";

import { InteractiveDiceRoll } from "../dice/InteractiveDiceRoll";
import { DiceRollControls } from "../controls/DiceRollControls";
import environment from "../environment.hdr";
import { AudioListenerProvider } from "../audio/AudioListenerProvider";
import { Tray } from "./Tray";
import { TraySuspense } from "./TraySuspense";
import { PreviewDiceRoll } from "../dice/PreviewDiceRoll";
import { useWaveRunner } from "../chong/rollRunner";
import { TrayError } from "../chong/TrayError";
import { CommandLine } from "../chong/CommandLine";
import { COMMAND_LINE_HEIGHT } from "../chong/layout";

/** Dice tray that controls the dice roll store */
export function InteractiveTray() {
  useWaveRunner();

  return (
    <Box
      component="div"
      borderRadius={1}
      height="100vh"
      width="calc(100vh / 2)"
      overflow="hidden"
      position="relative"
      id="interactive-tray"
      // Right-click explodes a die: no browser menu over the tray
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
      sx={{
        "& canvas": {
          touchAction: "manipulation",
          userSelect: "none",
        },
      }}
    >
      <TraySuspense>
        <Canvas frameloop="demand">
          <AudioListenerProvider>
            <Environment files={environment} />
            <ContactShadows
              resolution={256}
              scale={[1, 2]}
              position={[0, 0, 0]}
              blur={0.5}
              opacity={0.5}
              far={1}
              color="#222222"
            />
            <Tray />
            <PreviewDiceRoll />
            <InteractiveDiceRoll />
            <PerspectiveCamera
              makeDefault
              fov={28}
              position={[0, 4.3, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            />
          </AudioListenerProvider>
        </Canvas>
      </TraySuspense>
      {/* Upstream overlays sit below the command line */}
      <Box
        component="div"
        sx={{
          position: "absolute",
          top: COMMAND_LINE_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          "& > *": { pointerEvents: "auto" },
        }}
      >
        <DiceRollControls />
      </Box>
      <TrayError />
      <CommandLine />
    </Box>
  );
}
