import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SECTIONS, visibleSections, sectionComplete, missingFields, computeComplete, EMPTY_SUBMISSION } from "./data/schema.js";
import { REP, LHB } from "./data/constants.js";
import { loadDraft, saveDraft, clearDraft, setPath, makeId, todayISO, KEY_STEP } from "./lib/store.js";
import { sampleDesigner, sampleRetail, sampleSignaturePng } from "./data/sample.js";
import { fileStore } from "./lib/files.js";
import { downloadBlob } from "./lib/download.js";
import { deliveryConfigured, mailtoFallback } from "./lib/submit.js";
import { CONFIG } from "./config.js";
import { SectionHeader, Notice } from "./components/ui.jsx";
import { LOGO } from "./assets/logo.js";
import { Welcome } from "./sections/Welcome.jsx";
import { Company } from "./sections/Company.jsx";
import { Contacts } from "./sections/Contacts.jsx";
import { Addresses } from "./sections/Addresses.jsx";
import { ShipTo } from "./sections/ShipTo.jsx";
import { Freight } from "./sections/Freight.jsx";
import { Tax } from "./sections/Tax.jsx";
import { References } from "./sections/References.jsx";
import { Review } from "./sections/Review.jsx";

const COMPONENTS = { welcome: Welcome, company: Company, contacts: Contacts, addresses: Addresses, shipto: ShipTo, freight: Freight, tax: Tax, references: References, review: Review };

function demoFromHash() {
  const h = location.hash.replace("#", "");
  if (h === "demo" || h === "demo-designer") return "designer";
  if (h === "demo-retail") return "retail";
  return "";
}

