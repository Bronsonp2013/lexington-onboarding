import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const outDir = resolve(process.argv[2] || "tmp-packet"); mkdirSync(outDir, { recursive: true });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (typeof url === "string" && url.startsWith("/rep-forms/")) return new Response(readFileSync(resolve("." + url)), { status: 200 });
  if (typeof url === "string" && url.startsWith("/forms/")) return new Response(readFileSync(resolve("public" + url)), { status: 200 });
  return realFetch(url, init);
};
const { sampleDesigner, sampleRetail } = await import("../src/data/sample.js");
const { fillChecklist, suggestedClass, suggestedPricing } = await import("../src/lib/pdf/checklist.js");
for (const [kind, make] of [["designer", sampleDesigner], ["retail", sampleRetail]]) {
  const d = make();
  const { doc, missing } = await fillChecklist(d, { customerClass: suggestedClass(d), pricing: suggestedPricing(d), accountNumber: "", approvedBy: "", approvedDate: "", policies: true, dealerLocator: false });
  writeFileSync(resolve(outDir, `checklist-${kind}.pdf`), Buffer.from(await doc.save({ useObjectStreams: false })));
  console.log(kind, "class", suggestedClass(d), "pricing", JSON.stringify(suggestedPricing(d)), "missing", missing);
}
