// Builds the packet: filled Lexington PDFs + summary + submission.json + uploads, zipped.
import JSZip from "jszip";
import { fillDesignerApp, fillRetailApp } from "./pdf/creditApps.js";
import { fillE595E } from "./pdf/e595e.js";
import { fillFreightAgreement } from "./pdf/freight.js";
import { fillCardForm } from "./pdf/ccForm.js";
import { buildSummary } from "./pdf/summary.js";
import { slug } from "./store.js";

export async function buildPacket(d, files = {}, opts = {}, onProgress = () => {}) {
  const out = [];
  const warnings = [];
  const company = slug(d.company.legal_name);
  const add = async (label, name, promise) => {
    onProgress(label);
    const { doc, missing } = await promise;
    if (missing?.length) warnings.push(`${name}: fields not found — ${missing.join(", ")}`);
    const bytes = await doc.save({ useObjectStreams: false });
    out.push({ name, blob: new Blob([bytes], { type: "application/pdf" }), bytes: bytes.length, kind: "pdf" });
  };

  if (d.path === "retail") await add("Credit application", `01 Credit Application - ${company}.pdf`, fillRetailApp(d, opts));
  else await add("Interior designer credit application", `01 Interior Designer Credit Application - ${company}.pdf`, fillDesignerApp(d, opts));
  await add("Certificate of exemption", `02 E-595E Certificate of Exemption - ${company}.pdf`, fillE595E(d));
  if (d.shipping.carrier === "lfi") await add("Freight agreement", `03 Prepaid Freight Program Agreement - ${company}.pdf`, fillFreightAgreement(d, opts));
  if (d.path === "designer") await add("Credit card form", `04 Credit Card Transaction Form - ${company} (card details by phone).pdf`, fillCardForm(d, opts));

  onProgress("Application summary");
  const summary = await buildSummary(d, opts);
  const sBytes = await summary.save();
  out.push({ name: `00 Application Summary - ${company}.pdf`, blob: new Blob([sBytes], { type: "application/pdf" }), bytes: sBytes.length, kind: "pdf" });

  if (files.cert) out.push({ name: `Attachment - Tax Certificate - ${files.cert.name}`, blob: files.cert, bytes: files.cert.size, kind: "upload" });
  if (files.financial) out.push({ name: `Attachment - Financial Statement - ${files.financial.name}`, blob: files.financial, bytes: files.financial.size, kind: "upload" });

  const json = JSON.stringify(stripForJson(d), null, 2);
  out.push({ name: "submission.json", blob: new Blob([json], { type: "application/json" }), bytes: json.length, kind: "json" });

  onProgress("Packaging");
  const zip = new JSZip();
  for (const f of out) zip.file(f.name, f.blob);
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const zipName = `LHB-New-Account-${company}-${(d.meta.submitted_at || new Date().toISOString()).slice(0, 10)}.zip`;
  out.sort((a, b) => a.name.localeCompare(b.name));
  return { files: out, zipBlob, zipName, json, warnings };
}

// The signature image stays in the JSON so the rep tools can regenerate forms.
function stripForJson(d) {
  return d;
}

export { downloadBlob } from "./download.js";
