// Fictional sample applications for demo mode. No real customers.
import { EMPTY_SUBMISSION, emptyShipTo } from "./schema.js";

const SIGNATURE_PLACEHOLDER = ""; // filled at runtime by a drawn sample signature

export function sampleDesigner() {
  const d = EMPTY_SUBMISSION();
  d.meta.demo = true;
  d.business_type = "designer";
  d.path = "designer";
  Object.assign(d.company, {
    legal_name: "Calloway Hart Interiors, LLC", dba: "Calloway Hart", entity_type: "LLC",
    address1: "2410 Camp Bowie Boulevard", address2: "Suite 140", city: "Fort Worth", state: "TX", zip: "76107",
    county: "Tarrant", country: "US", phone: "(817) 555-0142", fax: "", email: "studio@callowayhart.com",
    ack_method: "email", website: "callowayhart.com",
  });
  Object.assign(d.contacts.applicant, { name: "Elise Calloway", title: "Principal Designer", phone: "(817) 555-0142", email: "elise@callowayhart.com" });
  d.bill_to.same_as_business = true;
  d.marketing.same_as_business = true;
  d.ship_to = [
    {
      ...emptyShipTo(),
      name: "Calloway Hart c/o Meridian Receiving", attention: "Receiving dock, Tomas", address1: "5200 Blue Mound Road",
      address2: "Dock 6", city: "Fort Worth", state: "TX", zip: "76106", phone: "(817) 555-0190",
      is_dc: false, hours_open: "08:00", hours_close: "15:30",
      holidays: "Closed the week of December 25; Memorial Day; Independence Day; Thanksgiving and the day after.",
    },
  ];
  d.ship_to[0].days.Sat = { open: false, hours: "" };
  d.ship_to[0].days.Sun = { open: false, hours: "" };
  d.shipping = { partial_ok: false, carrier: "lfi", preferred_carrier_name: "" };
  Object.assign(d.freight, { authorized_name: "Elise Calloway", authorized_title: "Principal", state: "TX", date: today(), agreed: true, calc_price: "4850" });
  Object.assign(d.tax, {
    state: "TX", id_number: "3-20481-7732-9", id_state: "TX", fein: "84-2210987", business_kind: "15", reason: "G",
    blanket: true, cert_file: { name: "TX-resale-certificate.pdf", type: "application/pdf", size: 184320 },
    notes: "Interior design services with product resale to end clients.",
  });
  Object.assign(d.sign, { sales_policy_agreed: true, certified: true, full_name: "Elise Calloway", title: "Principal", date: today(), signature_png: SIGNATURE_PLACEHOLDER });
  return d;
}

export function sampleRetail() {
  const d = EMPTY_SUBMISSION();
  d.meta.demo = true;
  d.business_type = "retailer";
  d.path = "retail";
  Object.assign(d.company, {
    legal_name: "Prairie & Pine Home Furnishings, Inc.", dba: "Prairie & Pine", entity_type: "Corporation",
    address1: "1180 West Memorial Road", address2: "", city: "Oklahoma City", state: "OK", zip: "73114",
    county: "Oklahoma", country: "US", phone: "(405) 555-0117", fax: "(405) 555-0118", email: "office@prairieandpine.com",
    ack_method: "email", website: "prairieandpine.com",
    type_of_business: "Full-line furniture retailer, two showrooms", date_started: "2009-03-01", fiscal_year_end: "December 31",
    est_annual_sales: "6,400,000", dnb: "08-421-9937", parent_dnb: "", lyons: "",
  });
  d.contacts.applicant = { name: "Margaret Ostrander", title: "President", phone: "(405) 555-0117", email: "margaret@prairieandpine.com" };
  d.contacts.owner = { name: "Margaret Ostrander", phone: "(405) 555-0117" };
  d.contacts.president = { name: "Margaret Ostrander", phone: "(405) 555-0117" };
  d.contacts.ap_manager = { name: "Dana Whitcomb", phone: "(405) 555-0121" };
  d.contacts.buyer = { name: "Luis Arredondo", phone: "(405) 555-0125" };
  d.contacts.extranet_admin = { name: "Luis Arredondo", title: "Merchandise Manager", email: "luis@prairieandpine.com", phone: "(405) 555-0125" };
  d.bill_to = { same_as_business: false, location_name: "Prairie & Pine — Accounts Payable", attention: "Dana Whitcomb", address1: "PO Box 41188", address2: "", city: "Oklahoma City", state: "OK", zip: "73141", phone: "(405) 555-0121", email: "ap@prairieandpine.com" };
  d.marketing = { same_as_business: true, location_name: "", attention: "", address1: "", address2: "", city: "", state: "", zip: "", phone: "", email: "" };
  d.ship_to = [
    { ...emptyShipTo(), name: "Prairie & Pine Distribution Center", attention: "Receiving", address1: "7300 Northwest 4th Street", address2: "", city: "Oklahoma City", state: "OK", zip: "73127", phone: "(405) 555-0130", is_dc: true, hours_open: "07:00", hours_close: "15:00", holidays: "New Year's Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas Day." },
    { ...emptyShipTo(), name: "Prairie & Pine — Edmond Showroom", attention: "Store manager", address1: "3320 South Broadway", address2: "", city: "Edmond", state: "OK", zip: "73013", phone: "(405) 555-0140", is_dc: false, hours_open: "10:00", hours_close: "17:00", holidays: "Major holidays." },
  ];
  d.ship_to[1].days.Sun = { open: false, hours: "" };
  d.ship_to[1].days.Sat = { open: true, hours: "10am-2pm" };
  d.shipping = { partial_ok: true, carrier: "lfi", preferred_carrier_name: "" };
  Object.assign(d.freight, { authorized_name: "Margaret Ostrander", authorized_title: "President", state: "OK", date: today(), agreed: true, calc_price: "12400" });
  Object.assign(d.tax, {
    state: "OK", id_number: "STS-20017744-01", id_state: "OK", fein: "73-1558821", business_kind: "10", reason: "G",
    blanket: true, cert_file: { name: "OK-sales-tax-permit.pdf", type: "application/pdf", size: 220134 },
  });
  d.references.suppliers = [
    { company: "Hooker Furnishings", contact: "Credit department", phone: "(276) 656-3335", account: "PP-11842" },
    { company: "Bernhardt Furniture", contact: "Credit department", phone: "(828) 758-9811", account: "40-22917" },
    { company: "Universal Furniture", contact: "Credit department", phone: "(336) 822-8888", account: "OK-5580" },
  ];
  d.references.financial_file = { name: "Prairie-Pine-FY2025-financials.pdf", type: "application/pdf", size: 412000 };
  d.references.terms_agreed = true;
  Object.assign(d.sign, { sales_policy_agreed: true, certified: true, full_name: "Margaret Ostrander", title: "President", date: today(), signature_png: SIGNATURE_PLACEHOLDER });
  return d;
}

function today() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// A drawn-looking sample signature, generated on a canvas so demo PDFs show a real stamp.
export function sampleSignaturePng(text) {
  const c = document.createElement("canvas");
  c.width = 600; c.height = 160;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#1c2230";
  ctx.font = "italic 64px 'Pinyon Script', 'Brush Script MT', cursive";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 24, 84);
  return c.toDataURL("image/png");
}
