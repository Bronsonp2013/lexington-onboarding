import React from "react";
import { Field, Input, Select, StateSelect, Choices, Checkbox, Notice, Rule, SubHead } from "../components/ui.jsx";
import { US_STATES, STATE_RATES, FIXED_VALUES, ITEM_TYPES, CLAIM_GUIDELINES, LHB } from "../data/constants.js";

const CARRIERS = [
  { id: "lfi", label: "Lexington Prepaid Freight Program", sub: "Lexington assigns the carrier. Freight is a fixed percentage by state, added to the invoice, fuel included, no minimums. Claims handled by Lexington Customer Care." },
  { id: "preferred", label: "My preferred carrier", sub: "You arrange and pay the carrier directly and file your own claims." },
];

export function Freight({ d, set, err }) {
  const f = d.freight;
  const states = [...new Set(d.ship_to.map((s) => s.state).filter(Boolean))];
  const rate = STATE_RATES[f.state];
  const fixed = FIXED_VALUES[f.calc_category];
  const useFixed = f.calc_category !== "wholesale";
  const basis = useFixed ? fixed?.[f.calc_item] : Number(String(f.calc_price).replace(/[^\d.]/g, "")) || 0;
  const freight = rate != null && basis ? (rate / 100) * basis : null;

  return (
    <div>
      <Field label="Shipping carrier" required span={12} error={err("shipping.carrier")} className="span-12">
        <Choices value={d.shipping.carrier} onChange={(v) => set("shipping.carrier", v)} options={CARRIERS} columns={2} />
      </Field>

      {d.shipping.carrier === "preferred" ? (
        <div className="grid" style={{ marginTop: 22 }}>
          <Field label="Carrier name" required span={8} error={err("shipping.preferred_carrier_name")}>
            <Input value={d.shipping.preferred_carrier_name} onChange={(v) => set("shipping.preferred_carrier_name", v)} placeholder="Sunbelt, Rudisill, or another carrier" invalid={!!err("shipping.preferred_carrier_name")} />
          </Field>
        </div>
      ) : null}

      {d.shipping.carrier === "lfi" ? (
        <div style={{ marginTop: 28 }}>
          <Rule gold />
          <SubHead>Prepaid Freight Program · 2026–2027 rates</SubHead>
          <p className="small" style={{ marginTop: -6 }}>
            For case goods and boxed-to-reship upholstery, freight is the state rate multiplied by the regular wholesale price.
            For custom upholstery and outdoor deep seating, the rate is applied to a fixed value by item type.
          </p>

          <div className="grid" style={{ marginTop: 20 }}>
            <div className="span-5">
              <table className="rates">
                <thead><tr><th>Ship-to state</th><th style={{ textAlign: "right" }}>Rate</th></tr></thead>
                <tbody>
                  {(states.length ? states : ["TX", "OK", "AR", "LA"]).map((s) => (
                    <tr key={s} className={s === f.state ? "hi" : ""}>
                      <td>{s}</td><td className="num">{STATE_RATES[s] != null ? STATE_RATES[s].toFixed(2) + "%" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="span-7">
              <table className="rates">
                <thead><tr><th>Fixed values</th>{ITEM_TYPES.map(([k, l]) => <th key={k} style={{ textAlign: "right" }}>{l}</th>)}</tr></thead>
                <tbody>
                  {Object.entries(FIXED_VALUES).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ whiteSpace: "nowrap" }}>{v.short}</td>
                      {ITEM_TYPES.map(([it]) => <td key={it} className="num">${v[it].toLocaleString()}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <SubHead>Estimate</SubHead>
            <div className="grid">
              <Field label="Product category" span={5}>
                <Select value={f.calc_category} onChange={(v) => set("freight.calc_category", v)} placeholder="Category" options={[
                  ["custom_upholstery", "Custom upholstery"],
                  ["outdoor_frame", "Outdoor frame + cushion"],
                  ["outdoor_cushion", "Outdoor cushion only"],
                  ["wholesale", "Case goods / boxed reship"],
                ]} />
              </Field>
              {useFixed ? (
                <Field label="Item type" span={4}>
                  <Select value={f.calc_item} onChange={(v) => set("freight.calc_item", v)} placeholder="Item" options={ITEM_TYPES} />
                </Field>
              ) : (
                <Field label="Wholesale price" span={4}>
                  <Input value={f.calc_price} onChange={(v) => set("freight.calc_price", v)} inputMode="numeric" placeholder="4850" />
                </Field>
              )}
              <Field label="Ship-to state" required span={3} error={err("freight.state")}>
                <StateSelect value={f.state} onChange={(v) => set("freight.state", v)} options={US_STATES.filter(([c]) => STATE_RATES[c] != null)} invalid={!!err("freight.state")} />
              </Field>
            </div>
            <div className="calc" style={{ marginTop: 18 }}>
              <div><span className="eyebrow eyebrow--ink">State rate</span><div className="big">{rate != null ? rate.toFixed(2) + "%" : "—"}</div><span className="small">{f.state || "Choose a state"}</span></div>
              <div><span className="eyebrow eyebrow--ink">{useFixed ? "Fixed value" : "Wholesale price"}</span><div className="big">{basis ? "$" + basis.toLocaleString() : "—"}</div><span className="small">{useFixed ? ITEM_TYPES.find(([k]) => k === f.calc_item)?.[1] : "Enter a price"}</span></div>
              <div className="result"><span className="eyebrow">Estimated freight</span><div className="big">{freight != null ? "$" + freight.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</div><span className="small" style={{ color: "rgba(251,248,242,0.7)" }}>{rate != null && basis ? `${rate.toFixed(2)}% × $${basis.toLocaleString()}` : "Pick a state and item"}</span></div>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <SubHead>Damage and shortage claims</SubHead>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14.5, color: "var(--ink-70)", lineHeight: 1.55 }}>
              {CLAIM_GUIDELINES.map((g, i) => <li key={i} style={{ marginBottom: 6 }}>{g}</li>)}
            </ol>
          </div>

          <div style={{ marginTop: 28 }}>
            <SubHead>Program agreement</SubHead>
            <p className="small" style={{ marginTop: -6 }}>
              Participation is optional and may be cancelled at any time in writing to the Director of Customer Care, {LHB.name},
              {" "}{LHB.address1}, {LHB.city}, {LHB.state} {LHB.zip}. Rates are renegotiated at the end of each contract period and communicated to participants.
            </p>
            <div className="grid" style={{ marginTop: 16 }}>
              <Field label="Authorized name" required span={6} error={err("freight.authorized_name")}>
                <Input value={f.authorized_name} onChange={(v) => set("freight.authorized_name", v)} invalid={!!err("freight.authorized_name")} />
              </Field>
              <Field label="Title" required span={6} error={err("freight.authorized_title")}>
                <Input value={f.authorized_title} onChange={(v) => set("freight.authorized_title", v)} invalid={!!err("freight.authorized_title")} />
              </Field>
              <div className="span-12">
                <Checkbox value={f.agreed} onChange={(v) => set("freight.agreed", v)}>
                  I agree to participate in the Lexington Home Brands Prepaid Freight Program at the rates listed, understand that Lexington will assign my carrier,
                  and will submit claims within 15 business days of receipt through Customer Care. My signature on the final step is applied to this agreement.
                </Checkbox>
                {err("freight.agreed") ? <div className="field"><div className="err">Please confirm the agreement to continue.</div></div> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {d.shipping.carrier === "preferred" ? (
        <div style={{ marginTop: 22 }}>
          <Notice title="Your own carrier">
            Orders ship collect to the carrier you name. Lexington is not able to file freight claims on your behalf under this option.
          </Notice>
        </div>
      ) : null}
    </div>
  );
}
