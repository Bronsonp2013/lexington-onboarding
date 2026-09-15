// REP TOOLS — local only. Opens a submission (zip or JSON), regenerates the packet,
// fills the rep-only New Account Checklist, and drafts the email to Lexington.
import React, { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { LOGO } from "../assets/logo.js";
import { REP, LHB, BUSINESS_TYPES } from "../data/constants.js";
import { EMPTY_SUBMISSION } from "../data/schema.js";
import { buildPacket, downloadBlob } from "../lib/packet.js";
import { fillChecklist, CLASS_LABELS, PRICING, suggestedClass, suggestedPricing } from "../lib/pdf/checklist.js";
import { Field, Input, Select, Checkbox, Notice, SubHead, Rule } from "../components/ui.jsx";
import { joinAddr, cityLine, fmtDateLong, slug, todayISO } from "../lib/store.js";

const KEY_SETTINGS = "lhb-onboarding:rep:v1";
const loadSettings = () => { try { return JSON.parse(localStorage.getItem(KEY_SETTINGS) || "{}"); } catch { return {}; } };

export default function RepTools() {
  const [settings, setSettings] = useState(loadSettings);
  const [d, setD] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploads, setUploads] = useState({});
  const [busy, setBusy] = useState("");
  const [sel, setSel] = useState({ customerClass: "", pricing: {}, accountNumber: "", policies: false, dealerLocator: false });
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    const { toSummaryText } = await import("../lib/summaryText.js");
    const text = toSummaryText(d);
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setNote("Clipboard blocked; the summary is also in the application email."); }
  }

  useEffect(() => { try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings)); } catch { /* ignore */ } }, [settings]);
  useEffect(() => {
    if (!d) return;
    setSel((s) => ({ ...s, customerClass: suggestedClass(d), pricing: suggestedPricing(d) }));
  }, [d]);

  async function open(file) {
    setNote("");
    try {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);
        const jsonEntry = zip.file("submission.json");
        if (!jsonEntry) throw new Error("submission.json not found in the zip.");
        const data = JSON.parse(await jsonEntry.async("string"));
        const ups = {};
        for (const name of Object.keys(zip.files)) {
          if (name.startsWith("Attachment - Tax Certificate - ")) ups.cert = new File([await zip.file(name).async("blob")], name.replace("Attachment - Tax Certificate - ", ""));
          if (name.startsWith("Attachment - Financial Statement - ")) ups.financial = new File([await zip.file(name).async("blob")], name.replace("Attachment - Financial Statement - ", ""));
        }
        setUploads(ups);
        setD(merge(data));
      } else {
        const data = JSON.parse(await file.text());
        setUploads({});
        setD(merge(data));
      }
      setFileName(file.name);
    } catch (e) { setNote(`Could not open that file: ${e.message}`); }
  }

  async function regenerate() {
    setBusy("Rebuilding packet");
    try {
      const packet = await buildPacket(d, uploads, { iamNumber: settings.iam || "", accountNumber: sel.accountNumber }, (l) => setBusy(l));
      downloadBlob(packet.zipBlob, packet.zipName);
      setNote(packet.warnings.length ? packet.warnings.join(" · ") : "Packet rebuilt and downloaded.");
    } catch (e) { setNote(`Could not rebuild: ${e.message}`); }
    finally { setBusy(""); }
  }

  async function checklist() {
    setBusy("Filling checklist");
    try {
      const { doc, missing } = await fillChecklist(d, sel);
      const bytes = await doc.save({ useObjectStreams: false });
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), `New Account Checklist - ${slug(d.company.legal_name)}.pdf`);
      setNote(missing.length ? `Checklist fields not found: ${missing.join(", ")}` : "Checklist downloaded. It is for Lexington only — never send it to the customer.");
    } catch (e) { setNote(`Could not fill the checklist: ${e.message}`); }
    finally { setBusy(""); }
  }

  const mailto = useMemo(() => {
    if (!d) return "#";
    const c = d.company;
    const bt = BUSINESS_TYPES.find((b) => b.id === d.business_type)?.label || "";
    const subject = encodeURIComponent(`New account — ${c.legal_name} (${c.city}, ${c.state}) — ${bt}`);
    const body = encodeURIComponent(
      `Please set up a new ${bt.toLowerCase()} account.\n\n` +
      `${c.legal_name}${c.dba ? " dba " + c.dba : ""}\n${joinAddr(c)}\n${cityLine(c)}\n${c.phone}\n${c.email}\n\n` +
      `Customer class: ${CLASS_LABELS[sel.customerClass] || "—"}\n` +
      `Pricing: ${PRICING.map((p) => { const box = sel.pricing?.[p.id]; const o = p.options.find(([b]) => b === box); return o ? `${p.label} ${o[1]}` : null; }).filter(Boolean).join("; ") || "—"}\n` +
      `Carrier: ${d.shipping.carrier === "lfi" ? "Prepaid Freight Program (signed agreement attached)" : "Preferred carrier — " + d.shipping.preferred_carrier_name}\n` +
      `Ship: ${d.shipping.partial_ok ? "Partial ship acceptable" : "Ship complete"}\n\n` +
      `Attached: New Account Checklist, ${d.path === "retail" ? "Credit Application" : "Interior Designer Credit Application"}, E-595E, ` +
      `${d.shipping.carrier === "lfi" ? "Prepaid Freight agreement, " : ""}state resale certificate.\n\n` +
      `Thank you,\n${REP.name}\n${REP.title}\n${REP.addressLine}\n${REP.phone}  |  ${REP.email}  |  lexington.com\n`,
    );
    return `mailto:${LHB.newAccountEmail}?subject=${subject}&body=${body}`;
  }, [d, sel]);

  return (
    <div className="shell">
      <div className="topbar"><div className="topbar-inner"><div>Rep tools · local only · not for customers</div><div>{REP.name} · {REP.territory}</div></div></div>
      <header className="header"><div className="header-inner">
        <img className="header-logo" src={LOGO} alt="Lexington Home Brands" />
        <div className="header-kicker"><span className="eyebrow">New Account · Rep Tools</span><span className="name">Open a submission, fill the checklist, send to Lexington</span></div>
      </div></header>

      <main className="main">
        <div className="layout" style={{ gridTemplateColumns: "320px minmax(0,1fr)" }}>
          <aside>
            <div className="sub">
              <SubHead>Open a submission</SubHead>
              <input type="file" accept=".zip,.json" onChange={(e) => e.target.files?.[0] && open(e.target.files[0])} style={{ fontFamily: "var(--font-ui)", fontSize: 12 }} />
              {fileName ? <p className="small" style={{ marginTop: 10 }}>{fileName}</p> : null}
              <p className="small" style={{ marginTop: 10 }}>Use the zip from the application email, or its submission.json.</p>
            </div>
            <div className="sub" style={{ marginTop: 16 }}>
              <SubHead>Your details</SubHead>
              <div className="grid">
                <Field label="IAM number" span={12} hint="stamped on regenerated forms">
                  <Input value={settings.iam || ""} onChange={(v) => setSettings((s) => ({ ...s, iam: v }))} placeholder="not yet on file" />
                </Field>
              </div>
            </div>
            <div className="sub" style={{ marginTop: 16 }}>
              <SubHead>Demo data</SubHead>
              <p className="small">Load a sample to try the tools.</p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" className="btn quiet" onClick={async () => { const { sampleDesigner, sampleSignaturePng } = await import("../data/sample.js"); const x = sampleDesigner(); x.meta.id = "LHB-SAMPLE"; x.meta.submitted_at = new Date().toISOString(); x.sign.signature_png = sampleSignaturePng(x.sign.full_name); setD(x); setFileName("sample designer"); }}>Designer</button>
                <button type="button" className="btn quiet" onClick={async () => { const { sampleRetail, sampleSignaturePng } = await import("../data/sample.js"); const x = sampleRetail(); x.meta.id = "LHB-SAMPLE"; x.meta.submitted_at = new Date().toISOString(); x.sign.signature_png = sampleSignaturePng(x.sign.full_name); setD(x); setFileName("sample retailer"); }}>Retailer</button>
              </div>
            </div>
          </aside>

          <section className="paper">
            {!d ? (
              <div>
                <span className="eyebrow">Nothing open</span>
                <h2 className="title" style={{ fontSize: 24, marginTop: 8 }}>Open an application</h2>
                <p className="lead">Choose the zip or JSON from an application email to review it, rebuild the forms, and prepare the checklist.</p>
              </div>
            ) : (
              <div>
                <span className="eyebrow">{d.meta.id} · {fmtDateLong((d.meta.submitted_at || "").slice(0, 10))}{d.meta.demo ? " · sample" : ""}</span>
                <h2 className="title" style={{ fontSize: 24, marginTop: 8 }}>{d.company.legal_name}</h2>
                <p className="lead">{BUSINESS_TYPES.find((b) => b.id === d.business_type)?.label} · {cityLine(d.company)} · {d.company.phone} · {d.company.email}</p>

                <Rule gold />
                <SubHead>New Account Checklist</SubHead>
                <p className="small" style={{ marginTop: -6 }}>Confirm the class and pricing tiers. Requirements boxes are ticked from the submission.</p>
                <div className="grid" style={{ marginTop: 14 }}>
                  <Field label="Customer class" span={6}>
                    <Select value={sel.customerClass} onChange={(v) => setSel((s) => ({ ...s, customerClass: v }))} options={Object.entries(CLASS_LABELS)} placeholder="Choose" />
                  </Field>
                  <Field label="Account number" span={6} hint="once Lexington assigns it">
                    <Input value={sel.accountNumber} onChange={(v) => setSel((s) => ({ ...s, accountNumber: v }))} />
                  </Field>
                  {PRICING.map((p) => (
                    <Field key={p.id} label={p.label} span={6}>
                      <Select value={sel.pricing?.[p.id] || ""} onChange={(v) => setSel((s) => ({ ...s, pricing: { ...s.pricing, [p.id]: v } }))} options={p.options} placeholder="Not applicable" />
                    </Field>
                  ))}
                  <div className="span-12" style={{ display: "grid", gap: 10 }}>
                    <Checkbox value={sel.policies} onChange={(v) => setSel((s) => ({ ...s, policies: v }))}>LHB policies reviewed with the account (general, internet sales, distribution / SMRP)</Checkbox>
                    <Checkbox value={sel.dealerLocator} onChange={(v) => setSel((s) => ({ ...s, dealerLocator: v }))}>Web dealer locator discussed</Checkbox>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                  <button type="button" className="btn primary" onClick={checklist} disabled={!!busy}>Download checklist</button>
                  <button type="button" className="btn" onClick={regenerate} disabled={!!busy}>Rebuild customer packet</button>
                  <a className="btn gold" href={mailto}>Draft email to {LHB.newAccountEmail}</a>
                  <button type="button" className="btn quiet" onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</button>
                </div>
                {note ? <p className="small" style={{ marginTop: 14 }}>{note}</p> : null}

                <Rule />
                <SubHead>Ship-to</SubHead>
                {d.ship_to.map((s, i) => <p key={i} className="small" style={{ margin: "4px 0" }}>{i + 1}. {s.name} · {joinAddr(s)} · {cityLine(s)} · {s.phone}{s.is_dc ? " · DC" : ""}</p>)}
                <SubHead>Tax</SubHead>
                <p className="small">{d.tax.state} · {d.tax.id_number} · certificate {d.tax.cert_file?.name || "not attached"}{uploads.cert ? " (in zip)" : ""}</p>
                {d.path === "retail" ? <>
                  <SubHead>Suppliers</SubHead>
                  {d.references.suppliers.filter((x) => x.company).map((x, i) => <p key={i} className="small" style={{ margin: "4px 0" }}>{x.company} · {x.phone} · {x.account}</p>)}
                </> : null}
                <Notice title="Reminder">The checklist and this page are for Lexington and you only. Send customers the packet, never the checklist.</Notice>
              </div>
            )}
          </section>
        </div>
      </main>
      {busy ? <div className="overlay"><div className="box"><span className="eyebrow">Please wait</span><div className="title">{busy}</div></div></div> : null}
    </div>
  );
}

function merge(data) {
  const base = EMPTY_SUBMISSION();
  const out = { ...base, ...data };
  for (const k of Object.keys(base)) if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) out[k] = { ...base[k], ...(data[k] || {}) };
  return out;
}
