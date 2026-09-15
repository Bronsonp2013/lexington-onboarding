import React from "react";
import { Field, Input, SubHead } from "../components/ui.jsx";

function Person({ base, label, d, set, err, required, withTitle, withEmail }) {
  const p = base.split(".").reduce((o, k) => o[k], d);
  return (
    <div className="sub">
      <SubHead>{label}</SubHead>
      <div className="grid">
        <Field label="Name" required={required} span={withTitle ? 6 : 7} error={err(`${base}.name`)}>
          <Input value={p.name} onChange={(v) => set(`${base}.name`, v)} autoComplete="name" invalid={!!err(`${base}.name`)} />
        </Field>
        {withTitle ? (
          <Field label="Title" span={6}>
            <Input value={p.title} onChange={(v) => set(`${base}.title`, v)} autoComplete="organization-title" />
          </Field>
        ) : null}
        <Field label="Phone" required={required} span={withEmail ? 5 : 5} error={err(`${base}.phone`)}>
          <Input value={p.phone} onChange={(v) => set(`${base}.phone`, v)} type="tel" invalid={!!err(`${base}.phone`)} />
        </Field>
        {withEmail ? (
          <Field label="Email" required={required} span={7} error={err(`${base}.email`)}>
            <Input value={p.email} onChange={(v) => set(`${base}.email`, v)} type="email" invalid={!!err(`${base}.email`)} />
          </Field>
        ) : null}
      </div>
    </div>
  );
}

export function Contacts({ d, set, err }) {
  const retail = d.path === "retail";
  const copyOwner = (to) => {
    set(`contacts.${to}.name`, d.contacts.owner.name);
    set(`contacts.${to}.phone`, d.contacts.owner.phone);
  };
  if (!retail) {
    return (
      <div>
        <Person base="contacts.applicant" label="Applicant / owner" d={d} set={set} err={err} required withTitle withEmail />
        <p className="small" style={{ marginTop: 16 }}>
          This person signs the application and is the contact for acknowledgements and invoices.
        </p>
      </div>
    );
  }
  return (
    <div>
      <Person base="contacts.owner" label="Owner(s)" d={d} set={set} err={err} required />
      <Person base="contacts.president" label="President" d={d} set={set} err={err} />
      <div style={{ margin: "-6px 0 16px", textAlign: "right" }}>
        <button type="button" className="link" onClick={() => copyOwner("president")}>Same as owner</button>
      </div>
      <Person base="contacts.ap_manager" label="Accounts payable manager" d={d} set={set} err={err} required />
      <Person base="contacts.buyer" label="Buyer" d={d} set={set} err={err} />
      <div style={{ marginTop: 24 }} />
      <Person base="contacts.extranet_admin" label="Extranet administrator" d={d} set={set} err={err} required withTitle withEmail />
      <p className="small" style={{ marginTop: 14 }}>
        The Extranet administrator creates users for your account on the Lexington Dealer Extranet and decides what they can see.
      </p>
    </div>
  );
}
