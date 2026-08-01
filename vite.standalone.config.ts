import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Standalone single-page build (no SSR/router) used to produce the
// self-contained playable bundle. Not part of the normal app build.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    outDir: "dist-standalone",
    rollupOptions: { input: path.resolve(__dirname, "standalone.html") },
  },
});
