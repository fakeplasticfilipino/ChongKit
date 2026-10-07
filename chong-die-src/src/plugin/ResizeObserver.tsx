import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef } from "react";
import throttle from "lodash.throttle";

import { usePrefsStore } from "../chong/prefsStore";
import { glideEase, PANEL_GLIDE_MS, windowWidth } from "../chong/layout";

const THROTTLE_TIME = 100;

/**
 * Observe window resize and make sure the plugin keeps its aspect ratio,
 * plus the Rolls panel's width while it's open. Opening or closing the panel glides the
 * window's width (a step each frame) instead of jumping
 */
export function ResizeObserver() {
  const panelOpen = usePrefsStore((state) => state.prefs.panelOpen);
  /** The width last asked of Owlbear (a glide starts from here) */
  const width = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;
    const setWidth = (value: number) => {
      width.current = value;
      OBR.action.setWidth(Math.round(value));
    };

    const from = width.current;
    const to = windowWidth(window.innerHeight, panelOpen);
    if (from === null || from === to) {
      setWidth(to);
    } else {
      const start = performance.now();
      const step = (now: number) => {
        const t = (now - start) / PANEL_GLIDE_MS;
        setWidth(from + (to - from) * glideEase(t));
        if (t < 1) {
          frame = requestAnimationFrame(step);
        }
      };
      frame = requestAnimationFrame(step);
    }

    // Only a new height resizes (the glide itself changes the width)
    let height = window.innerHeight;
    const handleResize = throttle(() => {
      if (window.innerHeight !== height) {
        height = window.innerHeight;
        cancelAnimationFrame(frame);
        setWidth(windowWidth(height, panelOpen));
      }
    }, THROTTLE_TIME);

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      handleResize.cancel();
      window.removeEventListener("resize", handleResize);
    };
  }, [panelOpen]);

  return null;
}
