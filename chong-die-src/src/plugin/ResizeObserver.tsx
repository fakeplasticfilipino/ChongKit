import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";
import throttle from "lodash.throttle";

import { windowWidth } from "../chong/layout";

const THROTTLE_TIME = 100;

/**
 * Observe window resize and make sure the plugin keeps its aspect ratio,
 * plus the Rolls panel's width while it's shown (`wide`). One step: stepping the width
 * through Owlbear looks laggy, so the panel fades instead (App)
 */
export function ResizeObserver({ wide }: { wide: boolean }) {
  useEffect(() => {
    const handleResize = throttle(() => {
      OBR.action.setWidth(windowWidth(window.innerHeight, wide));
    }, THROTTLE_TIME);

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      handleResize.cancel();
      window.removeEventListener("resize", handleResize);
    };
  }, [wide]);

  return null;
}
