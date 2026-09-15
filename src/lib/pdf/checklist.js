// REP ONLY — New Account Checklist (LR041624). Never shipped in the customer build.
import { loadTemplate, makeFiller, finalize } from "./util.js";
import { BUSINESS_TYPES } from "../../data/constants.js";
import { joinAddr } from "../store.js";

// Checkbox names on the checklist, by meaning.
export const CLASS_BOXES = {
  independent: "I", independent_sligh: "I_3", outdoor: "Outdoor Retailer",
  preferred_designer: "Preferred Des", designer: "Des", decorator: "Decorator",
  internet: "I_2", government: "Government", model_home: "Model Home Bui", hospitality: "Hospita",
  agent: "Agent", contract: "Contract", gob: "GOB Consol", transit: "Transit DamagedSalvageL",
};
export const CLASS_LABELS = {
  independent: "Traditional Retail — Independent", independent_sligh: "Traditional Retail — Independent Retail/Sligh", outdoor: "Traditional Retail — Outdoor Retailer",
  preferred_designer: "To the Trade — Preferred Designer", designer: "To the Trade — Designer", decorator: "To the Trade — Decorator",
  internet: "Internet Dealer", government: "Contract — Government", model_home: "Contract — Model Home Builder", hospitality: "Contract — Hospitality/Commercial",
  agent: "International — Agent", contract: "International — Contract", gob: "Other — GOB Consolidator", transit: "Other — Transit Damaged/Salvage/Liquidator",
};

// Pricing rows: brand -> options -> checkbox field.
export const PRICING = [
  { id: "lhb", label: "LHB / TB / BB", options: [["Wholesale", "Wholesale"], ["Des_2", "Designer"], ["Decorator_2", "Decorator"]] },
  { id: "sligh", label: "Sligh", options: [["Stocking Dea", "Stocking Dealer"], ["Who", "Wholesale/Designer"], ["Decorator_3", "Decorator"]] },
  { id: "art_cg", label: "Artistica Casegoods", options: [["Program", "Program"], ["Who_2", "Wholesale/Preferred Designer"], ["Des_3", "Designer"], ["Decorator_4", "Decorator"]] },
  { id: "tbo", label: "Tommy Bahama Outdoor", options: [["Program_2", "Program"], ["Who_3", "Wholesale/Designer"], ["Decorator_5", "Decorator"]] },
  { id: "art_uph", label: "Artistica Upholstery", options: [["Program_3", "Program"], ["Who_4", "Wholesale/Preferred Designer"], ["Des_4", "Designer"], ["Decorator_6", "Decorator"]] },
  { id: "pds", label: "Personal Design Series", options: [["Program_4", "Program"]] },
  { id: "ssc", label: "Select Seating Chairs", options: [["Program_5", "Program"]] },
];

export function suggestedClass(d) {
  const bt = BUSINESS_TYPES.find((b) => b.id === d.business_type);
  const map = { designer: "designer", decorator: "decorator", retailer: "independent", outdoor_retailer: "outdoor", hospitality: "hospitality", model_home: "model_home", internet: "internet" };
  return map[bt?.id] || "";
}

export function suggestedPricing(d) {
  const tier = d.path === "designer" ? (d.business_type === "decorator" ? "decorator" : "designer") : "wholesale";
  const pick = {
    lhb: { wholesale: "Wholesale", designer: "Des_2", decorator: "Decorator_2" }[tier],
    sligh: { wholesale: "Who", designer: "Who", decorator: "Decorator_3" }[tier],
    art_cg: { wholesale: "Who_2", designer: "Des_3", decorator: "Decorator_4" }[tier],
    tbo: { wholesale: "Who_3", designer: "Who_3", decorator: "Decorator_5" }[tier],
    art_uph: { wholesale: "Who_4", designer: "Des_4", decorator: "Decorator_6" }[tier],
  };
  return pick;
}

export async function fillChecklist(d, sel) {
  const doc = await loadTemplate("/rep-forms/new-account-checklist.pdf");
  const form = doc.getForm();
  const f = makeFiller(form);
  const c = d.company;
  const s = d.ship_to[0];
  f.text("Account Name", c.legal_name + (c.dba ? ` (dba ${c.dba})` : ""), 10);
  f.text("Acct", sel.accountNumber || "", 10);
  f.text("Address", joinAddr(c), 10);
  f.text("City", c.city, 10);
  f.text("Posta Code", c.zip, 10);
  f.text("County", c.county, 10);
  f.text("State or Prov i nce", c.state, 10);
  f.text("Country", c.country || "US", 10);
  f.check(s?.is_dc ? "undefined" : "undefined_2");
  if (sel.customerClass && CLASS_BOXES[sel.customerClass]) f.check(CLASS_BOXES[sel.customerClass]);
  for (const box of Object.values(sel.pricing || {})) if (box) f.check(box);
  // pre-set-up requirements
  f.check("Credit App");
  if (d.path === "retail") { f.check("List of Major Supp"); if (d.references.financial_file) f.check("Financ"); }
  if (d.path === "designer") f.check("I_4");
  f.check("B"); f.check("Sh"); f.check("Market");
  f.check(d.shipping.partial_ok ? "Part" : "Comp");
  if (d.shipping.carrier === "lfi") { f.check("Freight Program Details  Agreement Form"); f.check("DamageShortage C"); }
  if (sel.policies) f.check("LHB Po");
  if (sel.dealerLocator) f.check("Web Dea");
  await finalize(doc, form);
  return { doc, missing: f.missing };
}
