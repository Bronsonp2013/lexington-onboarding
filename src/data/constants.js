// Static reference data. Pure data — no React.

export const REP = {
  name: "Bronson Prachyl",
  title: "Sales Representative",
  territory: "838.01",
  phone: "214-789-9107",
  email: "BPrachyl@lexington.com",
  addressLine: "1300 National Highway, Thomasville NC 27360",
};

export const LHB = {
  name: "Lexington Home Brands",
  legal: "Lexington Furniture Industries",
  address1: "1300 National Highway",
  city: "Thomasville",
  state: "NC",
  zip: "27360",
  newAccountEmail: "newaccount@lexington.com",
  newAccountFax: "336-474-5704",
  creditFax: "336.474.5578",
  creditPhone: "336.474.5300, extension 8",
  freightEmail: "lhbfreightprogram@lexington.com",
  freightFax: "336-474-5407",
  customerCarePhone: "336-474-5700",
};

// Customer classes shown to the applicant. `path` decides which credit
// application they complete. `checklist` is the rep-only class box.
export const BUSINESS_TYPES = [
  { id: "designer", label: "Interior Designer", sub: "Design firm or independent designer", path: "designer", checklist: "Des" },
  { id: "decorator", label: "Decorator", sub: "Decorating services, staging", path: "designer", checklist: "Decorator" },
  { id: "retailer", label: "Furniture Retailer", sub: "Showroom or store stocking product", path: "retail", checklist: "I" },
  { id: "outdoor_retailer", label: "Outdoor Retailer", sub: "Patio and outdoor specialty store", path: "retail", checklist: "Outdoor Retailer" },
  { id: "hospitality", label: "Hospitality / Commercial", sub: "Hotels, clubs, non-residential projects", path: "retail", checklist: "Hospita" },
  { id: "model_home", label: "Model Home Builder", sub: "Builder or merchandising firm", path: "retail", checklist: "Model Home Bui" },
  { id: "internet", label: "Internet Dealer", sub: "Primarily online sales", path: "retail", checklist: "I_2" },
];

export const ENTITY_TYPES = [
  ["Proprietorship", "Sole Proprietorship"],
  ["Partnership", "Partnership"],
  ["Corporation", "Corporation"],
  ["LLC", "LLC"],
  ["SubS", "Sub-S Corporation"],
];

export const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

export const STATE_NAME = Object.fromEntries(US_STATES);

// Prepaid Freight Program rates, effective January 1, 2026 (LR123125).
export const STATE_RATES = {
  AL: 10.5, AR: 13.25, AZ: 13.0, CA: 18.75, CO: 13.25, CT: 14.25, DC: 6.5, DE: 8.5, FL: 11.0,
  GA: 6.5, IA: 12.75, ID: 11.75, IL: 13.75, IN: 8.75, KS: 15.0, KY: 9.0, LA: 12.5, MA: 16.25,
  MD: 9.75, ME: 18.0, MI: 14.75, MN: 13.5, MO: 11.5, MS: 14.0, MT: 23.0, NC: 5.75, ND: 9.25,
  NE: 18.0, NH: 17.5, NJ: 13.75, NM: 22.0, NV: 20.0, NY: 17.5, OH: 9.75, OK: 25.75, OR: 20.0,
  PA: 11.5, RI: 11.75, SC: 7.75, SD: 14.25, TN: 9.25, TX: 16.25, UT: 6.5, VA: 7.5, VT: 22.75,
  WA: 17.5, WI: 12.0, WV: 6.75, WY: 15.5,
};

export const FIXED_VALUES = {
  custom_upholstery: {
    label: "Custom upholstery — Lexington, Tommy Bahama Home, Barclay Butera, Artistica", short: "Custom upholstery",
    sofa: 2175, chaise: 1500, loveseat_wedge: 1725, chair: 1295, ottoman: 650, dining_chair: 695, stool_bench: 800,
  },
  outdoor_frame: {
    label: "Tommy Bahama Outdoor — frame and cushion set shipped together", short: "Outdoor frame + cushion",
    sofa: 1450, chaise: 1050, loveseat_wedge: 1100, chair: 725, ottoman: 325, dining_chair: 425, stool_bench: 425,
  },
  outdoor_cushion: {
    label: "Tommy Bahama Outdoor — cushion sets only", short: "Outdoor cushion only",
    sofa: 1000, chaise: 800, loveseat_wedge: 750, chair: 500, ottoman: 250, dining_chair: 250, stool_bench: 250,
  },
};

export const ITEM_TYPES = [
  ["sofa", "Sofa"], ["chaise", "Chaise"], ["loveseat_wedge", "Love seat & wedge"], ["chair", "Chair"],
  ["ottoman", "Ottoman"], ["dining_chair", "Dining chair"], ["stool_bench", "Stool & bench"],
];

export const SSUTA_BUSINESS_KINDS = [
  ["01", "Accommodation and food services"],
  ["02", "Agricultural, forestry, fishing, and hunting"],
  ["03", "Construction"],
  ["04", "Finance and insurance"],
  ["05", "Information, publishing, and communications"],
  ["06", "Manufacturing"],
  ["07", "Mining"],
  ["08", "Real estate"],
  ["09", "Rental and leasing"],
  ["10", "Retail trade"],
  ["11", "Transportation and warehousing"],
  ["12", "Utilities"],
  ["13", "Wholesale trade"],
  ["14", "Business services"],
  ["15", "Professional services"],
  ["16", "Education and health-care services"],
  ["17", "Nonprofit organization"],
  ["18", "Government"],
  ["19", "Not a business"],
  ["20", "Other"],
];

export const SSUTA_EXEMPT_REASONS = [
  ["A", "Federal government", "department"],
  ["B", "State or local government", "name"],
  ["C", "Tribal government", "name"],
  ["D", "Foreign diplomat", "number"],
  ["G", "Resale", "resale number"],
  ["H", "Agricultural production", "number"],
  ["I", "Industrial production / manufacturing", "number"],
  ["J", "Direct pay permit", "number"],
  ["K", "Direct mail", "number"],
  ["L", "Other", "explanation"],
];

// States on the E-595E multistate supplemental page.
export const SSUTA_SUPPLEMENTAL_STATES = [
  "AR", "GA", "IA", "IN", "KS", "KY", "MI", "MN", "NC", "ND", "NE", "NJ", "NV", "OH", "OK", "RI", "SD", "TN", "UT", "VT", "WA", "WI", "WV", "WY",
];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_FULL = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };

export const CLAIM_GUIDELINES = [
  "Accept all products from the carrier, even items with visible damage.",
  "Inspect the product and note any damage or shortage on the delivery ticket at the time of delivery, including the condition of the carton.",
  "Report any damage or shortage to Lexington Home Brands Customer Care at 336-474-5700 within 15 business days of receipt, using the claim form on the Dealer Extranet.",
  "Carriers will not honor claims submitted more than 15 business days after receipt. The dealer then assumes one third of the cost of the merchandise.",
  "Have ready: the PRO number from the delivery ticket, the Lexington acknowledgement number, delivery date, freight bill number with the driver's signature, a description of the damage, and photos.",
];

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MAX_PACKET_BYTES = 5 * 1024 * 1024;
