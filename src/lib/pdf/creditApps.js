// Interior Designer Credit Application (LR022817) and full Credit Application (LR062917 layout).
import { StandardFonts, rgb } from "pdf-lib";
import { loadTemplate, makeFiller, finalize, stampSignature } from "./util.js";
import { REP } from "../../data/constants.js";
import { resolveAddress, joinAddr, dayText, fmtTime, fmtDate } from "../store.js";

const ENTITY_BOX = { Proprietorship: "Proprietorship", Partnership: "Partnership", Corporation: "Corporation", LLC: "LLC", SubS: "SubS" };

function shipToCommon(f, s, names) {
  f.text(names.name, s.name);
  f.text(names.attention, s.attention);
  f.text(names.address, joinAddr(s));
  f.text(names.phone, s.phone);
  f.text(names.city, s.city);
  f.text(names.state, s.state);
  f.text(names.zip, s.zip);
  f.radio("stribution Center", s.is_dc ? "Yes" : "No");
  for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
    f.text(day, dayText(s, day.slice(0, 3)), 8);
  }
  f.text(names.holidays, s.holidays, 8);
}

export async function fillDesignerApp(d, opts = {}) {
  const doc = await loadTemplate("/forms/di-credit-application.pdf");
  const form = doc.getForm();
  const f = makeFiller(form);
  const c = d.company;
  const s = d.ship_to[0];

  f.text("IAM Name", REP.name);
  f.text("IAM", opts.iamNumber || "");
  f.text("Date", fmtDate(d.sign.date || d.meta.submitted_at?.slice(0, 10)));
  f.text("Legal Company Name", c.legal_name);
  f.text("DBATA", c.dba);
  f.text("County", c.county);
  f.text("Business Address", joinAddr(c));
  f.text("City", c.city);
  f.text("State", c.state);
  f.text("Postal Code", c.zip);
  f.text("Phone", c.phone);
  f.text("Fax", c.fax);
  f.text("SalesTaxExempt", d.tax.id_number);
  f.check(ENTITY_BOX[c.entity_type], !!ENTITY_BOX[c.entity_type]);
  f.text("ApplicantOwners", d.contacts.applicant.name);
  f.text("Phone_2", d.contacts.applicant.phone);
  f.text("email_address", c.ack_method === "mail" ? `${c.email}  (please mail acknowledgements & invoices)` : c.email);

  shipToCommon(f, s, { name: "Shipping Name", attention: "Attention", address: "Address", phone: "Phone_3", city: "City_2", state: "State_2", zip: "Postal Code_2", holidays: "Holidays" });
  f.text("AM", fmtTime(s.hours_open));
  f.text("PM", fmtTime(s.hours_close));
  if (d.shipping.carrier === "lfi") f.check("LFI Freight Program attach s");
  if (d.shipping.carrier === "preferred") { f.check("Preferred Carrier"); f.text("Preferred_Freight_Carrier", d.shipping.preferred_carrier_name); }
  f.radio("icant has read understands and agrees to the LHB Sales Policy", d.sign.sales_policy_agreed ? "Yes_2" : "No_2");

  await finalize(doc, form);
  if (d.ship_to.length > 1) await appendShipToPage(doc, d);
  return { doc, missing: f.missing };
}

