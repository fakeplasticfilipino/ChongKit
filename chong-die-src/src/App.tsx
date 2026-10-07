import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import { useEffect, useState } from "react";

import { InteractiveTray } from "./tray/InteractiveTray";
import { RollPanel } from "./chong/RollPanel";
import { usePrefsStore, listenForPrefChanges } from "./chong/prefsStore";
import { PANEL_FADE_MS, PANEL_WIDTH } from "./chong/layout";
import { LINE } from "./chong/look";

import { PluginGate } from "./plugin/PluginGate";
import { DiceRollSync } from "./plugin/DiceRollSync";
import { PartyTrays } from "./plugin/PartyTrays";
import { ResizeObserver as PluginResizeObserver } from "./plugin/ResizeObserver";

/**
 * The Rolls panel opening and closing without flicker: opening widens the window first and fades
 * the panel in once the window is wide enough; closing fades it out, then narrows the window
 */
function usePanelFade(open: boolean) {
  // In the layout (and the window wide for it)
  const [shown, setShown] = useState(open);
  // Faded in
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      const timeout = setTimeout(() => setShown(false), PANEL_FADE_MS);
      return () => clearTimeout(timeout);
    }
    setShown(true);
    // Fade in once Owlbear has widened the window (or soon anyway, e.g. outside Owlbear)
    const wideEnough = () => window.innerWidth >= window.innerHeight / 2 + PANEL_WIDTH - 2;
    // A short timer, not a frame: one drawn faded out first, so the fade-in shows
    let fadeIn = 0;
    const reveal = () => {
      if (wideEnough()) {
        stopWaiting();
        fadeIn = window.setTimeout(() => setVisible(true), 30);
      }
    };
    const fallback = setTimeout(() => {
      stopWaiting();
      setVisible(true);
    }, 300);
    const stopWaiting = () => {
      clearTimeout(fallback);
      window.removeEventListener("resize", reveal);
    };
    const cleanup = () => {
      stopWaiting();
      clearTimeout(fadeIn);
    };
    window.addEventListener("resize", reveal);
    reveal();
    return cleanup;
  }, [open]);

  return { shown, visible };
}

export function App() {
  const panelOpen = usePrefsStore((state) => state.prefs.panelOpen);
  const panel = usePanelFade(panelOpen);

  // Prefs changed in another Owlbear tab of this browser
  useEffect(() => listenForPrefChanges(), []);

  return (
    <Stack direction="row" sx={{ height: "100vh", "& > *": { flexShrink: 0 } }}>
      <InteractiveTray />
      {/* The Rolls panel docks to the right: tabs, the dice and your pills.
          The window widens to fit it (ResizeObserver); the tray never shrinks */}
      {panel.shown && (
        <Box
          component="div"
          sx={{
            width: PANEL_WIDTH,
            minWidth: PANEL_WIDTH,
            display: "flex",
            borderLeft: `1px solid ${LINE}`,
            opacity: panel.visible ? 1 : 0,
            transition: `opacity ${PANEL_FADE_MS}ms ease-out`,
            pointerEvents: panel.visible ? "auto" : "none",
          }}
        >
          <RollPanel />
        </Box>
      )}
      {/* Owlbear plumbing: runs with the panel closed too */}
      <PluginGate>
        <DiceRollSync />
        <PartyTrays />
        <PluginResizeObserver wide={panel.shown} />
      </PluginGate>
    </Stack>
  );
}
