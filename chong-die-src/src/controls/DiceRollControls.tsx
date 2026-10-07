import { useEffect, useMemo, useState } from "react";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Fade from "@mui/material/Fade";
import { useTheme, keyframes } from "@mui/material/styles";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";

import CloseIcon from "@mui/icons-material/CloseRounded";
import HiddenIcon from "@mui/icons-material/VisibilityOffRounded";
import RollIcon from "@mui/icons-material/ArrowForwardRounded";

import { RerollDiceIcon } from "../icons/RerollDiceIcon";

import { GradientOverlay } from "./GradientOverlay";
import { useDiceRollStore } from "../dice/store";
import { DiceResults } from "./DiceResults";
import { useDiceControlsStore } from "./store";
import { DiceType } from "../types/DiceType";
import { rollPickedDice, startCommandRoll } from "../chong/rollRunner";
import { placeCommand } from "../chong/place";
import { useTrayStore } from "../chong/trayStore";

const jiggle = keyframes`
0% { transform: translate(0, 0) rotate(0deg); }
25% { transform: translate(2px, 2px) rotate(2deg); }
50% { transform: translate(0, 0) rotate(0deg); }
75% { transform: translate(-2px, 2px) rotate(-2deg); }
100% { transform: translate(0, 0) rotate(0deg); }
`;

export function DiceRollControls() {
  const defaultDiceCounts = useDiceControlsStore(
    (state) => state.defaultDiceCounts
  );

  const counts = useDiceControlsStore((state) => state.diceCounts);
  // No dice picked by hand
  const isDefault = useMemo(
    () =>
      Object.entries(defaultDiceCounts).every(
        ([type, count]) => counts[type as DiceType] === count
      ),
    [counts, defaultDiceCounts]
  );

  const rollValues = useDiceRollStore((state) => state.rollValues);
  const isCommandRoll = useDiceRollStore((state) => Boolean(state.roll?.chong));
  const finishedRolling = useMemo(() => {
    const values = Object.values(rollValues);
    if (values.length === 0) {
      // A command roll of only virtual dice has no 3D dice
      return isCommandRoll;
    } else {
      return values.every((value) => value !== null);
    }
  }, [rollValues, isCommandRoll]);

  if (!isDefault) {
    return (
      <Fade in>
        <span>
          <DicePickedControls />
        </span>
      </Fade>
    );
  } else if (finishedRolling) {
    return (
      <Fade in>
        <span>
          <FinishedRollControls />
        </span>
      </Fade>
    );
  } else {
    return null;
  }
}

