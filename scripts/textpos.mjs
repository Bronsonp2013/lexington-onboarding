import { readFileSync } from "node:fs";
import * as mupdf from "mupdf";
const [src, pageNo, filter] = process.argv.slice(2);
const doc = mupdf.Document.openDocument(readFileSync(src), "application/pdf");
const page = doc.loadPage(Number(pageNo) - 1);
const st = JSON.parse(page.toStructuredText().asJSON());
for (const b of st.blocks) for (const l of b.lines) {
  const t = l.text.trim(); if (!t) continue;
  if (filter && !t.toUpperCase().includes(filter.toUpperCase())) continue;
  const [x0,y0,x1,y1] = l.bbox ? [l.bbox.x, l.bbox.y, l.bbox.x + l.bbox.w, l.bbox.y + l.bbox.h] : [0,0,0,0];
  console.log(`[${x0.toFixed(0)},${y0.toFixed(0)}-${x1.toFixed(0)},${y1.toFixed(0)}] ${t.slice(0,90)}`);
}
