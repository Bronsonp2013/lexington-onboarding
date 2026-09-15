// Render PDF pages to PNG with MuPDF: node scripts/render.mjs <pdf> <outPrefix> [pages e.g. 1,2]
import { readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
const [src, prefix, pagesArg] = process.argv.slice(2);
const doc = mupdf.Document.openDocument(readFileSync(src), "application/pdf");
const pages = pagesArg ? pagesArg.split(",").map(Number) : Array.from({ length: doc.countPages() }, (_, i) => i + 1);
for (const p of pages) {
  const page = doc.loadPage(p - 1);
  const pix = page.toPixmap(mupdf.Matrix.scale(1.6, 1.6), mupdf.ColorSpace.DeviceRGB, false, true);
  writeFileSync(`${prefix}-p${p}.png`, pix.asPNG());
  console.log("wrote", `${prefix}-p${p}.png`);
}
