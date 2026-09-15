// Submission shape, section schema, and required-field rules.
import { BUSINESS_TYPES, WEEKDAYS } from "./constants.js";

export const SCHEMA_VERSION = 1;

export const emptyAddress = () => ({
  same_as_business: true,
  location_name: "", attention: "", address1: "", address2: "",
  city: "", state: "", zip: "", phone: "", email: "",
});

export const emptyShipTo = () => ({
  name: "", attention: "", address1: "", address2: "", city: "", state: "", zip: "", phone: "",
  is_dc: false, hours_open: "09:00", hours_close: "16:00",
  days: Object.fromEntries(WEEKDAYS.map((d) => [d, { open: !["Sun", "Sat"].includes(d), hours: "" }])),
  holidays: "",
});

export const emptySupplier = () => ({ company: "", contact: "", phone: "", account: "" });

export const EMPTY_SUBMISSION = () => ({
  meta: { version: SCHEMA_VERSION, id: "", created_at: new Date().toISOString(), submitted_at: "", demo: false },
  business_type: "",
  path: "",
  company: {
    legal_name: "", dba: "", entity_type: "", address1: "", address2: "", city: "", state: "", zip: "",
    county: "", country: "US", phone: "", fax: "", email: "", ack_method: "email", website: "",
    type_of_business: "", date_started: "", fiscal_year_end: "", est_annual_sales: "", dnb: "", parent_dnb: "", lyons: "",
  },
  contacts: {
    applicant: { name: "", title: "", phone: "", email: "" },
    owner: { name: "", phone: "" },
    president: { name: "", phone: "" },
    ap_manager: { name: "", phone: "" },
    buyer: { name: "", phone: "" },
    extranet_admin: { name: "", title: "", email: "", phone: "" },
  },
  bill_to: emptyAddress(),
  marketing: emptyAddress(),
  ship_to: [emptyShipTo()],
  shipping: { partial_ok: false, carrier: "", preferred_carrier_name: "" },
  freight: { authorized_name: "", authorized_title: "", state: "", date: "", agreed: false, calc_category: "custom_upholstery", calc_item: "sofa", calc_price: "" },
  tax: {
    state: "", id_number: "", id_state: "", fein: "", business_kind: "", reason: "G", reason_detail: "",
    blanket: true, single_po: "", additional_states: [], cert_file: null, notes: "",
  },
  references: { suppliers: [emptySupplier(), emptySupplier(), emptySupplier()], financial_file: null, terms_agreed: false },
  sign: { sales_policy_agreed: false, certified: false, full_name: "", title: "", date: "", signature_png: "" },
});

export const pathFor = (businessType) => BUSINESS_TYPES.find((b) => b.id === businessType)?.path || "";

// Dotted-path getter.
export const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

const filled = (v) => v != null && String(v).trim() !== "" && v !== false;
const addrRequired = (prefix, d) =>
  getPath(d, `${prefix}.same_as_business`) ? [] : [`${prefix}.address1`, `${prefix}.city`, `${prefix}.state`, `${prefix}.zip`];

export const SECTIONS = [
  {
    id: "welcome", kicker: "Start", title: "Welcome",
    lead: "A single application that completes every form Lexington Home Brands needs to open your account.",
    required: () => ["business_type"],
  },
  {
    id: "company", kicker: "01", title: "Company",
    lead: "The legal entity that will hold the account.",
    required: (d) => [
      "company.legal_name", "company.entity_type", "company.address1", "company.city", "company.state", "company.zip",
      "company.phone", "company.email",
      ...(d.path === "retail" ? ["company.type_of_business", "company.date_started"] : []),
    ],
  },
  {
    id: "contacts", kicker: "02", title: "Contacts",
    lead: "Who we speak with about orders, acknowledgements, and invoices.",
    required: (d) => d.path === "retail"
      ? ["contacts.owner.name", "contacts.owner.phone", "contacts.ap_manager.name", "contacts.ap_manager.phone", "contacts.extranet_admin.name", "contacts.extranet_admin.email"]
      : ["contacts.applicant.name", "contacts.applicant.phone"],
  },
  {
    id: "addresses", kicker: "03", title: "Billing & Marketing",
    lead: "Where invoices, catalogs, swatches, and price lists should go.",
    required: (d) => [...addrRequired("bill_to", d), ...addrRequired("marketing", d)],
  },
  {
    id: "shipto", kicker: "04", title: "Ship-To Locations",
    lead: "Every location that will receive furniture, with the hours a carrier can deliver.",
    required: (d) => d.ship_to.flatMap((_, i) => [`ship_to.${i}.name`, `ship_to.${i}.address1`, `ship_to.${i}.city`, `ship_to.${i}.state`, `ship_to.${i}.zip`, `ship_to.${i}.phone`]),
  },
  {
    id: "freight", kicker: "05", title: "Freight",
    lead: "Choose how your orders travel.",
    required: (d) => [
      "shipping.carrier",
      ...(d.shipping.carrier === "preferred" ? ["shipping.preferred_carrier_name"] : []),
      ...(d.shipping.carrier === "lfi" ? ["freight.authorized_name", "freight.authorized_title", "freight.state", "freight.agreed"] : []),
    ],
  },
  {
    id: "tax", kicker: "06", title: "Tax Exemption",
    lead: "Completes the Streamlined Sales and Use Tax certificate of exemption (E-595E).",
    required: (d) => [
      "tax.state", "tax.id_number", "tax.business_kind", "tax.reason",
      ...(d.tax.blanket ? [] : ["tax.single_po"]),
      ...(d.tax.reason !== "G" ? ["tax.reason_detail"] : []),
      "tax.cert_file",
    ],
  },
  {
    id: "references", kicker: "07", title: "Credit References", retailOnly: true,
    lead: "Open terms require a look at who else extends you credit.",
    required: (d) => [
      ...[0, 1, 2].flatMap((i) => [`references.suppliers.${i}.company`, `references.suppliers.${i}.phone`]),
      "references.terms_agreed",
    ],
  },
  {
    id: "review", kicker: "08", title: "Review & Sign",
    lead: "Confirm what you have entered, then sign once for every form.",
    required: () => ["sign.sales_policy_agreed", "sign.certified", "sign.full_name", "sign.title", "sign.signature_png"],
  },
];

export const visibleSections = (d) => SECTIONS.filter((s) => !(s.retailOnly && d.path !== "retail"));

export const sectionComplete = (section, d) => section.required(d).every((p) => filled(getPath(d, p)));

export const missingFields = (section, d) => section.required(d).filter((p) => !filled(getPath(d, p)));

export const computeComplete = (d) => visibleSections(d).filter((s) => sectionComplete(s, d)).map((s) => s.id);
