import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Tiny plugin: copy rep-forms/ into the rep build output only.
export function viteStaticCopy() {
  let outDir = "dist-rep";
  return {
    name: "copy-rep-forms",
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const dst = resolve(outDir, "rep-forms");
      mkdirSync(dst, { recursive: true });
      copyFileSync(resolve("rep-forms/new-account-checklist.pdf"), resolve(dst, "new-account-checklist.pdf"));
    },
  };
}