function DicePickedControls() {
  const defaultDiceCounts = useDiceControlsStore(
    (state) => state.defaultDiceCounts
  );
  const counts = useDiceControlsStore((state) => state.diceCounts);
  const hidden = useDiceControlsStore((state) => state.diceHidden);
  const placed = useTrayStore((state) => state.placed);
  const resetDiceCounts = useDiceControlsStore(
    (state) => state.resetDiceCounts
  );

  /**
   * Throw what's on the tray: a placed command (typed, a pill, Chong's Tracker) rolls as itself,
   * dice picked by hand roll as a command too (so Nimble highlights and explosions work).
   * The longer Roll is held, the harder the throw
   */
  function handleRoll() {
    if (hasDice && rollPressTime) {
      const activeTimeSeconds = (performance.now() - rollPressTime) / 1000;
      const speedMultiplier = Math.max(1, Math.min(10, activeTimeSeconds * 2));
      if (placed) {
        try {
          startCommandRoll(placed, { hidden, speedMultiplier });
        } catch (e) {
          useTrayStore.getState().setError(e instanceof Error ? e.message : "Can't roll this");
          handleReset();
        }
      } else if (rollPickedDice({ hidden, speedMultiplier })) {
        handleReset();
      }
    }
    setRollPressTime(null);
  }

  function handleReset() {
    resetDiceCounts();
  }

  const rollPressTime = useDiceControlsStore(
    (state) => state.diceRollPressTime
  );
  const setRollPressTime = useDiceControlsStore(
    (state) => state.setDiceRollPressTime
  );

  function handlePointerDown() {
    setRollPressTime(performance.now());
  }

  useEffect(() => {
    if (rollPressTime) {
      const handlePointerUp = () => {
        setRollPressTime(null);
      };
      window.addEventListener("pointerup", handlePointerUp);
      return () => {
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [rollPressTime]);

  const hasDice = useMemo(
    () =>
      !Object.entries(defaultDiceCounts).every(
        ([type, count]) => counts[type as DiceType] === count
      ),
    [counts, defaultDiceCounts]
  );

  const theme = useTheme();

  return (
    <>
      <ButtonBase
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          cursor: hasDice ? "pointer" : "",
          backgroundColor: "rgba(0, 0, 0, 0.25)",
          ":focus": {
            outline: 0,
          },
          ":hover #dice-roll-button": hasDice
            ? {
                color: theme.palette.primary.contrastText,
                width: "100px",
                "& span": {
                  transform: "translateX(0)",
                },
                backgroundColor: theme.palette.primary.main,
              }
            : {},
          ":active #dice-roll-button": hasDice
            ? {
                backgroundColor: theme.palette.primary.dark,
              }
            : {},
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handleRoll}
        aria-label="roll"
        disabled={!hasDice}
      >
        <Box
          component="div"
          sx={{
            ":active": {
              animation: `${jiggle} 0.3s infinite`,
            },
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <Button
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: hasDice ? "transparent" : "transparent !important",
              "& span": {
                transform: "translate(-23px)",
                color: theme.palette.primary.contrastText,
                transition: theme.transitions.create("transform"),
              },
              transition: theme.transitions.create([
                "width",
                "color",
                "background-color",
              ]),
              minWidth: 0,
              width: "36px",
              overflow: "hidden",
              borderRadius: "20px",
            }}
            endIcon={<RollIcon />}
            variant="contained"
            disabled={!hasDice}
            id="dice-roll-button"
            // @ts-ignore
            component="div"
          >
            Roll
          </Button>
        </Box>
      </ButtonBase>
      <GradientOverlay top />
      <Stack
        sx={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Tooltip title="Clear" disableInteractive>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      {/* The command waiting to be thrown */}
      {placed && (
        <Typography
          noWrap
          sx={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            textAlign: "center",
            color: "white",
            fontFamily: "'Roboto Mono', Consolas, monospace",
            fontSize: 13,
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.8)",
            pointerEvents: "none",
          }}
        >
          {placed}
        </Typography>
      )}
    </>
  );
}

function FinishedRollControls() {
  const roll = useDiceRollStore((state) => state.roll);
  const clearRoll = useDiceRollStore((state) => state.clearRoll);
  const reroll = useDiceRollStore((state) => state.reroll);

  const rollValues = useDiceRollStore((state) => state.rollValues);
  const finishedRollValues = useMemo(() => {
    const values: Record<string, number> = {};
    for (const [id, value] of Object.entries(rollValues)) {
      if (value !== null) {
        values[id] = value;
      }
    }
    return values;
  }, [rollValues]);

  const [resultsExpanded, setResultsExpanded] = useState(false);

  return (
    <>
      <GradientOverlay top height={resultsExpanded ? 500 : undefined} />
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          pointerEvents: "none",
          padding: 3,
        }}
        component="div"
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          width="100%"
          alignItems="start"
        >
          <Tooltip title="Reroll" sx={{ pointerEvents: "all" }}>
            <IconButton
              onClick={() => {
                if (roll?.chong) {
                  // Waves and keys belong to the old roll: its dice go back on the tray to throw again
                  try {
                    placeCommand(roll.chong.command, { hidden: Boolean(roll.hidden) });
                  } catch (e) {
                    useTrayStore.getState().setError(e instanceof Error ? e.message : "Can't roll this");
                  }
                } else {
                  reroll();
                }
              }}
              sx={{ pointerEvents: "all", color: "white" }}
            >
              <RerollDiceIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear" sx={{ pointerEvents: "all" }}>
            <IconButton
              onClick={() => clearRoll()}
              sx={{ pointerEvents: "all", color: "white" }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Stack
        sx={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          padding: 3,
          alignItems: "center",
        }}
        component="div"
      >
        {roll && (
          <DiceResults
            diceRoll={roll}
            rollValues={finishedRollValues}
            expanded={resultsExpanded}
            onExpand={setResultsExpanded}
          />
        )}
        {roll?.hidden && (
          <Tooltip title="Hidden Roll" sx={{ pointerEvents: "all" }}>
            <HiddenIcon htmlColor="white" />
          </Tooltip>
        )}
      </Stack>
    </>
  );
}
