import React from "react";
import { Field, Input, Textarea, StateSelect, RadioRow, SubHead, Notice } from "../components/ui.jsx";
import { US_STATES, WEEKDAYS } from "../data/constants.js";
import { emptyShipTo } from "../data/schema.js";
import { fmtTime } from "../lib/store.js";

function Days({ s, base, set }) {
  const range = `${fmtTime(s.hours_open)}-${fmtTime(s.hours_close)}`;
  return (
    <div className="days">
      {WEEKDAYS.map((day) => {
        const v = s.days[day];
        return (
          <div key={day} className={`day ${v.open ? "on" : ""}`}>
            <button type="button" onClick={() => set(`${base}.days.${day}.open`, !v.open)}>{day}</button>
            {v.open ? (
              <input className="input" value={v.hours} placeholder={range} onChange={(e) => set(`${base}.days.${day}.hours`, e.target.value)} />
            ) : (
              <div className="closed">Closed</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ShipTo({ d, set, update, err }) {
  const add = () => update((D) => { D.ship_to.push(emptyShipTo()); });
  const remove = (i) => update((D) => { D.ship_to.splice(i, 1); });
  const copyBusiness = (i) => {
    const c = d.company;
    set(`ship_to.${i}.name`, c.legal_name);
    set(`ship_to.${i}.address1`, c.address1);
    set(`ship_to.${i}.address2`, c.address2);
    set(`ship_to.${i}.city`, c.city);
    set(`ship_to.${i}.state`, c.state);
    set(`ship_to.${i}.zip`, c.zip);
    set(`ship_to.${i}.phone`, c.phone);
  };

  return (
    <div>
      {d.ship_to.map((s, i) => {
        const base = `ship_to.${i}`;
        return (
          <div className="sub" key={i}>
            <SubHead right={
              <span style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn quiet" onClick={() => copyBusiness(i)}>Use business address</button>
                {d.ship_to.length > 1 ? <button type="button" className="btn quiet" onClick={() => remove(i)}>Remove</button> : null}
              </span>
            }>
              Ship-to {String(i + 1).padStart(2, "0")}
            </SubHead>
            <div className="grid">
              <Field label="Shipping name" required span={8} error={err(`${base}.name`)} hint="receiver or warehouse">
                <Input value={s.name} onChange={(v) => set(`${base}.name`, v)} invalid={!!err(`${base}.name`)} />
              </Field>
              <Field label="Attention" span={4}>
                <Input value={s.attention} onChange={(v) => set(`${base}.attention`, v)} placeholder="Receiving" />
              </Field>
              <Field label="Address" required span={8} error={err(`${base}.address1`)}>
                <Input value={s.address1} onChange={(v) => set(`${base}.address1`, v)} invalid={!!err(`${base}.address1`)} />
              </Field>
              <Field label="Suite / dock" span={4}>
                <Input value={s.address2} onChange={(v) => set(`${base}.address2`, v)} />
              </Field>
              <Field label="City" required span={4} error={err(`${base}.city`)}>
                <Input value={s.city} onChange={(v) => set(`${base}.city`, v)} invalid={!!err(`${base}.city`)} />
              </Field>
              <Field label="State" required span={3} error={err(`${base}.state`)}>
                <StateSelect value={s.state} onChange={(v) => set(`${base}.state`, v)} options={US_STATES} invalid={!!err(`${base}.state`)} />
              </Field>
              <Field label="Postal code" required span={2} error={err(`${base}.zip`)}>
                <Input value={s.zip} onChange={(v) => set(`${base}.zip`, v)} inputMode="numeric" invalid={!!err(`${base}.zip`)} />
              </Field>
              <Field label="Phone" required span={3} error={err(`${base}.phone`)}>
                <Input value={s.phone} onChange={(v) => set(`${base}.phone`, v)} type="tel" invalid={!!err(`${base}.phone`)} />
              </Field>

              <Field label="Hours open for delivery" span={6}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Input value={s.hours_open} onChange={(v) => set(`${base}.hours_open`, v)} type="time" />
                  <span className="lead" style={{ fontSize: 15 }}>to</span>
                  <Input value={s.hours_close} onChange={(v) => set(`${base}.hours_close`, v)} type="time" />
                </div>
              </Field>
              <Field label="Is this a distribution center?" span={6}>
                <RadioRow value={s.is_dc ? "yes" : "no"} onChange={(v) => set(`${base}.is_dc`, v === "yes")} options={[["yes", "Yes"], ["no", "No"]]} />
              </Field>

              <Field label="Delivery days" span={12} hint="tap a day to close it; edit hours if they differ">
                <Days s={s} base={base} set={set} />
              </Field>

              <Field label="Holidays and other days this location does not accept deliveries" span={12}>
                <Textarea value={s.holidays} onChange={(v) => set(`${base}.holidays`, v)} rows={2} placeholder="List specific holidays or partial days, for example: closed daily for lunch 12-1pm; closed the week of December 25." />
              </Field>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn" onClick={add}>+ Add another ship-to location</button>
      </div>

      <div style={{ marginTop: 28 }}>
        <Field label="Shipping preference" span={12}>
          <RadioRow value={d.shipping.partial_ok ? "partial" : "complete"} onChange={(v) => set("shipping.partial_ok", v === "partial")}
            options={[["complete", "Ship complete"], ["partial", "Partial ship is acceptable"]]} />
        </Field>
        <p className="small" style={{ marginTop: 10 }}>
          With partial shipping, kit items ship together and tables ship with their chairs, but an order may arrive in more than one delivery.
        </p>
      </div>

      {d.ship_to.length > 1 ? (
        <div style={{ marginTop: 20 }}>
          <Notice title="Multiple locations">
            The first location prints on the credit application. The others are listed on an attached page, exactly as Lexington asks.
          </Notice>
        </div>
      ) : null}
    </div>
  );
}
