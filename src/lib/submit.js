// Delivery to the rep via Web3Forms (multipart with one zip attachment).
import { REP, MAX_PACKET_BYTES } from "../data/constants.js";
import { CONFIG } from "../config.js";
import { toSummaryText } from "./summaryText.js";

export const deliveryConfigured = () => !!CONFIG.web3formsKey;

export async function submitPacket(d, packet, opts = {}) {
  if (!deliveryConfigured()) throw new Error("Email delivery is not configured.");
  if (packet.zipBlob.size > MAX_PACKET_BYTES) {
    throw new Error(`The packet is ${(packet.zipBlob.size / 1024 / 1024).toFixed(1)} MB, above the 5 MB attachment limit. Please attach a smaller certificate file.`);
  }
  const c = d.company;
  const contact = d.path === "retail" ? d.contacts.owner : d.contacts.applicant;
  const fd = new FormData();
  fd.append("access_key", CONFIG.web3formsKey);
  fd.append("subject", `New account application — ${c.legal_name} (${d.meta.id})`);
  fd.append("from_name", "Lexington New Account Application");
  fd.append("email", contact.email || c.email);
  fd.append("name", contact.name || d.sign.full_name);
  fd.append("Application ID", d.meta.id);
  fd.append("Company", c.legal_name + (c.dba ? ` (dba ${c.dba})` : ""));
  fd.append("Business type", d.business_type);
  fd.append("Path", d.path);
  fd.append("Location", `${c.city}, ${c.state}`);
  fd.append("Phone", c.phone);
  fd.append("Carrier", d.shipping.carrier === "lfi" ? "Prepaid Freight Program" : `Preferred — ${d.shipping.preferred_carrier_name}`);
  fd.append("Files in packet", packet.files.map((f) => f.name).join("\n"));
  fd.append("Rep", `${REP.name} (${REP.territory})`);
  fd.append("summary", toSummaryText(d));
  fd.append("submission_json", packet.json);
  fd.append("attachment", new File([packet.zipBlob], packet.zipName, { type: "application/zip" }));
  fd.append("botcheck", "");
  if (opts.captchaToken) fd.append("h-captcha-response", opts.captchaToken);

  const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: fd });
  let body = null;
  try { body = await res.json(); } catch { /* non-json */ }
  if (!res.ok || !body?.success) {
    throw new Error(body?.message || `Delivery failed (${res.status}). Please download your packet and email it to ${REP.email}.`);
  }
  return body;
}

export function mailtoFallback(d) {
  const subject = encodeURIComponent(`New account application — ${d.company.legal_name} (${d.meta.id})`);
  const body = encodeURIComponent(
    `Hi ${REP.name.split(" ")[0]},\n\nAttached is my completed Lexington new account packet (${d.meta.id}).\n\n${d.company.legal_name}\n${d.company.phone}\n`,
  );
  return `mailto:${REP.email}?subject=${subject}&body=${body}`;
}
