import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "./scripts/copy-rep-forms.js";

// LOCAL-ONLY rep tools build. Emits to dist-rep/ and includes the rep
// checklist template. Never deploy this folder.
export default defineConfig({
  plugins: [react(), viteStaticCopy()],
  server: { host: true },
  build: {
    outDir: "dist-rep",
    rollupOptions: { input: { main: "index.html", rep: "rep.html" } },
  },
});
