// CustomerRecord v1 — the flat, versioned record every downstream system consumes
// (Applications sheet, email summary, rep tools inbox, Pathfinder import).
// Field names are chosen to map onto Pathfinder's accounts / account_locations /
// contacts tables. See docs/CUSTOMER_RECORD.md.
import { BUSINESS_TYPES, ENTITY_TYPES, STATE_RATES, SSUTA_BUSINESS_KINDS, SSUTA_EXEMPT_REASONS, WEEKDAYS, REP } from "../data/constants.js";
import { resolveAddress, dayText, fmtTime } from "./store.js";

export const RECORD_VERSION = 1;

// Onboarding workflow stages, in order. Mirrored in the Apps Script Config tab.
export const STAGES = [
  ["application_received", "Application received"],
  ["packet_reviewed", "Packet reviewed"],
  ["sent_to_lexington", "Sent to Lexington"],
  ["account_number_assigned", "Account number assigned"],
  ["welcome_sent", "Welcome sent"],
  ["first_order", "First order"],
];

// Pathfinder accounts.account_type: 'retail' | 'designer' | 'decorator' | 'design_build' | 'other'
const PATHFINDER_TYPE = {
  designer: "designer", decorator: "decorator",
  retailer: "retail", outdoor_retailer: "retail", internet: "retail",
  hospitality: "design_build", model_home: "design_build",
};

// Lexington checklist class + suggested tier, the same suggestions rep tools use.
const LEX_CLASS = { designer: "designer", decorator: "decorator", retailer: "independent", outdoor_retailer: "outdoor", hospitality: "hospitality", model_home: "model_home", internet: "internet" };

export function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts[parts.length - 1] };
}

function contact(role, p, extra = {}) {
  if (!p || !(p.name || p.email || p.phone)) return null;
  return { role, ...splitName(p.name), title: p.title || extra.title || "", email: p.email || "", phone: p.phone || "", is_primary: !!extra.is_primary };
}

function location(label, a, extra = {}) {
  return {
    label, address_line1: a.address1 || "", address_line2: a.address2 || "", city: a.city || "", state: a.state || "",
    postal_code: a.zip || "", country: "US", is_primary: !!extra.is_primary, kind: extra.kind || "ship_to",
    attention: a.attention || "", phone: a.phone || "", is_dc: !!a.is_dc,
    hours: a.hours_open ? `${fmtTime(a.hours_open)}-${fmtTime(a.hours_close)}` : "",
    days: a.days ? WEEKDAYS.map((w) => `${w} ${dayText(a, w)}`).join(", ") : "",
    holidays: a.holidays || "",
  };
}

export function toCustomerRecord(d, opts = {}) {
  const c = d.company;
  const bt = BUSINESS_TYPES.find((b) => b.id === d.business_type);
  const tier = d.path === "designer" ? (d.business_type === "decorator" ? "Decorator" : "Designer") : "Wholesale";
  const bill = resolveAddress(d.bill_to, c);
  const mkt = resolveAddress(d.marketing, c);

  const contacts = d.path === "retail"
    ? [
        contact("owner", d.contacts.owner, { is_primary: true, title: "Owner" }),
        contact("president", d.contacts.president, { title: "President" }),
        contact("ap_manager", d.contacts.ap_manager, { title: "Accounts Payable" }),
        contact("buyer", d.contacts.buyer, { title: "Buyer" }),
        contact("extranet_admin", d.contacts.extranet_admin),
      ].filter(Boolean)
    : [contact("applicant", d.contacts.applicant, { is_primary: true })].filter(Boolean);
  // the primary contact needs an email for outreach; fall back to the company email
  if (contacts[0] && !contacts[0].email) contacts[0].email = c.email || "";

  const locations = [
    location("Business", c, { is_primary: true, kind: "business" }),
    ...d.ship_to.map((s, i) => location(s.name || `Ship-to ${i + 1}`, s, { kind: "ship_to" })),
    ...(d.bill_to.same_as_business ? [] : [location(bill.location_name || "Bill-to", bill, { kind: "bill_to" })]),
    ...(d.marketing.same_as_business ? [] : [location(mkt.location_name || "Marketing / UPS", mkt, { kind: "marketing" })]),
  ];

  return {
    record_version: RECORD_VERSION,
    application_id: d.meta.id || "",
    submitted_at: d.meta.submitted_at || "",
    demo: !!d.meta.demo,
    status: "application_received",
    account_number: opts.accountNumber || "",
    pathfinder_sync: "pending",
    drive_folder_url: "",
    account: {
      name: c.legal_name || "",
      dba: c.dba || "",
      entity_type: ENTITY_TYPES.find(([k]) => k === c.entity_type)?.[1] || c.entity_type || "",
      account_type: PATHFINDER_TYPE[d.business_type] || "other",
      business_type: d.business_type || "",
      business_type_label: bt?.label || "",
      path: d.path || "",
      lexington_class: LEX_CLASS[d.business_type] || "",
      pricing_tier_suggested: tier,
      address_line1: c.address1 || "", address_line2: c.address2 || "", city: c.city || "", state: c.state || "",
      zip: c.zip || "", county: c.county || "", country: c.country || "US",
      phone: c.phone || "", fax: c.fax || "", email: c.email || "", website: c.website || "",
      ack_method: c.ack_method || "email",
      type_of_business: c.type_of_business || "", date_started: c.date_started || "", fiscal_year_end: c.fiscal_year_end || "",
      est_annual_sales: c.est_annual_sales || "", dnb: c.dnb || "", parent_dnb: c.parent_dnb || "", lyons: c.lyons || "",
    },
    contacts,
    locations,
    onboarding: {
      carrier: d.shipping.carrier === "lfi" ? "prepaid_freight_program" : d.shipping.carrier === "preferred" ? "preferred_carrier" : "",
      preferred_carrier_name: d.shipping.preferred_carrier_name || "",
      partial_ship_ok: !!d.shipping.partial_ok,
      freight_state: d.shipping.carrier === "lfi" ? d.freight.state || "" : "",
      freight_rate_pct: d.shipping.carrier === "lfi" && STATE_RATES[d.freight.state] != null ? STATE_RATES[d.freight.state] : "",
      freight_authorized_by: d.shipping.carrier === "lfi" ? [d.freight.authorized_name, d.freight.authorized_title].filter(Boolean).join(", ") : "",
      tax_state: d.tax.state || "", tax_permit_number: d.tax.id_number || "", tax_id_state: d.tax.id_state || "", fein: d.tax.fein || "",
      tax_business_kind: SSUTA_BUSINESS_KINDS.find(([k]) => k === d.tax.business_kind)?.[1] || "",
      tax_reason: `${d.tax.reason || ""}${d.tax.reason ? " — " : ""}${SSUTA_EXEMPT_REASONS.find(([k]) => k === d.tax.reason)?.[1] || ""}`,
      tax_certificate_blanket: !!d.tax.blanket, tax_single_po: d.tax.single_po || "",
      tax_certificate_file: d.tax.cert_file?.name || "",
      tax_additional_states: (d.tax.additional_states || []).filter((s) => s.state).map((s) => `${s.state} ${s.reason} ${s.id}`).join("; "),
      suppliers: d.path === "retail" ? d.references.suppliers.filter((s) => s.company).map((s) => ({ company: s.company, contact: s.contact, phone: s.phone, account: s.account })) : [],
      financial_statement_file: d.references.financial_file?.name || "",
      terms_agreed: !!d.references.terms_agreed,
      sales_policy_agreed: !!d.sign.sales_policy_agreed,
      signed_by: d.sign.full_name || "", signed_title: d.sign.title || "", signed_date: d.sign.date || "",
      files: opts.fileNames || [],
    },
    source: {
      app: "lexington-onboarding",
      url: typeof location !== "undefined" && location?.href ? String(location.href).split("#")[0] : "",
      user_agent: typeof navigator !== "undefined" && navigator?.userAgent ? String(navigator.userAgent) : "",
      rep: `${REP.name} (${REP.territory})`,
    },
  };
}

