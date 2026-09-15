// Prepaid Freight Program 2026 (LR123125). The agreement page has no form fields,
// so values are drawn onto page 2 at measured positions (bottom-left origin).
import { loadTemplate, drawText, stampSignature } from "./util.js";
import { fmtDate } from "../store.js";

export async function fillFreightAgreement(d, opts = {}) {
  const doc = await loadTemplate("/forms/prepaid-freight-2026.pdf");
  const f = d.freight;
  await drawText(doc, 1, [
    { text: d.company.legal_name, x: 128, y: 313, size: 10 },
    { text: opts.accountNumber || "", x: 452, y: 313, size: 10 },
    { text: f.authorized_name, x: 142, y: 278, size: 10 },
    { text: f.authorized_title, x: 404, y: 278, size: 10 },
    { text: fmtDate(f.date || d.sign.date), x: 414, y: 243, size: 10 },
    { text: f.state, x: 532, y: 243, size: 10 },
  ]);
  await stampSignature(doc, 1, d.sign.signature_png, { x: 166, y: 238, width: 190, height: 26 });
  return { doc, missing: [] };
}
