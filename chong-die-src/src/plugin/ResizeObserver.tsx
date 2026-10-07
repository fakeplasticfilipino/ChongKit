import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";
import throttle from "lodash.throttle";

import { TRAY_ID, trayWidth } from "../chong/trayWindow";

const THROTTLE_TIME = 100;

/**
 * Observe window resize and make sure the tray window keeps its aspect ratio
 */
export function ResizeObserver() {
  useEffect(() => {
    const handleResize = throttle(() => {
      OBR.popover.setWidth(TRAY_ID, trayWidth(window.innerHeight));
    }, THROTTLE_TIME);

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}
