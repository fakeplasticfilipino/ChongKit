import { useLayoutEffect, useRef } from "react";
import Box from "@mui/material/Box";

import { MarkdownText } from "./MarkdownText";

const LARGEST = 15;
const SMALLEST = 10;

/**
 * Chong Die: a command roll's breakdown along the bottom of the tray, always shown. Each line
 * (one per repetition) stays on one straight line if it can: its text shrinks to fit (15 px down
 * to 10 px) and only wraps when it still doesn't.
 */
export function BreakdownLine({ lines, bottom = 16 }: { lines: string[]; bottom?: number }) {
  return (
    <Box
      component="div"
      sx={{
        position: "absolute",
        bottom,
        left: 12,
        right: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.25,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {lines.map((line, i) => (
        <FitLine key={i} text={line} />
      ))}
    </Box>
  );
}

function FitLine({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const fit = () => {
      let size = LARGEST;
      el.style.whiteSpace = "nowrap";
      el.style.fontSize = `${size}px`;
      while (size > SMALLEST && el.scrollWidth > el.clientWidth) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
      if (el.scrollWidth > el.clientWidth) {
        el.style.whiteSpace = "normal";
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [text]);
  return (
    <Box
      ref={ref}
      component="div"
      sx={{
        width: "100%",
        overflow: "hidden",
        textAlign: "center",
        color: "white",
        lineHeight: 1.35,
        textShadow: "0 1px 3px rgba(0, 0, 0, 0.8)",
      }}
    >
      <MarkdownText text={text} />
    </Box>
  );
}
