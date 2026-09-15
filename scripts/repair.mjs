// Repair PDFs that pdf-lib cannot parse (broken xref) by round-tripping through MuPDF,
// and print their widget names/rects.
import { readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
const [src, dst] = process.argv.slice(2);
const doc = mupdf.Document.openDocument(readFileSync(src), "application/pdf");
console.log("pages:", doc.countPages());
for (let i = 0; i < doc.countPages(); i++) {
  const page = doc.loadPage(i);
  const [x0, y0, x1, y1] = page.getBounds();
  console.log(`p${i + 1} ${x1 - x0}x${y1 - y0}`);
  for (const w of page.getWidgets()) {
    const r = w.getBounds();
    console.log(`  - ${w.getName()} type=${w.getFieldType()} rect=[${r.map(v => v.toFixed(0)).join(",")}] flags=${w.getFieldFlags()}`);
  }
}
if (dst) { writeFileSync(dst, doc.saveToBuffer("garbage=2,compress,decrypt").asUint8Array()); console.log("wrote", dst); }
