/// <reference types="vitest" />
import { defineConfig } from "vite";
// @ts-ignore
import { resolve } from "path";
import react from "@vitejs/plugin-react";

declare var __dirname: string;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served by GitHub Pages under /ChongKit/chong-die/
  base: "/ChongKit/chong-die/",
  assetsInclude: ["**/*.glb", "**/*.hdr"],
  build: {
    outDir: "../chong-die",
    // Keep chong-die/TRACKER.md
    emptyOutDir: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        popover: resolve(__dirname, "popover.html"),
        background: resolve(__dirname, "background.html"),
      },
      output: {
        // One chunk per library (`vendor-three`, `vendor-mui-material` …): using a new part of one
        // library rebuilds only that library's chunk, so the committed build doesn't grow by the
        // whole 3 MB of libraries each time
        manualChunks: vendorChunk,
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});

/**
 * Libraries by how often they change, biggest and steadiest on their own: the Rapier physics engine
 * (2 MB) and three.js never change, React hardly ever; MUI changes when the app uses a new
 * component, the 3D helpers (drei and friends) when it uses a new one of those. First match wins
 */
const VENDOR_GROUPS: [RegExp, string][] = [
  [/^dimforge-/, "rapier"],
  [/^three$/, "three"],
  [/^(react|react-dom|scheduler)$/, "react"],
  [/^(mui-|emotion-|popperjs-|react-transition-group$|stylis$|dom-helpers$)/, "mui"],
  [
    /^(react-three-|three-|react-reconciler$|react-spring-|troika-|use-gesture-|camera-controls$|maath$|meshline$|detect-gpu$|stats-js$|ktx-parse$|zstddec$|potpack$|fflate$|its-fine$|suspend-react$|react-use-measure$|chevrotain|regexp-to-ast$|mmd-parser$|opentype-js$|webgl-sdf-generator$|bidi-js$|mediapipe-|react-composer$|react-merge-refs$|use-asset$|debounce$)/,
    "3d",
  ],
];

/** The vendor chunk for a module from node_modules (`vendor-three` …; anything else: `vendor-libs`) */
function vendorChunk(id: string): string | undefined {
  // Rollup's CommonJS helpers go with React, which every other chunk imports anyway (left to
  // Rollup, they land in a chunk that changes, and every library chunk rebuilds with it)
  if (id.includes("commonjsHelpers")) {
    return "vendor-react";
  }
  const path = id.split("\\").join("/");
  const at = path.lastIndexOf("/node_modules/");
  // CommonJS wrappers can name a package bare (`\0react/jsx-runtime`): same package, same chunk
  const bare = /^\0+([@a-z][^:?]*)/i.exec(path);
  if (at === -1 && !bare) {
    return undefined;
  }
  const parts = (at === -1 ? bare![1] : path.slice(at + "/node_modules/".length)).split("/");
  const name = parts[0].startsWith("@") ? `${parts[0].slice(1)}-${parts[1]}` : parts[0];
  const group = VENDOR_GROUPS.find(([match]) => match.test(name));
  return `vendor-${group ? group[1] : "libs"}`;
}
