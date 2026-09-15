import React from "react";
import { Field, Input, Textarea, Select, StateSelect, RadioRow, Upload, Notice, Rule, SubHead } from "../components/ui.jsx";
import { US_STATES, SSUTA_BUSINESS_KINDS, SSUTA_EXEMPT_REASONS, SSUTA_SUPPLEMENTAL_STATES, MAX_UPLOAD_BYTES, LHB } from "../data/constants.js";

export function Tax({ d, set, update, err, files, setFile }) {
  const t = d.tax;
  const reason = SSUTA_EXEMPT_REASONS.find(([c]) => c === t.reason);
  const addState = () => update((D) => { D.tax.additional_states.push({ state: "", reason: "Resale", id: "" }); });
  const rmState = (i) => update((D) => { D.tax.additional_states.splice(i, 1); });

  return (
    <div>
      <p className="small" style={{ marginTop: -8, marginBottom: 22 }}>
        Lexington accepts the multistate Streamlined Sales and Use Tax Agreement certificate. Your answers complete it,
        and a copy of the certificate your state issued you must be attached. Most designers and retailers claim
        {" "}<i>Resale</i> with their state sales tax permit number.
      </p>

      <div className="grid">
        <Field label="State claiming exemption" required span={4} error={err("tax.state")}>
          <StateSelect value={t.state} onChange={(v) => { set("tax.state", v); if (!t.id_state) set("tax.id_state", v); }} options={US_STATES} invalid={!!err("tax.state")} />
        </Field>
        <Field label="Sales tax / resale permit number" required span={5} error={err("tax.id_number")}>
          <Input value={t.id_number} onChange={(v) => set("tax.id_number", v)} placeholder="3-20481-7732-9" invalid={!!err("tax.id_number")} />
        </Field>
        <Field label="State of issue" span={3}>
          <StateSelect value={t.id_state} onChange={(v) => set("tax.id_state", v)} options={US_STATES} />
        </Field>
        <Field label="Federal EIN" span={4} hint="12-3456789">
          <Input value={t.fein} onChange={(v) => set("tax.fein", v)} placeholder="84-2210987" />
        </Field>
        <Field label="Certificate type" span={8}>
          <RadioRow value={t.blanket ? "blanket" : "single"} onChange={(v) => set("tax.blanket", v === "blanket")} options={[["blanket", "Blanket — recurring purchases"], ["single", "Single purchase"]]} />
        </Field>
        {!t.blanket ? (
          <Field label="Invoice / purchase order number" required span={6} error={err("tax.single_po")}>
            <Input value={t.single_po} onChange={(v) => set("tax.single_po", v)} invalid={!!err("tax.single_po")} />
          </Field>
        ) : null}

        <Field label="Type of business" required span={6} error={err("tax.business_kind")} hint="E-595E box 4">
          <Select value={t.business_kind} onChange={(v) => set("tax.business_kind", v)} options={SSUTA_BUSINESS_KINDS.map(([c, l]) => [c, `${c} — ${l}`])} placeholder="Choose" invalid={!!err("tax.business_kind")} />
        </Field>
        <Field label="Reason for exemption" required span={6} error={err("tax.reason")} hint="E-595E box 5">
          <Select value={t.reason} onChange={(v) => set("tax.reason", v)} options={SSUTA_EXEMPT_REASONS.map(([c, l]) => [c, `${c} — ${l}`])} placeholder="Choose" invalid={!!err("tax.reason")} />
        </Field>
        {t.reason && t.reason !== "G" ? (
          <Field label={reason?.[2] || "Detail"} required span={12} error={err("tax.reason_detail")}>
            <Input value={t.reason_detail} onChange={(v) => set("tax.reason_detail", v)} invalid={!!err("tax.reason_detail")} />
          </Field>
        ) : null}
        {t.business_kind === "20" ? (
          <Field label="Describe your business" span={12}>
            <Input value={t.notes} onChange={(v) => set("tax.notes", v)} />
          </Field>
        ) : null}

        <Field label="Copy of your state-issued sales tax or resale certificate" required span={12} error={err("tax.cert_file")} hint="PDF, JPG, or PNG up to 3 MB">
          <Upload
            file={files.cert || (t.cert_file ? { name: t.cert_file.name, size: t.cert_file.size } : null)}
            maxBytes={MAX_UPLOAD_BYTES}
            onChange={(f) => {
              setFile("cert", f);
              set("tax.cert_file", f ? { name: f.name, type: f.type, size: f.size } : null);
            }}
          />
        </Field>
      </div>

      <div style={{ marginTop: 28 }}>
        <Rule />
        <SubHead right={<button type="button" className="btn quiet" onClick={addState}>+ Add a state</button>}>Additional states (optional)</SubHead>
        <p className="small" style={{ marginTop: -6 }}>
          If you also claim exemption in other member states, list each with its reason and identification number. They print on the certificate's multistate page.
        </p>
        {t.additional_states.map((s, i) => (
          <div className="grid" key={i} style={{ marginTop: 12 }}>
            <Field label="State" span={3}>
              <Select value={s.state} onChange={(v) => set(`tax.additional_states.${i}.state`, v)} options={SSUTA_SUPPLEMENTAL_STATES} placeholder="State" />
            </Field>
            <Field label="Reason" span={4}>
              <Input value={s.reason} onChange={(v) => set(`tax.additional_states.${i}.reason`, v)} placeholder="Resale" />
            </Field>
            <Field label="Identification number" span={4}>
              <Input value={s.id} onChange={(v) => set(`tax.additional_states.${i}.id`, v)} />
            </Field>
            <div className="span-1" style={{ alignSelf: "end" }}>
              <button type="button" className="btn quiet" onClick={() => rmState(i)}>×</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <Notice title="Seller on the certificate">
          {LHB.name}, {LHB.address1}, {LHB.city}, {LHB.state} {LHB.zip}. You are responsible for being eligible for the exemption you claim;
          the state that would otherwise be due tax may hold you liable if you are not.
        </Notice>
      </div>
    </div>
  );
}
