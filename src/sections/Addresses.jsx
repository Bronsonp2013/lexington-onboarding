import React from "react";
import { Field, Input, StateSelect, Checkbox, SubHead } from "../components/ui.jsx";
import { US_STATES } from "../data/constants.js";

function AddressBlock({ base, label, note, d, set, err, withEmail }) {
  const a = base.split(".").reduce((o, k) => o[k], d);
  return (
    <div className="sub">
      <SubHead>{label}</SubHead>
      {note ? <p className="small" style={{ margin: "-8px 0 16px" }}>{note}</p> : null}
      <Checkbox value={a.same_as_business} onChange={(v) => set(`${base}.same_as_business`, v)}>
        Same as the business address
      </Checkbox>
      {!a.same_as_business ? (
        <div className="grid" style={{ marginTop: 20 }}>
          <Field label="Location name" span={7}>
            <Input value={a.location_name} onChange={(v) => set(`${base}.location_name`, v)} placeholder={d.company.legal_name} />
          </Field>
          <Field label="Attention" span={5}>
            <Input value={a.attention} onChange={(v) => set(`${base}.attention`, v)} />
          </Field>
          <Field label="Address" required span={8} error={err(`${base}.address1`)}>
            <Input value={a.address1} onChange={(v) => set(`${base}.address1`, v)} invalid={!!err(`${base}.address1`)} />
          </Field>
          <Field label="Suite / unit" span={4}>
            <Input value={a.address2} onChange={(v) => set(`${base}.address2`, v)} />
          </Field>
          <Field label="City" required span={5} error={err(`${base}.city`)}>
            <Input value={a.city} onChange={(v) => set(`${base}.city`, v)} invalid={!!err(`${base}.city`)} />
          </Field>
          <Field label="State" required span={4} error={err(`${base}.state`)}>
            <StateSelect value={a.state} onChange={(v) => set(`${base}.state`, v)} options={US_STATES} invalid={!!err(`${base}.state`)} />
          </Field>
          <Field label="Postal code" required span={3} error={err(`${base}.zip`)}>
            <Input value={a.zip} onChange={(v) => set(`${base}.zip`, v)} inputMode="numeric" invalid={!!err(`${base}.zip`)} />
          </Field>
          <Field label="Phone" span={withEmail ? 5 : 6}>
            <Input value={a.phone} onChange={(v) => set(`${base}.phone`, v)} type="tel" />
          </Field>
          {withEmail ? (
            <Field label="Email for invoices" span={7}>
              <Input value={a.email} onChange={(v) => set(`${base}.email`, v)} type="email" />
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Addresses({ d, set, err }) {
  return (
    <div>
      <AddressBlock base="bill_to" label="Bill-to address" note="Where invoices and statements are sent." d={d} set={set} err={err} withEmail />
      <AddressBlock base="marketing" label="Marketing materials / UPS address" note="Catalogs, price lists, swatches, wood samples, and finish panels ship here by UPS. It cannot be a PO Box." d={d} set={set} err={err} />
    </div>
  );
}
