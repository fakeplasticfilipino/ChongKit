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
        // Libraries in their own chunk: unchanged between rebuilds, so the
        // committed build only grows by the app code
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
