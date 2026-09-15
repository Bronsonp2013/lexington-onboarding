import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Customer-facing build. Only index.html is emitted; rep.html and rep-forms/
// are never part of this bundle (see vite.rep.config.js).
// VITE_BASE lets the same build serve from a sub-path (GitHub Pages project site).
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  server: { host: true },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: { main: "index.html" },
      output: { manualChunks: { pdf: ["pdf-lib", "jszip"], react: ["react", "react-dom"] } },
    },
  },
});
