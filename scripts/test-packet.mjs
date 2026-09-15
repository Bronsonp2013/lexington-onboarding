// Node harness: builds packets for every sample case and writes the files to a folder.
// Usage: node scripts/test-packet.mjs <outDir> [case,case,...]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const outDir = resolve(process.argv[2] || "tmp-packet");
const only = (process.argv[3] || "").split(",").filter(Boolean);
mkdirSync(outDir, { recursive: true });

// fetch shim for /forms/* and /rep-forms/* templates
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (typeof url === "string" && url.startsWith("/forms/")) return new Response(readFileSync(resolve("public" + url)), { status: 200 });
  if (typeof url === "string" && url.startsWith("/rep-forms/")) return new Response(readFileSync(resolve("." + url)), { status: 200 });
  return realFetch(url, init);
};
globalThis.document = { createElement: () => ({ getContext: () => null }) };

// minimal PNG encoder for a fake signature scribble
export function makeSignaturePng(w = 420, h = 120) {
  const px = Buffer.alloc(w * h * 4, 0);
  const put = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; px[i] = 28; px[i + 1] = 34; px[i + 2] = 48; px[i + 3] = 255; };
  for (let x = 20; x < w - 20; x++) {
    const y = 60 + Math.sin(x / 18) * 28 + Math.sin(x / 5) * 6;
    for (let t = -2; t <= 2; t++) for (let u = -1; u <= 1; u++) put(x + u, Math.round(y) + t);
  }
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const crcTable = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  return "data:image/png;base64," + png.toString("base64");
}

const { sampleDesigner, sampleRetail } = await import("../src/data/sample.js");
const { emptyShipTo } = await import("../src/data/schema.js");
const { buildPacket } = await import("../src/lib/packet.js");

const CASES = {
  designer: () => sampleDesigner(),
  retail: () => sampleRetail(),
  // preferred carrier + acknowledgements by mail + single-purchase certificate
  designer_preferred: () => {
    const d = sampleDesigner();
    d.shipping = { partial_ok: true, carrier: "preferred", preferred_carrier_name: "Sunbelt or Rudisill" };
    d.company.ack_method = "mail";
    d.tax.blanket = false; d.tax.single_po = "PO-44812";
    return d;
  },
  // designer with two ship-tos and reason code L
  designer_two_shipto: () => {
    const d = sampleDesigner();
    d.ship_to.push({ ...emptyShipTo(), name: "Calloway Hart Studio", attention: "Elise", address1: "2410 Camp Bowie Boulevard", address2: "Suite 140", city: "Fort Worth", state: "TX", zip: "76107", phone: "(817) 555-0142", hours_open: "10:00", hours_close: "17:00", holidays: "Closed Mondays." });
    d.ship_to[1].days.Mon = { open: false, hours: "" };
    d.tax.reason = "L"; d.tax.reason_detail = "Purchases for resale to design clients";
    return d;
  },
  // retailer, one ship-to, preferred carrier, additional states on the E-595E
  retail_multistate: () => {
    const d = sampleRetail();
    d.ship_to = [d.ship_to[0]];
    d.shipping = { partial_ok: false, carrier: "preferred", preferred_carrier_name: "Estes" };
    d.tax.additional_states = [{ state: "AR", reason: "Resale", id: "AR-55-01923" }, { state: "KS", reason: "Resale", id: "KS-004-8871" }];
    d.references.financial_file = null;
    return d;
  },
};

for (const [kind, make] of Object.entries(CASES)) {
  if (only.length && !only.includes(kind)) continue;
  const d = make();
  d.meta.id = `LHB-TEST-${kind.toUpperCase()}`;
  d.meta.submitted_at = new Date().toISOString();
  d.sign.signature_png = makeSignaturePng();
  const files = { cert: new File([Buffer.from("%PDF-1.4 fake cert")], "cert.pdf", { type: "application/pdf" }) };
  const packet = await buildPacket(d, files, { iamNumber: "" }, () => {});
  const dir = resolve(outDir, kind); mkdirSync(dir, { recursive: true });
  for (const f of packet.files) writeFileSync(resolve(dir, f.name), Buffer.from(await f.blob.arrayBuffer()));
  writeFileSync(resolve(dir, packet.zipName), Buffer.from(await packet.zipBlob.arrayBuffer()));
  console.log(`${kind.padEnd(22)} zip ${(packet.zipBlob.size / 1024).toFixed(0).padStart(4)} KB  files ${packet.files.length}  warnings: ${packet.warnings.length ? packet.warnings.join(" | ") : "none"}`);
}