export async function fillRetailApp(d, opts = {}) {
  const doc = await loadTemplate("/forms/credit-application.pdf");
  const form = doc.getForm();
  const f = makeFiller(form);
  const c = d.company;
  const s = d.ship_to[0];
  const bill = resolveAddress(d.bill_to, c);
  const mkt = resolveAddress(d.marketing, c);

  f.text("I AM Name", REP.name);
  f.text("I AM", opts.iamNumber || "");
  f.text("Date", fmtDate(d.sign.date || d.meta.submitted_at?.slice(0, 10)));
  f.text("Legal Company Name", c.legal_name);
  f.text("DBATA", c.dba);
  f.text("County", c.county);
  f.text("Business Address", joinAddr(c));
  f.text("City", c.city);
  f.text("State or Province", c.state);
  f.text("Country", c.country || "US");
  f.text("Postal Code", c.zip);
  f.text("Email", c.email);
  f.text("Phone", c.phone);
  f.text("Fax", c.fax);
  f.text("SalesExemptTax#", d.tax.id_number);
  f.check(ENTITY_BOX[c.entity_type], !!ENTITY_BOX[c.entity_type]);
  f.text("Owners", d.contacts.owner.name); f.text("Phone_2", d.contacts.owner.phone);
  f.text("President", d.contacts.president.name); f.text("Phone_3", d.contacts.president.phone);
  f.text("AP Manager", d.contacts.ap_manager.name); f.text("Phone_4", d.contacts.ap_manager.phone);
  f.text("Buyer", d.contacts.buyer.name); f.text("Phone_5", d.contacts.buyer.phone);
  f.text("Type of Business", c.type_of_business);
  f.text("Date business started", fmtDate(c.date_started));
  f.text("Fiscal Year End", c.fiscal_year_end);
  f.text("Estimated Annual Sales", c.est_annual_sales);
  f.text("DB", c.dnb); f.text("Parent DB", c.parent_dnb); f.text("Lyons", c.lyons);
  f.text("Printed Name", d.sign.full_name);
  f.text("Title", d.sign.title);

  // page 2 — bill to
  f.text("Location Name", bill.location_name || c.legal_name);
  f.text("Attention", bill.attention);
  f.text("Address", joinAddr(bill));
  f.text("Phone_6", bill.phone);
  f.text("City_2", bill.city); f.text("State", bill.state); f.text("Postal Code_2", bill.zip);
  f.text("Country_2", "US");
  f.text("emailaddress", c.ack_method === "mail" ? `${bill.email || c.email}  (please mail acknowledgements & invoices)` : bill.email || c.email);
  // marketing / UPS
  f.text("Location Name_2", mkt.location_name || c.legal_name);
  f.text("Attention_2", mkt.attention);
  f.text("Address_2", joinAddr(mkt));
  f.text("Phone_7", mkt.phone);
  f.text("City_3", mkt.city); f.text("State_2", mkt.state); f.text("Postal Code_3", mkt.zip);
  f.text("Country_3", "US");
  // extranet admin
  const ea = d.contacts.extranet_admin;
  f.text("Name", ea.name); f.text("Title_2", ea.title); f.text("Ema i l Addresss", ea.email); f.text("Phone_8", ea.phone);
  // ship to
  shipToCommon(f, s, { name: "Shipping Name", attention: "Attention_3", address: "Address_3", phone: "Phone_9", city: "City_4", state: "State_3", zip: "Postal Code_4", holidays: "__none__" });
  f.missing.splice(f.missing.indexOf("__none__"), f.missing.indexOf("__none__") >= 0 ? 1 : 0);
  f.text("Country_4", "US");
  f.text("open", fmtTime(s.hours_open));
  f.text("close", fmtTime(s.hours_close));
  if (d.shipping.carrier === "lfi") f.check("LFI Freight Program attach s");
  if (d.shipping.carrier === "preferred") f.check("Preferred Carrier");
  f.radio("icant has read understands and agrees to the LHBArtistica Home Sales Policy", d.sign.sales_policy_agreed ? "Yes_2" : "No_2");

  await finalize(doc, form);
  // signature box on page 1 (field "Signature" rect [97,92 304x25])
  await stampSignature(doc, 0, d.sign.signature_png, { x: 100, y: 88, width: 220, height: 34 });
  // holidays + preferred carrier name are not fields on this layout; draw them
  const page2 = doc.getPages()[1];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  if (s.holidays) page2.drawText(s.holidays.slice(0, 120), { x: 114, y: 253, size: 7.5, font, color: rgb(0.1, 0.12, 0.16) });
  if (d.shipping.carrier === "preferred" && d.shipping.preferred_carrier_name) {
    page2.drawText(d.shipping.preferred_carrier_name, { x: 360, y: 163, size: 9, font, color: rgb(0.1, 0.12, 0.16) });
  }
  if (d.ship_to.length > 1) await appendShipToPage(doc, d);
  return { doc, missing: f.missing };
}

// Extra ship-to locations, rendered as an attached page in the same document.
async function appendShipToPage(doc, d) {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.12, 0.16);
  const muted = rgb(0.43, 0.44, 0.47);
  let page = doc.addPage([612, 792]);
  let y = 740;
  const line = (t, opts = {}) => {
    if (y < 60) { page = doc.addPage([612, 792]); y = 740; }
    page.drawText(t, { x: opts.x || 54, y, size: opts.size || 9.5, font: opts.bold ? bold : font, color: opts.muted ? muted : ink });
    y -= opts.gap || 14;
  };
  line("ADDITIONAL SHIP-TO LOCATIONS", { bold: true, size: 13, gap: 18 });
  line(`${d.company.legal_name} — attachment to the credit application`, { muted: true, gap: 22 });
  d.ship_to.forEach((s, i) => {
    if (i === 0) return;
    line(`Ship-to ${String(i + 1).padStart(2, "0")}${s.is_dc ? "  ·  Distribution center" : ""}`, { bold: true, size: 11, gap: 16 });
    line(`${s.name}${s.attention ? "   Attn: " + s.attention : ""}`);
    line(`${joinAddr(s)}   ${s.city}, ${s.state} ${s.zip}   ${s.phone}`);
    line(`Hours open for delivery: ${fmtTime(s.hours_open)} to ${fmtTime(s.hours_close)}`);
    line("Sun " + dayText(s, "Sun") + "   Mon " + dayText(s, "Mon") + "   Tue " + dayText(s, "Tue") + "   Wed " + dayText(s, "Wed") + "   Thu " + dayText(s, "Thu") + "   Fri " + dayText(s, "Fri") + "   Sat " + dayText(s, "Sat"));
    if (s.holidays) line("Does not accept deliveries: " + s.holidays.slice(0, 120));
    y -= 10;
  });
}
