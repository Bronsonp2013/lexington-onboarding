import React from "react";
import { Field, Input, Select, StateSelect, RadioRow, Rule, SubHead } from "../components/ui.jsx";
import { ENTITY_TYPES, US_STATES } from "../data/constants.js";

export function Company({ d, set, err }) {
  const c = d.company;
  const retail = d.path === "retail";
  return (
    <div className="grid">
      <Field label="Legal company name" required span={8} error={err("company.legal_name")}>
        <Input value={c.legal_name} onChange={(v) => set("company.legal_name", v)} placeholder="As registered with the state" autoComplete="organization" invalid={!!err("company.legal_name")} />
      </Field>
      <Field label="DBA / trade style" span={4} hint="if different">
        <Input value={c.dba} onChange={(v) => set("company.dba", v)} />
      </Field>

      <Field label="Entity type" required span={12} error={err("company.entity_type")}>
        <RadioRow value={c.entity_type} onChange={(v) => set("company.entity_type", v)} options={ENTITY_TYPES} />
      </Field>

      <Field label="Business address" required span={8} error={err("company.address1")}>
        <Input value={c.address1} onChange={(v) => set("company.address1", v)} autoComplete="address-line1" invalid={!!err("company.address1")} />
      </Field>
      <Field label="Suite / unit" span={4}>
        <Input value={c.address2} onChange={(v) => set("company.address2", v)} autoComplete="address-line2" />
      </Field>
      <Field label="City" required span={4} error={err("company.city")}>
        <Input value={c.city} onChange={(v) => set("company.city", v)} autoComplete="address-level2" invalid={!!err("company.city")} />
      </Field>
      <Field label="State" required span={3} error={err("company.state")}>
        <StateSelect value={c.state} onChange={(v) => set("company.state", v)} options={US_STATES} invalid={!!err("company.state")} />
      </Field>
      <Field label="Postal code" required span={2} error={err("company.zip")}>
        <Input value={c.zip} onChange={(v) => set("company.zip", v)} autoComplete="postal-code" inputMode="numeric" invalid={!!err("company.zip")} />
      </Field>
      <Field label="County" span={3}>
        <Input value={c.county} onChange={(v) => set("company.county", v)} />
      </Field>

      <Field label="Phone" required span={4} error={err("company.phone")}>
        <Input value={c.phone} onChange={(v) => set("company.phone", v)} type="tel" autoComplete="tel" invalid={!!err("company.phone")} />
      </Field>
      <Field label="Fax" span={4}>
        <Input value={c.fax} onChange={(v) => set("company.fax", v)} type="tel" />
      </Field>
      <Field label="Website" span={4}>
        <Input value={c.website} onChange={(v) => set("company.website", v)} placeholder="studio.com" autoComplete="url" />
      </Field>

      <Field label="Email for acknowledgements & invoices" required span={7} error={err("company.email")}>
        <Input value={c.email} onChange={(v) => set("company.email", v)} type="email" autoComplete="email" invalid={!!err("company.email")} />
      </Field>
      <Field label="Send acknowledgements & invoices by" span={5}>
        <RadioRow value={c.ack_method} onChange={(v) => set("company.ack_method", v)} options={[["email", "Email"], ["mail", "US Mail"]]} />
      </Field>

      {retail ? (
        <>
          <div className="span-12"><Rule /><SubHead>Business profile</SubHead></div>
          <Field label="Type of business" required span={6} error={err("company.type_of_business")}>
            <Input value={c.type_of_business} onChange={(v) => set("company.type_of_business", v)} placeholder="Full-line furniture retailer, two showrooms" invalid={!!err("company.type_of_business")} />
          </Field>
          <Field label="Date business started" required span={3} error={err("company.date_started")}>
            <Input value={c.date_started} onChange={(v) => set("company.date_started", v)} type="date" invalid={!!err("company.date_started")} />
          </Field>
          <Field label="Fiscal year end" span={3}>
            <Input value={c.fiscal_year_end} onChange={(v) => set("company.fiscal_year_end", v)} placeholder="December 31" />
          </Field>
          <Field label="Estimated annual sales" span={4} hint="USD">
            <Input value={c.est_annual_sales} onChange={(v) => set("company.est_annual_sales", v)} inputMode="numeric" placeholder="6,400,000" />
          </Field>
          <Field label="D&B number" span={3}>
            <Input value={c.dnb} onChange={(v) => set("company.dnb", v)} />
          </Field>
          <Field label="Parent D&B number" span={3}>
            <Input value={c.parent_dnb} onChange={(v) => set("company.parent_dnb", v)} />
          </Field>
          <Field label="Lyons number" span={2}>
            <Input value={c.lyons} onChange={(v) => set("company.lyons", v)} />
          </Field>
        </>
      ) : null}
    </div>
  );
}
