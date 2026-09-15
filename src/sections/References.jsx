import React from "react";
import { Field, Input, Upload, Checkbox, SubHead, Rule } from "../components/ui.jsx";
import { emptySupplier } from "../data/schema.js";
import { MAX_UPLOAD_BYTES } from "../data/constants.js";

export function References({ d, set, update, err, files, setFile }) {
  const r = d.references;
  const add = () => update((D) => { D.references.suppliers.push(emptySupplier()); });
  const rm = (i) => update((D) => { D.references.suppliers.splice(i, 1); });
  return (
    <div>
      <p className="small" style={{ marginTop: -8, marginBottom: 18 }}>
        Lexington asks for a list of your other major suppliers. Three is the minimum; add more if you like.
      </p>
      {r.suppliers.map((s, i) => {
        const base = `references.suppliers.${i}`;
        const req = i < 3;
        return (
          <div className="sub" key={i}>
            <SubHead right={r.suppliers.length > 3 && i >= 3 ? <button type="button" className="btn quiet" onClick={() => rm(i)}>Remove</button> : null}>
              Supplier {String(i + 1).padStart(2, "0")}
            </SubHead>
            <div className="grid">
              <Field label="Company" required={req} span={7} error={err(`${base}.company`)}>
                <Input value={s.company} onChange={(v) => set(`${base}.company`, v)} invalid={!!err(`${base}.company`)} />
              </Field>
              <Field label="Your account number" span={5}>
                <Input value={s.account} onChange={(v) => set(`${base}.account`, v)} />
              </Field>
              <Field label="Contact / department" span={7}>
                <Input value={s.contact} onChange={(v) => set(`${base}.contact`, v)} placeholder="Credit department" />
              </Field>
              <Field label="Phone" required={req} span={5} error={err(`${base}.phone`)}>
                <Input value={s.phone} onChange={(v) => set(`${base}.phone`, v)} type="tel" invalid={!!err(`${base}.phone`)} />
              </Field>
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn" onClick={add}>+ Add another supplier</button>
      </div>

      <Rule />
      <SubHead>Financial statement</SubHead>
      <p className="small" style={{ marginTop: -6, marginBottom: 12 }}>
        Optional but recommended: a recent financial statement, certified if available, helps the credit department set your line.
      </p>
      <Upload
        file={files.financial || (r.financial_file ? { name: r.financial_file.name, size: r.financial_file.size } : null)}
        maxBytes={MAX_UPLOAD_BYTES}
        accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
        onChange={(f) => { setFile("financial", f); set("references.financial_file", f ? { name: f.name, type: f.type, size: f.size } : null); }}
      />

      <Rule />
      <SubHead>Terms and conditions</SubHead>
      <p className="small" style={{ marginTop: -6, marginBottom: 14 }}>
        Lexington Home Brands standard terms are net 30 days from the date of invoice, subject to credit approval, and shipments
        are not made on delinquent accounts. Payments will be made within terms; late payments may accrue service charges at
        1½% per month (18% annually) or the maximum rate allowed by law, whichever is less. The applicant agrees to pay
        reasonable collection costs and attorney fees incurred in collecting the account.
      </p>
      <Checkbox value={r.terms_agreed} onChange={(v) => set("references.terms_agreed", v)}>
        I have read and accept these terms on behalf of the company.
      </Checkbox>
      {err("references.terms_agreed") ? <div className="field"><div className="err">Please accept the terms to continue.</div></div> : null}
    </div>
  );
}
