import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";
import throttle from "lodash.throttle";

import { usePrefsStore } from "../chong/prefsStore";
import { windowWidth } from "../chong/layout";

const THROTTLE_TIME = 100;

/**
 * Observe window resize and make sure the plugin keeps its aspect ratio,
 * plus the Rolls panel's width while it's open
 */
export function ResizeObserver() {
  const panelOpen = usePrefsStore((state) => state.prefs.panelOpen);

  useEffect(() => {
    const handleResize = throttle(() => {
      OBR.action.setWidth(windowWidth(window.innerHeight, panelOpen));
    }, THROTTLE_TIME);

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [panelOpen]);

  return null;
}