// Flat row for the Applications sheet. Column order is the sheet header; keep in
// sync with gas/Code.gs APPLICATION_COLUMNS and docs/CUSTOMER_RECORD.md.
export function toApplicationRow(r) {
  const a = r.account, o = r.onboarding, p = r.contacts[0] || {};
  const ship = r.locations.filter((l) => l.kind === "ship_to");
  return {
    application_id: r.application_id, submitted_at: r.submitted_at, status: r.status, account_number: r.account_number,
    pathfinder_sync: r.pathfinder_sync, drive_folder_url: r.drive_folder_url, demo: r.demo ? "yes" : "",
    business_type: a.business_type_label, path: a.path, account_type: a.account_type, lexington_class: a.lexington_class, pricing_tier_suggested: a.pricing_tier_suggested,
    legal_name: a.name, dba: a.dba, entity_type: a.entity_type,
    address_line1: a.address_line1, address_line2: a.address_line2, city: a.city, state: a.state, zip: a.zip, county: a.county,
    phone: a.phone, fax: a.fax, email: a.email, website: a.website, ack_method: a.ack_method,
    primary_contact: [p.first_name, p.last_name].filter(Boolean).join(" "), primary_title: p.title || "", primary_email: p.email || "", primary_phone: p.phone || "",
    ship_to_count: ship.length, ship_to_1: ship[0] ? `${ship[0].label} · ${ship[0].address_line1}, ${ship[0].city}, ${ship[0].state} ${ship[0].postal_code}` : "",
    carrier: o.carrier, preferred_carrier_name: o.preferred_carrier_name, partial_ship_ok: o.partial_ship_ok ? "yes" : "no",
    freight_state: o.freight_state, freight_rate_pct: o.freight_rate_pct,
    tax_state: o.tax_state, tax_permit_number: o.tax_permit_number, fein: o.fein, tax_reason: o.tax_reason, tax_certificate_file: o.tax_certificate_file,
    type_of_business: a.type_of_business, date_started: a.date_started, est_annual_sales: a.est_annual_sales, dnb: a.dnb,
    suppliers: o.suppliers.map((s) => `${s.company} (${s.phone})`).join("; "), financial_statement_file: o.financial_statement_file,
    signed_by: o.signed_by, signed_title: o.signed_title, signed_date: o.signed_date, sales_policy_agreed: o.sales_policy_agreed ? "yes" : "no",
    source_url: r.source.url, record_version: r.record_version,
  };
}

export const APPLICATION_COLUMNS = Object.keys(toApplicationRow({
  application_id: "", submitted_at: "", status: "", account_number: "", pathfinder_sync: "", drive_folder_url: "", demo: false,
  account: {}, contacts: [], locations: [], onboarding: { suppliers: [] }, source: {}, record_version: 1,
}));