export default function App() {
  const [demo, setDemo] = useState(demoFromHash);
  const [data, setData] = useState(() => {
    const kind = demoFromHash();
    if (kind) return loadSample(kind);
    return loadDraft() || EMPTY_SUBMISSION();
  });
  const [stepId, setStepId] = useState(() => {
    if (demoFromHash()) return "welcome";
    try { return localStorage.getItem(KEY_STEP) || "welcome"; } catch { return "welcome"; }
  });
  const [showErrors, setShowErrors] = useState(false);
  const [files, setFiles] = useState({ cert: null, financial: null });
  const [savedFlash, setSavedFlash] = useState(false);
  const [route, setRoute] = useState("form");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [resumed] = useState(() => !demoFromHash() && !!loadDraft()?.company?.legal_name);

  // Restore uploaded files from IndexedDB on a resume. If a file is gone but its
  // metadata survived in the draft, drop the metadata so the step asks again.
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    (async () => {
      const cert = await fileStore.get("cert");
      const financial = await fileStore.get("financial");
      if (cancelled) return;
      setFiles({ cert: cert || null, financial: financial || null });
      setData((d) => {
        let next = d;
        if (!cert && d.tax.cert_file) next = setPath(next, "tax.cert_file", null);
        if (!financial && d.references.financial_file) next = setPath(next, "references.financial_file", null);
        return next;
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autosave (never in demo mode)
  useEffect(() => {
    if (demo) return;
    const t = setTimeout(() => { saveDraft(data); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1200); }, 400);
    return () => clearTimeout(t);
  }, [data, demo]);
  useEffect(() => { if (!demo) try { localStorage.setItem(KEY_STEP, stepId); } catch { /* ignore */ } }, [stepId, demo]);

  // demo hash switching
  useEffect(() => {
    const onHash = () => {
      const kind = demoFromHash();
      if (kind) { setDemo(kind); setData(loadSample(kind)); setStepId("welcome"); setRoute("form"); setResult(null); }
      else if (location.hash === "#reset") { clearDraft(); setData(EMPTY_SUBMISSION()); setStepId("welcome"); setDemo(""); setRoute("form"); location.hash = ""; }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const set = useCallback((path, value) => setData((d) => setPath(d, path, value)), []);
  const update = useCallback((mutator) => setData((d) => { const copy = JSON.parse(JSON.stringify(d)); mutator(copy); return copy; }), []);
  const setFile = useCallback((key, f) => {
    setFiles((x) => ({ ...x, [key]: f }));
    if (f) fileStore.put(key, f); else fileStore.remove(key);
  }, []);

  const sections = useMemo(() => visibleSections(data), [data]);
  const stepIdx = Math.max(0, sections.findIndex((s) => s.id === stepId));
  const current = sections[stepIdx];
  const complete = useMemo(() => computeComplete(data), [data]);
  const missing = useMemo(() => new Set(showErrors ? missingFields(current, data) : []), [showErrors, current, data]);
  const err = useCallback((path) => (missing.has(path) ? "Required" : ""), [missing]);
  const isLast = stepIdx === sections.length - 1;
  const canAdvance = sectionComplete(current, data);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const goTo = (id) => { setStepId(id); setShowErrors(false); scrollTop(); };
  const next = () => {
    if (!canAdvance) { setShowErrors(true); return; }
    setShowErrors(false);
    if (isLast) submit();
    else goTo(sections[stepIdx + 1].id);
  };
  const prev = () => { if (stepIdx > 0) goTo(sections[stepIdx - 1].id); };

  async function submit() {
    // every visible section must be complete before the packet is built
    const incomplete = sections.filter((s) => !sectionComplete(s, data));
    if (incomplete.length) { goTo(incomplete[0].id); setShowErrors(true); return; }
    const d = JSON.parse(JSON.stringify(data));
    d.meta.id = d.meta.id || makeId();
    d.meta.submitted_at = new Date().toISOString();
    d.meta.demo = !!demo;
    if (!d.sign.date) d.sign.date = todayISO();
    if (!d.freight.date) d.freight.date = d.sign.date;
    setBusy("Preparing your forms");
    try {
      const { buildPacket } = await import("./lib/packet.js");
      const packet = await buildPacket(d, files, {}, (label) => setBusy(label));
      let delivered = false, error = "";
      if (!demo && deliveryConfigured()) {
        setBusy("Sending to your representative");
        try {
          const { submitPacket } = await import("./lib/submit.js");
          const token = CONFIG.captcha && window.hcaptcha ? window.hcaptcha.getResponse() : "";
          await submitPacket(d, packet, { captchaToken: token });
          delivered = true;
        } catch (e) { error = e.message; }
      }
      setData(d);
      setResult({ packet, delivered, error, configured: deliveryConfigured() });
      setRoute("submitted");
      if (!demo) { clearDraft(); fileStore.clear(); }
      scrollTop();
    } catch (e) {
      alert(`Something went wrong while preparing the forms: ${e.message}`);
    } finally { setBusy(""); }
  }

  const startOver = () => {
    clearDraft();
    fileStore.clear();
    setFiles({ cert: null, financial: null });
    setResult(null);
    if (demo) { setData(loadSample(demo)); } else setData(EMPTY_SUBMISSION());
    setStepId("welcome");
    setRoute("form");
    scrollTop();
  };

  const Section = COMPONENTS[current.id];

  return (
    <div className="shell">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brands">
            <span className="active">Lexington</span><span>Tommy Bahama Home</span><span>Tommy Bahama Outdoor</span><span>Barclay Butera</span><span>Artistica</span><span>Sligh</span>
          </div>
          <div>Trade &amp; Dealer Onboarding</div>
        </div>
      </div>
      {demo ? (
        <div className="demo-ribbon">
          Demonstration · sample data · nothing is sent
          <button type="button" onClick={() => { location.hash = demo === "retail" ? "#demo" : "#demo-retail"; }}>
            Switch to {demo === "retail" ? "designer" : "retailer"} example
          </button>
        </div>
      ) : null}
      <header className="header">
        <div className="header-inner">
          <img className="header-logo" src={LOGO} alt="Lexington Home Brands" />
          <div className="header-right">
            <div className="header-kicker">
              <span className="eyebrow">New Account Application</span>
              <span className="name">{REP.name} · Territory {REP.territory}</span>
            </div>
            {route === "form" && !demo ? (
              <span className={`save-pill ${savedFlash ? "flash" : ""}`}><span className="dot" />{savedFlash ? "Saved" : "Autosave"}</span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="main">
        {route === "submitted" ? (
          <Success d={data} result={result} demo={demo} onStartOver={startOver} />
        ) : (
          <div className="layout">
            <aside className="rail">
              <div className="progress">
                <div className="progress-head">
                  <span className="eyebrow eyebrow--ink">Progress</span>
                  <span className="mono">{complete.length} / {sections.length}</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round((complete.length / sections.length) * 100)}%` }} /></div>
              </div>
              <div className="mobile-nav">
                <select className="select" value={current.id} onChange={(e) => goTo(e.target.value)}>
                  {sections.map((s, i) => <option key={s.id} value={s.id}>{s.kicker} · {s.title}{complete.includes(s.id) ? " ✓" : ""}</option>)}
                </select>
              </div>
              <ol>
                {sections.map((s, i) => {
                  const done = complete.includes(s.id);
                  const active = i === stepIdx;
                  return (
                    <li key={s.id}>
                      <button type="button" className={`${active ? "active" : ""} ${done ? "done" : ""}`} onClick={() => goTo(s.id)}>
                        <span className="num">{done ? "✓" : s.kicker === "Start" ? "·" : s.kicker}</span>
                        <span>
                          <span className="label">{s.title}</span>
                          <span className="state">{done ? "Complete" : active ? "In progress" : "Pending"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </aside>

            <section className="paper">
              {resumed && stepIdx === 0 && !demo ? (
                <div style={{ marginBottom: 24 }}>
                  <Notice title="Welcome back">
                    We kept the application you started for {data.company.legal_name}. Continue where you left off, or{" "}
                    <button type="button" className="link" onClick={() => { if (confirm("Clear the saved application and start over?")) startOver(); }}>start over</button>.
                  </Notice>
                </div>
              ) : null}
              <SectionHeader kicker={current.kicker === "Start" ? "Lexington Home Brands" : `Section ${current.kicker}`} title={current.title} lead={current.lead} />
              <Section d={data} set={set} update={update} err={err} files={files} setFile={setFile} jump={goTo} salesPolicyUrl={CONFIG.salesPolicyUrl} />

              {showErrors && !canAdvance ? (
                <div style={{ marginTop: 24 }}><Notice warn title="A few things are missing">Please complete the highlighted fields before continuing.</Notice></div>
              ) : null}

              {isLast && CONFIG.captcha && !demo ? <div className="h-captcha" data-captcha="true" style={{ marginTop: 24 }} /> : null}

              <footer className="card-footer">
                <button type="button" className="btn" onClick={prev} disabled={stepIdx === 0}>Back</button>
                <span className="count">{current.kicker === "Start" ? "Start" : `Section ${stepIdx} of ${sections.length - 1}`}</span>
                <button type="button" className="btn primary" onClick={next}>{isLast ? "Submit application" : "Continue"}</button>
              </footer>
            </section>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="rep">
            <b>Your representative</b>
            {REP.name} · {REP.title}<br />
            {REP.phone} · <a href={`mailto:${REP.email}`} style={{ color: "inherit" }}>{REP.email}</a>
          </div>
          <div style={{ textAlign: "right" }}>
            {LHB.name} · {LHB.address1}, {LHB.city}, {LHB.state} {LHB.zip}<br />
            <span className="mono" style={{ fontSize: 10 }}>{demo ? "Demonstration copy" : "Your answers are saved in this browser until you submit."}</span>
          </div>
        </div>
      </footer>

      {busy ? (
        <div className="overlay"><div className="box"><span className="eyebrow">Please wait</span><div className="title">{busy}</div><p className="small">Completing your Lexington forms.</p></div></div>
      ) : null}
    </div>
  );
}

function loadSample(kind) {
  const d = kind === "retail" ? sampleRetail() : sampleDesigner();
  try { d.sign.signature_png = sampleSignaturePng(d.sign.full_name); } catch { /* no canvas */ }
  return d;
}

function Success({ d, result, demo, onStartOver }) {
  const { packet, delivered, error, configured } = result;
  const first = REP.name.split(" ")[0];
  return (
    <div className="success">
      <span className="eyebrow">{demo ? "Demonstration complete" : delivered ? "Application sent" : "Application prepared"}</span>
      <h1 className="title">Thank you.</h1>
      <p className="lead">
        {demo
          ? `In a live application this packet would now be emailed to ${first} with every Lexington form completed.`
          : delivered
            ? `Your application and completed Lexington forms are with ${first}. He will review them with you before anything goes to Lexington.`
            : `Your Lexington forms are complete. Download the packet below and email it to ${REP.email}.`}
      </p>
      {!demo && !delivered && (error || !configured) ? (
        <div style={{ textAlign: "left", marginTop: 18 }}>
          <Notice warn title={error ? "Delivery did not go through" : "Email delivery not set up"}>
            {error || "This copy of the application is running without an email service."} Download the packet and send it to {REP.email}, or{" "}
            <a href={mailtoFallback(d)} style={{ color: "inherit" }}>open an email now</a>.
          </Notice>
        </div>
      ) : null}
      <div className="id">{d.meta.id}</div>
      <span className="eyebrow eyebrow--ink">Your packet</span>
      <ul className="files">
        {packet.files.map((f) => (
          <li key={f.name}><span>{f.name}</span><span className="mono">{(f.bytes / 1024).toFixed(0)} KB</span></li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn primary" onClick={() => downloadBlob(packet.zipBlob, packet.zipName)}>Download your copy</button>
        {packet.files.filter((f) => f.kind === "pdf").map((f) => (
          <button type="button" key={f.name} className="btn quiet" onClick={() => downloadBlob(f.blob, f.name)}>{f.name.replace(/ - .*$/, "").replace(/^\d+ /, "")}</button>
        ))}
      </div>
      {packet.warnings.length ? <p className="small" style={{ marginTop: 14 }}>{packet.warnings.join(" · ")}</p> : null}
      <div style={{ textAlign: "left", marginTop: 32 }}>
        <Notice title="What happens next">
          {first} reviews the packet and sends it to Lexington's new account desk. You will receive your account number and pricing from him once it is approved.
          {d.path === "designer" ? ` Trade accounts pay by credit card: Lexington's credit department will take card details by phone, or you can complete the enclosed Credit Card Transaction form and fax it to ${LHB.creditFax}. Please do not email card numbers.` : " Open terms are subject to credit approval."}
        </Notice>
      </div>
      <div style={{ marginTop: 28 }}>
        <button type="button" className="link" onClick={onStartOver}>{demo ? "Run the demonstration again" : "Start another application"}</button>
      </div>
    </div>
  );
}
