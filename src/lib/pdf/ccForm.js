// Credit Card Transaction form (LR080224). Only identity fields are prefilled;
// card number, expiration, and verification code are never collected online.
import { loadTemplate, makeFiller, finalize } from "./util.js";
import { joinAddr } from "../store.js";

export async function fillCardForm(d, opts = {}) {
  const doc = await loadTemplate("/forms/credit-card-transaction.pdf");
  const form = doc.getForm();
  const f = makeFiller(form);
  const c = d.company;
  const who = d.contacts.applicant.name || d.sign.full_name;
  f.text("Card Holder Name", "", 10);
  f.text("Cardholder Address", joinAddr(c), 10);
  f.text("City", c.city, 10);
  f.text("State", c.state, 10);
  f.text("Postal Code", c.zip, 10);
  f.text("Completed by", who, 10);
  f.text("Account Name", c.legal_name, 9);
  f.text("Account Number", opts.accountNumber || "", 10);
  f.text("Remittance Advice", d.contacts.applicant.email || c.email, 10);
  await finalize(doc, form);
  return { doc, missing: f.missing };
}
