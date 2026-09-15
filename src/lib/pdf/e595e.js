// Streamlined Sales and Use Tax Agreement — Certificate of Exemption (E-595E).
import { loadTemplate, makeFiller, finalize, stampSignature } from "./util.js";
import { LHB, SSUTA_EXEMPT_REASONS } from "../../data/constants.js";
import { joinAddr, fmtDate } from "../store.js";

export async function fillE595E(d) {
  const doc = await loadTemplate("/forms/e595e.pdf");
  const form = doc.getForm();
  const f = makeFiller(form);
  const c = d.company;
  const t = d.tax;
  const extra = t.additional_states.filter((s) => s.state);

  if (extra.length) f.check("Check Box 1");
  else f.dropdown("State1", t.state);
  if (!t.blanket) { f.check("Check Box 2"); f.text("Purchase Order #", t.single_po); }

  f.text("Name of Purchaser", c.legal_name + (c.dba ? ` dba ${c.dba}` : ""));
  f.text("Business Address", joinAddr(c));
  f.text("City", c.city);
  f.dropdown("State2", c.state);
  f.text("Zip Code", c.zip);
  f.text("Tax ID Number", t.id_number);
  f.dropdown("State3", t.id_state || t.state);
  f.text("Country", "USA");
  f.text("FEIN", t.fein);
  f.text("Name of Seller", LHB.name);
  f.text("Seller's Address", LHB.address1);
  f.text("Seller's City", LHB.city);
  f.dropdown("State5", LHB.state);
  f.text("Seller's Zip Code", LHB.zip);

  if (t.business_kind) f.check(`Type of Business ${t.business_kind}`);
  if (t.business_kind === "20") f.text("Other", t.notes);

  if (t.reason) f.check(`Reason for Exemption ${t.reason}`);
  if (t.reason === "G") f.text("G", t.id_number);
  else if (t.reason === "L") f.text("L", t.reason_detail, 7);
  else if (t.reason) f.text(t.reason, t.reason_detail, 7);

  f.text("Print Name", d.sign.full_name, 8);
  f.text("Title 2", d.sign.title, 7);
  f.text("Date2", fmtDate(d.sign.date), 8);
  f.text("PhoneNumber", d.contacts.applicant.phone || c.phone);
  f.text("E-mailAdress", d.contacts.applicant.email || c.email);

  if (extra.length) {
    f.text("Name of Purchaser2", c.legal_name);
    for (const s of extra) {
      f.text(`Reason for exemption${s.state}`, s.reason || (SSUTA_EXEMPT_REASONS.find(([k]) => k === t.reason)?.[1] ?? ""), 8);
      f.text(`Identification number${s.state}`, s.id, 8);
    }
  }

  await finalize(doc, form);
  // Signature line sits left of "Print name" on page 1 (bottom-left origin).
  await stampSignature(doc, 0, d.sign.signature_png, { x: 74, y: 66, width: 180, height: 26 });
  return { doc, missing: f.missing };
}
