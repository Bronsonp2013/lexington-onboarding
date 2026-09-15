// Assembles nas_deploy/ for the rep tools (LOCAL / TAILSCALE ONLY):
//   nas_deploy/
//     docker-compose.yml     (tracked)
//     README_NAS_SETUP.md    (tracked)
//     app/                   (from dist-rep/ — customer app + rep.html + rep-forms/; ignored by git)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist-rep");
const out = path.join(root, "nas_deploy");

if (!fs.existsSync(path.join(dist, "rep.html"))) {
  console.error("dist-rep/ is missing — run `npm run build:rep` first (or `npm run bundle:rep`).");
  process.exit(1);
}
if (!fs.existsSync(path.join(dist, "rep-forms", "new-account-checklist.pdf"))) {
  console.error("dist-rep/rep-forms/new-account-checklist.pdf is missing — the checklist template did not copy.");
  process.exit(1);
}
fs.rmSync(path.join(out, "app"), { recursive: true, force: true });
fs.cpSync(dist, path.join(out, "app"), { recursive: true });
console.log("nas_deploy/ is ready — copy the whole folder to the NAS at /volume1/docker/lexington-onboarding-rep/");
