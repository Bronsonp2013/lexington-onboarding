// Dump AcroForm field names/types for every PDF template so fill maps can be written.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

const dirs = ["public/forms", "rep-forms"];
let out = "# AcroForm fields per template\n\n";
for (const dir of dirs) {
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".pdf"))) {
    const doc = await PDFDocument.load(readFileSync(`${dir}/${f}`), { ignoreEncryption: true });
    const form = doc.getForm();
    out += `## ${dir}/${f}\n\n`;
    for (const fld of form.getFields()) {
      const type = fld.constructor.name.replace("PDF", "");
      const widgets = fld.acroField.getWidgets();
      const w = widgets[0];
      let rect = "";
      let page = "";
      if (w) {
        const r = w.getRectangle();
        rect = `[${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.width.toFixed(0)}x${r.height.toFixed(0)}]`;
        const pRef = w.P();
        const idx = doc.getPages().findIndex((p) => p.ref === pRef);
        page = idx >= 0 ? `p${idx + 1}` : "";
      }
      let extra = "";
      if (type === "CheckBox") { try { extra = " on=" + fld.acroField.getOnValue()?.encodedName; } catch {} }
      if (type === "RadioGroup") { extra = " opts=" + JSON.stringify(fld.getOptions()); }
      if (type === "Dropdown" || type === "OptionList") { extra = " opts=" + JSON.stringify(fld.getOptions()); }
      out += `- \`${fld.getName()}\` ${type} ${page} ${rect}${extra}\n`;
    }
    out += "\n";
  }
}
writeFileSync("src/lib/pdf/fields.md", out);
console.log(out);
