// Delivery to the ingestion endpoint (Google Apps Script). One POST carries the
// CustomerRecord, the raw submission, and every file as base64. The script writes
// the sheet, files Drive, emails the rep, creates the task, and queues Pathfinder.
import { REP } from "../data/constants.js";
import { CONFIG } from "../config.js";
import { toSummaryText } from "./summaryText.js";
import { toCustomerRecord, toApplicationRow } from "./crmRecord.js";

export const deliveryConfigured = () => !!CONFIG.ingestUrl;

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] || "");
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

export async function buildPayload(d, packet) {
  const record = toCustomerRecord(d, { fileNames: packet.files.map((f) => f.name) });
  const files = [];
  for (const f of packet.files) {
    if (f.kind === "json") continue; // the script writes submission.json itself
    files.push({ name: f.name, mime: f.blob.type || "application/octet-stream", base64: await blobToBase64(f.blob) });
  }
  return { action: "submit", record, row: toApplicationRow(record), submission: d, files, summary: toSummaryText(d), website: "" };
}

// Apps Script web apps accept cross-origin POSTs only as "simple" requests: text/plain
// body, no custom headers, follow the redirect. The JSON comes back readable.
export async function postToIngest(payload, url = CONFIG.ingestUrl) {
  if (!url) throw new Error("Ingest URL is not configured.");
  let res;
  try {
    res = await fetch(url, { method: "POST", body: JSON.stringify(payload), redirect: "follow" });
  } catch {
    throw new Error(`We could not reach the delivery service. Your answers are saved in this browser; please download the packet and email it to ${REP.email}, or try again in a few minutes.`);
  }
  let body = null;
  try { body = await res.json(); } catch { /* non-json */ }
  if (!res.ok || !body || body.ok === false) {
    throw new Error(body?.error || `Delivery failed (${res.status}). Please download your packet and email it to ${REP.email}.`);
  }
  return body;
}

export async function submitPacket(d, packet) {
  if (!deliveryConfigured()) throw new Error("Delivery is not configured.");
  const payload = await buildPayload(d, packet);
  return postToIngest(payload);
}

// Rep-only calls (list / get / status). Token lives in rep tools settings.
export async function repCall(action, token, params = {}, url = CONFIG.ingestUrl) {
  if (!token) throw new Error("Enter the rep token in Your details first.");
  return postToIngest({ action, token, ...params }, url);
}

export function mailtoFallback(d) {
  const subject = encodeURIComponent(`New account application — ${d.company.legal_name} (${d.meta.id})`);
  const body = encodeURIComponent(
    `Hi ${REP.name.split(" ")[0]},\n\nAttached is my completed Lexington new account packet (${d.meta.id}).\n\n${d.company.legal_name}\n${d.company.phone}\n`,
  );
  return `mailto:${REP.email}?subject=${subject}&body=${body}`;
}
