import React from "react";
import { Field, Input, Checkbox, Notice, Rule, SubHead } from "../components/ui.jsx";
const SignaturePad = React.lazy(() => import("../components/SignaturePad.jsx").then((m) => ({ default: m.SignaturePad })));
import { BUSINESS_TYPES, ENTITY_TYPES, STATE_RATES, SSUTA_BUSINESS_KINDS, SSUTA_EXEMPT_REASONS, WEEKDAYS } from "../data/constants.js";
import { resolveAddress, joinAddr, cityLine, dayText, fmtTime, fmtDateLong } from "../lib/store.js";

function Block({ title, onEdit, children }) {
  return (
    <div className="review-block">
      <div className="review-head">
        <span className="eyebrow eyebrow--ink">{title}</span>
        {onEdit ? <button type="button" className="link" onClick={onEdit}>Edit</button> : null}
      </div>
      <dl className="kv">{children}</dl>
    </div>
  );
}
const KV = ({ k, v }) => (v ? <><dt>{k}</dt><dd>{v}</dd></> : null);

export function Review({ d, set, err, jump, salesPolicyUrl }) {
  const c = d.company;
  const bt = BUSINESS_TYPES.find((b) => b.id === d.business_type);
  const bill = resolveAddress(d.bill_to, c);
  const mkt = resolveAddress(d.marketing, c);
  const s = d.sign;

  return (
    <div>
      <Block title="Business" onEdit={() => jump("company")}>
        <KV k="Type" v={bt?.label} />
        <KV k="Legal name" v={c.legal_name} />
        <KV k="DBA" v={c.dba} />
        <KV k="Entity" v={ENTITY_TYPES.find(([k]) => k === c.entity_type)?.[1]} />
        <KV k="Address" v={[joinAddr(c), cityLine(c)].filter(Boolean).join(" · ")} />
        <KV k="Phone / fax" v={[c.phone, c.fax].filter(Boolean).join(" · ")} />
        <KV k="Email" v={`${c.email}${c.ack_method === "mail" ? " (acknowledgements by mail)" : ""}`} />
        {d.path === "retail" ? <>
          <KV k="Type of business" v={c.type_of_business} />
          <KV k="Started" v={fmtDateLong(c.date_started)} />
          <KV k="Est. annual sales" v={c.est_annual_sales} />
        </> : null}
      </Block>

      <Block title="Contacts" onEdit={() => jump("contacts")}>
        {d.path === "retail" ? <>
          <KV k="Owner" v={[d.contacts.owner.name, d.contacts.owner.phone].filter(Boolean).join(" · ")} />
          <KV k="President" v={[d.contacts.president.name, d.contacts.president.phone].filter(Boolean).join(" · ")} />
          <KV k="AP manager" v={[d.contacts.ap_manager.name, d.contacts.ap_manager.phone].filter(Boolean).join(" · ")} />
          <KV k="Buyer" v={[d.contacts.buyer.name, d.contacts.buyer.phone].filter(Boolean).join(" · ")} />
          <KV k="Extranet admin" v={[d.contacts.extranet_admin.name, d.contacts.extranet_admin.email].filter(Boolean).join(" · ")} />
        </> : <>
          <KV k="Applicant" v={[d.contacts.applicant.name, d.contacts.applicant.title].filter(Boolean).join(", ")} />
          <KV k="Phone / email" v={[d.contacts.applicant.phone, d.contacts.applicant.email].filter(Boolean).join(" · ")} />
        </>}
      </Block>

      <Block title="Billing & marketing" onEdit={() => jump("addresses")}>
        <KV k="Bill-to" v={d.bill_to.same_as_business ? "Same as business address" : [bill.location_name, joinAddr(bill), cityLine(bill)].filter(Boolean).join(" · ")} />
        <KV k="Marketing / UPS" v={d.marketing.same_as_business ? "Same as business address" : [mkt.location_name, joinAddr(mkt), cityLine(mkt)].filter(Boolean).join(" · ")} />
      </Block>

      <Block title={`Ship-to (${d.ship_to.length})`} onEdit={() => jump("shipto")}>
        {d.ship_to.map((st, i) => (
          <React.Fragment key={i}>
            <dt>{String(i + 1).padStart(2, "0")} {st.is_dc ? "· DC" : ""}</dt>
            <dd>
              {st.name} · {joinAddr(st)} · {cityLine(st)} · {st.phone}<br />
              <span className="small">{fmtTime(st.hours_open)}–{fmtTime(st.hours_close)} · {WEEKDAYS.map((w) => `${w} ${dayText(st, w)}`).join(", ")}{st.holidays ? ` · ${st.holidays}` : ""}</span>
            </dd>
          </React.Fragment>
        ))}
        <KV k="Shipping" v={d.shipping.partial_ok ? "Partial ship acceptable" : "Ship complete"} />
      </Block>

      <Block title="Freight" onEdit={() => jump("freight")}>
        <KV k="Carrier" v={d.shipping.carrier === "lfi" ? "Lexington Prepaid Freight Program" : d.shipping.carrier === "preferred" ? `Preferred carrier — ${d.shipping.preferred_carrier_name}` : ""} />
        {d.shipping.carrier === "lfi" ? <>
          <KV k="State / rate" v={d.freight.state ? `${d.freight.state} · ${STATE_RATES[d.freight.state]?.toFixed(2)}%` : ""} />
          <KV k="Authorized" v={[d.freight.authorized_name, d.freight.authorized_title].filter(Boolean).join(", ")} />
        </> : null}
      </Block>

      <Block title="Tax exemption" onEdit={() => jump("tax")}>
        <KV k="State / number" v={[d.tax.state, d.tax.id_number].filter(Boolean).join(" · ")} />
        <KV k="FEIN" v={d.tax.fein} />
        <KV k="Business type" v={SSUTA_BUSINESS_KINDS.find(([k]) => k === d.tax.business_kind)?.[1]} />
        <KV k="Reason" v={SSUTA_EXEMPT_REASONS.find(([k]) => k === d.tax.reason)?.[1]} />
        <KV k="Certificate" v={d.tax.cert_file?.name} />
        <KV k="Type" v={d.tax.blanket ? "Blanket" : `Single purchase — ${d.tax.single_po}`} />
      </Block>

      {d.path === "retail" ? (
        <Block title="Credit references" onEdit={() => jump("references")}>
          {d.references.suppliers.filter((x) => x.company).map((x, i) => (
            <KV key={i} k={`Supplier ${i + 1}`} v={[x.company, x.contact, x.phone, x.account ? `acct ${x.account}` : ""].filter(Boolean).join(" · ")} />
          ))}
          <KV k="Financial statement" v={d.references.financial_file?.name || "Not attached"} />
        </Block>
      ) : null}

      <Rule gold />
      <SubHead>Acknowledgements</SubHead>
      <div style={{ display: "grid", gap: 14 }}>
        <Checkbox value={s.sales_policy_agreed} onChange={(v) => set("sign.sales_policy_agreed", v)}>
          I have read, understand, and agree to the Lexington Home Brands Sales Policy
          {salesPolicyUrl ? <> (<a href={salesPolicyUrl} target="_blank" rel="noreferrer" style={{ color: "var(--gold-burnish)" }}>read the policy</a>)</> : null}.
        </Checkbox>
        {err("sign.sales_policy_agreed") ? <div className="field"><div className="err">Required to submit.</div></div> : null}
        <Checkbox value={s.certified} onChange={(v) => set("sign.certified", v)}>
          I certify that the information in this application is true and complete, authorize Lexington Home Brands to verify it,
          and understand that my signature below is applied to the credit application, the certificate of exemption
          {d.shipping.carrier === "lfi" ? ", and the Prepaid Freight Program agreement" : ""}.
        </Checkbox>
        {err("sign.certified") ? <div className="field"><div className="err">Required to submit.</div></div> : null}
      </div>

      <div className="grid" style={{ marginTop: 28 }}>
        <Field label="Full legal name" required span={6} error={err("sign.full_name")}>
          <Input value={s.full_name} onChange={(v) => set("sign.full_name", v)} invalid={!!err("sign.full_name")} />
        </Field>
        <Field label="Title" required span={6} error={err("sign.title")} hint="owner or president">
          <Input value={s.title} onChange={(v) => set("sign.title", v)} invalid={!!err("sign.title")} />
        </Field>
        <Field label="Signature" required span={12} error={err("sign.signature_png") ? "Please sign to submit." : ""}>
          <React.Suspense fallback={<div className="sigpad" style={{ height: 180 }} />}>
            <SignaturePad value={s.signature_png} onChange={(png) => set("sign.signature_png", png)} />
          </React.Suspense>
        </Field>
      </div>

      <div style={{ marginTop: 22 }}>
        <Notice title="What happens next">
          Submitting builds your completed Lexington forms and sends them to your representative. You will be able to download a copy.
          Nothing is sent to Lexington until your representative has reviewed it with you.
        </Notice>
      </div>
    </div>
  );
}
