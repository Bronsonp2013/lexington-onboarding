// Plain-text summary of a submission: used in the delivery email body and the rep tools copy button.
import { BUSINESS_TYPES, ENTITY_TYPES, STATE_RATES, SSUTA_BUSINESS_KINDS, SSUTA_EXEMPT_REASONS, WEEKDAYS, REP } from "../data/constants.js";
import { resolveAddress, joinAddr, cityLine, dayText, fmtTime, fmtDateLong } from "./store.js";

const pad = (k) => (k + ":").padEnd(24);

export function toSummaryText(d) {
  const c = d.company;
  const L = [];
  const kv = (k, v) => { if (v != null && String(v).trim() !== "") L.push(pad(k) + v); };
  const head = (t) => { L.push(""); L.push(t.toUpperCase()); L.push("-".repeat(t.length)); };
  const bt = BUSINESS_TYPES.find((b) => b.id === d.business_type);

  L.push(`LEXINGTON HOME BRANDS — NEW ACCOUNT APPLICATION ${d.meta.id || ""}`.trim());
  kv("Submitted", fmtDateLong((d.meta.submitted_at || "").slice(0, 10)));
  kv("Applicant type", `${bt?.label || ""} (${d.path === "retail" ? "credit application, open terms" : "interior designer, pay by card"})`);

  head("Business");
  kv("Legal name", c.legal_name); kv("DBA", c.dba);
  kv("Entity", ENTITY_TYPES.find(([k]) => k === c.entity_type)?.[1]);
  kv("Address", `${joinAddr(c)}, ${cityLine(c)}${c.county ? " (" + c.county + " County)" : ""}`);
  kv("Phone / fax", [c.phone, c.fax].filter(Boolean).join(" / "));
  kv("Email", `${c.email}${c.ack_method === "mail" ? " (acknowledgements by mail)" : ""}`);
  kv("Website", c.website);
  if (d.path === "retail") {
    kv("Type of business", c.type_of_business); kv("Started", fmtDateLong(c.date_started)); kv("Fiscal year end", c.fiscal_year_end);
    kv("Est. annual sales", c.est_annual_sales); kv("D&B", c.dnb); kv("Parent D&B", c.parent_dnb); kv("Lyons", c.lyons);
  }

  head("Contacts");
  if (d.path === "retail") {
    for (const [k, label] of [["owner", "Owner"], ["president", "President"], ["ap_manager", "AP manager"], ["buyer", "Buyer"]]) {
      const p = d.contacts[k]; kv(label, [p.name, p.phone].filter(Boolean).join(" · "));
    }
    const ea = d.contacts.extranet_admin; kv("Extranet admin", [ea.name, ea.title, ea.email, ea.phone].filter(Boolean).join(" · "));
  } else {
    const a = d.contacts.applicant; kv("Applicant", [a.name, a.title].filter(Boolean).join(", ")); kv("Phone / email", [a.phone, a.email].filter(Boolean).join(" · "));
  }

  head("Billing & marketing");
  const bill = resolveAddress(d.bill_to, c), mkt = resolveAddress(d.marketing, c);
  kv("Bill-to", d.bill_to.same_as_business ? "Same as business" : [bill.location_name, bill.attention, joinAddr(bill), cityLine(bill), bill.phone, bill.email].filter(Boolean).join(" · "));
  kv("Marketing / UPS", d.marketing.same_as_business ? "Same as business" : [mkt.location_name, mkt.attention, joinAddr(mkt), cityLine(mkt), mkt.phone].filter(Boolean).join(" · "));

  head(`Ship-to (${d.ship_to.length})`);
  d.ship_to.forEach((s, i) => {
    kv(`${i + 1}. ${s.is_dc ? "DC" : "Location"}`, `${s.name}${s.attention ? " · Attn " + s.attention : ""}`);
    kv("   Address", `${joinAddr(s)}, ${cityLine(s)} · ${s.phone}`);
    kv("   Hours", `${fmtTime(s.hours_open)}-${fmtTime(s.hours_close)} · ${WEEKDAYS.map((w) => w + " " + dayText(s, w)).join(", ")}`);
    if (s.holidays) kv("   Closed", s.holidays);
  });
  kv("Shipping", d.shipping.partial_ok ? "Partial ship acceptable" : "Ship complete");

  head("Freight");
  kv("Carrier", d.shipping.carrier === "lfi" ? "Prepaid Freight Program (agreement signed)" : `Preferred carrier — ${d.shipping.preferred_carrier_name}`);
  if (d.shipping.carrier === "lfi") {
    kv("State / rate", `${d.freight.state} · ${STATE_RATES[d.freight.state]?.toFixed(2)}%`);
    kv("Authorized by", [d.freight.authorized_name, d.freight.authorized_title].filter(Boolean).join(", "));
  }

  head("Tax exemption (E-595E)");
  kv("State", d.tax.state); kv("Permit number", d.tax.id_number); kv("Issued in", d.tax.id_state); kv("FEIN", d.tax.fein);
  kv("Type of business", SSUTA_BUSINESS_KINDS.find(([k]) => k === d.tax.business_kind)?.[1]);
  kv("Reason", `${SSUTA_EXEMPT_REASONS.find(([k]) => k === d.tax.reason)?.[1] || ""}${d.tax.reason_detail ? " — " + d.tax.reason_detail : ""}`);
  kv("Certificate", d.tax.blanket ? "Blanket" : `Single purchase — ${d.tax.single_po}`);
  kv("Attached", d.tax.cert_file?.name || "not attached");
  if (d.tax.additional_states?.length) kv("Other states", d.tax.additional_states.map((s) => `${s.state} ${s.reason} ${s.id}`).join("; "));

  if (d.path === "retail") {
    head("Credit references");
    d.references.suppliers.filter((s) => s.company).forEach((s, i) => kv(`Supplier ${i + 1}`, [s.company, s.contact, s.phone, s.account ? "acct " + s.account : ""].filter(Boolean).join(" · ")));
    kv("Financial statement", d.references.financial_file?.name || "not attached");
    kv("Net-30 terms", d.references.terms_agreed ? "accepted" : "not accepted");
  }

  head("Signature");
  kv("Signed by", [d.sign.full_name, d.sign.title].filter(Boolean).join(", "));
  kv("Date", fmtDateLong(d.sign.date));
  kv("Sales policy", d.sign.sales_policy_agreed ? "read and agreed" : "not acknowledged");
  kv("Signature", d.sign.signature_png ? "drawn (stamped on forms)" : "missing");

  head("Representative");
  kv("Rep", `${REP.name} · ${REP.territory} · ${REP.phone} · ${REP.email}`);
  return L.join("\n");
}
