// Branded application summary: every answer on one document, for the rep's records.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { BUSINESS_TYPES, ENTITY_TYPES, STATE_RATES, SSUTA_BUSINESS_KINDS, SSUTA_EXEMPT_REASONS, WEEKDAYS, REP } from "../../data/constants.js";
import { resolveAddress, joinAddr, cityLine, dayText, fmtTime, fmtDateLong } from "../store.js";
import { LOGO } from "../../assets/logo.js";

const INK = rgb(0.145, 0.153, 0.173);
const MUTED = rgb(0.43, 0.44, 0.47);
const GOLD = rgb(0.66, 0.6, 0.38);
const RULE = rgb(0.84, 0.835, 0.815);

export async function buildSummary(d, opts = {}) {
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifI = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansB = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(LOGO);

  let page, y;
  const L = 54, R = 558, W = R - L;
  const newPage = () => {
    page = doc.addPage([612, 792]);
    y = 792 - 54;
    const lw = 120, lh = (logo.height / logo.width) * lw;
    page.drawImage(logo, { x: L, y: y - lh + 6, width: lw, height: lh });
    page.drawText("NEW ACCOUNT APPLICATION", { x: R - sansB.widthOfTextAtSize("NEW ACCOUNT APPLICATION", 8.5), y: y - 4, size: 8.5, font: sansB, color: GOLD });
    page.drawText(d.meta.id || "Draft", { x: R - sans.widthOfTextAtSize(d.meta.id || "Draft", 8), y: y - 17, size: 8, font: sans, color: MUTED });
    y -= lh + 18;
    page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.6, color: INK });
    y -= 22;
  };
  const ensure = (h) => { if (y - h < 60) newPage(); };
  const heading = (t) => {
    ensure(40);
    y -= 6;
    page.drawText(t.toUpperCase(), { x: L, y, size: 8.5, font: sansB, color: GOLD });
    const tw = sansB.widthOfTextAtSize(t.toUpperCase(), 8.5);
    page.drawLine({ start: { x: L + tw + 10, y: y + 3 }, end: { x: R, y: y + 3 }, thickness: 0.5, color: RULE });
    y -= 18;
  };
  const wrap = (text, font, size, width) => {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (font.widthOfTextAtSize(t, size) > width && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const kv = (k, v) => {
    if (v == null || v === "") return;
    const lines = wrap(v, serif, 11, W - 150);
    ensure(lines.length * 14 + 4);
    page.drawText(k.toUpperCase(), { x: L, y: y + 1, size: 7.5, font: sans, color: MUTED });
    lines.forEach((ln, i) => page.drawText(ln, { x: L + 150, y: y - i * 14, size: 11, font: serif, color: INK }));
    y -= lines.length * 14 + 4;
  };
  const para = (t, italic) => {
    const lines = wrap(t, italic ? serifI : serif, 10.5, W);
    ensure(lines.length * 13 + 4);
    lines.forEach((ln, i) => page.drawText(ln, { x: L, y: y - i * 13, size: 10.5, font: italic ? serifI : serif, color: italic ? MUTED : INK }));
    y -= lines.length * 13 + 6;
  };

  newPage();
  const c = d.company;
  page.drawText(c.legal_name || "—", { x: L, y, size: 20, font: serif, color: INK });
  y -= 18;
  const bt = BUSINESS_TYPES.find((b) => b.id === d.business_type);
  para(`${bt?.label || ""} · ${d.path === "retail" ? "Credit application, open terms" : "Interior designer application, pay by credit card"} · Submitted ${fmtDateLong((d.meta.submitted_at || "").slice(0, 10)) || "as draft"}${d.meta.demo ? " · SAMPLE DATA" : ""}`, true);

  heading("Business");
  kv("Legal name", c.legal_name); kv("DBA", c.dba);
  kv("Entity", ENTITY_TYPES.find(([k]) => k === c.entity_type)?.[1]);
  kv("Address", `${joinAddr(c)}, ${cityLine(c)}${c.county ? " (" + c.county + " County)" : ""}`);
  kv("Phone / fax", [c.phone, c.fax].filter(Boolean).join(" · "));
  kv("Email", `${c.email}${c.ack_method === "mail" ? " — acknowledgements by mail" : ""}`);
  kv("Website", c.website);
  if (d.path === "retail") {
    kv("Type of business", c.type_of_business); kv("Started", fmtDateLong(c.date_started)); kv("Fiscal year end", c.fiscal_year_end);
    kv("Est. annual sales", c.est_annual_sales); kv("D&B", [c.dnb, c.parent_dnb ? "parent " + c.parent_dnb : ""].filter(Boolean).join(" · ")); kv("Lyons", c.lyons);
  }

  heading("Contacts");
  if (d.path === "retail") {
    kv("Owner", [d.contacts.owner.name, d.contacts.owner.phone].filter(Boolean).join(" · "));
    kv("President", [d.contacts.president.name, d.contacts.president.phone].filter(Boolean).join(" · "));
    kv("AP manager", [d.contacts.ap_manager.name, d.contacts.ap_manager.phone].filter(Boolean).join(" · "));
    kv("Buyer", [d.contacts.buyer.name, d.contacts.buyer.phone].filter(Boolean).join(" · "));
    const ea = d.contacts.extranet_admin;
    kv("Extranet admin", [ea.name, ea.title, ea.email, ea.phone].filter(Boolean).join(" · "));
  } else {
    const a = d.contacts.applicant;
    kv("Applicant", [a.name, a.title].filter(Boolean).join(", "));
    kv("Phone / email", [a.phone, a.email].filter(Boolean).join(" · "));
  }

  heading("Billing & marketing");
  const bill = resolveAddress(d.bill_to, c), mkt = resolveAddress(d.marketing, c);
  kv("Bill-to", d.bill_to.same_as_business ? "Same as business address" : [bill.location_name, bill.attention ? "Attn " + bill.attention : "", joinAddr(bill), cityLine(bill), bill.phone, bill.email].filter(Boolean).join(" · "));
  kv("Marketing / UPS", d.marketing.same_as_business ? "Same as business address" : [mkt.location_name, mkt.attention ? "Attn " + mkt.attention : "", joinAddr(mkt), cityLine(mkt), mkt.phone].filter(Boolean).join(" · "));

  heading(`Ship-to locations (${d.ship_to.length})`);
  d.ship_to.forEach((s, i) => {
    kv(`Location ${i + 1}`, `${s.name}${s.is_dc ? " — distribution center" : ""}${s.attention ? " · Attn " + s.attention : ""}`);
    kv("", `${joinAddr(s)}, ${cityLine(s)} · ${s.phone}`);
    kv("Hours", `${fmtTime(s.hours_open)} to ${fmtTime(s.hours_close)} · ${WEEKDAYS.map((w) => w + " " + dayText(s, w)).join(", ")}`);
    if (s.holidays) kv("Closed", s.holidays);
  });
  kv("Shipping", d.shipping.partial_ok ? "Partial ship acceptable (kits together, tables with chairs)" : "Ship complete");

  heading("Freight");
  kv("Carrier", d.shipping.carrier === "lfi" ? "Lexington Prepaid Freight Program (agreement signed)" : `Preferred carrier — ${d.shipping.preferred_carrier_name}`);
  if (d.shipping.carrier === "lfi") {
    kv("State / rate", `${d.freight.state} · ${STATE_RATES[d.freight.state]?.toFixed(2)}%`);
    kv("Authorized by", [d.freight.authorized_name, d.freight.authorized_title].filter(Boolean).join(", "));
  }

  heading("Tax exemption (E-595E)");
  kv("State", d.tax.state); kv("Permit number", `${d.tax.id_number}${d.tax.id_state ? " (issued " + d.tax.id_state + ")" : ""}`); kv("FEIN", d.tax.fein);
  kv("Type of business", SSUTA_BUSINESS_KINDS.find(([k]) => k === d.tax.business_kind)?.[1]);
  kv("Reason", `${SSUTA_EXEMPT_REASONS.find(([k]) => k === d.tax.reason)?.[1] || ""}${d.tax.reason_detail ? " — " + d.tax.reason_detail : ""}`);
  kv("Certificate", d.tax.blanket ? "Blanket certificate" : `Single purchase — ${d.tax.single_po}`);
  kv("Attached", d.tax.cert_file?.name || "Not attached");
  if (d.tax.additional_states.length) kv("Other states", d.tax.additional_states.map((s) => `${s.state} ${s.reason} ${s.id}`).join("; "));

  if (d.path === "retail") {
    heading("Credit references");
    d.references.suppliers.filter((s) => s.company).forEach((s, i) => kv(`Supplier ${i + 1}`, [s.company, s.contact, s.phone, s.account ? "acct " + s.account : ""].filter(Boolean).join(" · ")));
    kv("Financial statement", d.references.financial_file?.name || "Not attached");
    kv("Terms", d.references.terms_agreed ? "Net-30 terms accepted" : "Not accepted");
  }

  heading("Signature");
  kv("Signed by", [d.sign.full_name, d.sign.title].filter(Boolean).join(", "));
  kv("Date", fmtDateLong(d.sign.date));
  kv("Sales policy", d.sign.sales_policy_agreed ? "Read and agreed" : "Not acknowledged");
  if (d.sign.signature_png) {
    ensure(50);
    const png = await doc.embedPng(d.sign.signature_png);
    const scale = Math.min(180 / png.width, 40 / png.height);
    page.drawImage(png, { x: L + 150, y: y - 36, width: png.width * scale, height: png.height * scale });
    y -= 46;
  }

  heading("Representative");
  kv("Rep", `${REP.name} · ${REP.title} · Territory ${REP.territory}${opts.iamNumber ? " · IAM " + opts.iamNumber : ""}`);
  kv("Contact", `${REP.phone} · ${REP.email}`);

  // footer on every page
  doc.getPages().forEach((p, i) => {
    p.drawText(`Lexington Home Brands · New Account Application · ${d.meta.id || "draft"} · page ${i + 1} of ${doc.getPageCount()}`, { x: L, y: 32, size: 7, font: sans, color: MUTED });
  });
  return doc;
}
