import React from "react";
import { Choices, Notice } from "../components/ui.jsx";
import { BUSINESS_TYPES, REP } from "../data/constants.js";
import { pathFor } from "../data/schema.js";

export function Welcome({ d, set, err }) {
  const choose = (id) => {
    set("business_type", id);
    set("path", pathFor(id));
  };
  return (
    <div>
      <div className="welcome-hero">
        <div>
          <h2 className="title">New Account Application</h2>
          <p className="lead">
            One application, completed once. Your answers populate the credit application, the tax
            exemption certificate, the freight agreement, and every address Lexington Home Brands keeps on file.
          </p>
          <p className="small" style={{ marginTop: 18 }}>
            Your progress is saved in this browser as you go. Most applicants finish in about fifteen minutes.
            Your representative, {REP.name}, reviews everything before it goes to Lexington.
          </p>
        </div>
        <div>
          <span className="eyebrow eyebrow--ink" style={{ display: "block", marginBottom: 10 }}>What to have ready</span>
          <ul className="needs">
            <li><span className="n">I</span><span>Legal company name, entity type, and federal tax ID</span></li>
            <li><span className="n">II</span><span>Your state sales tax or resale certificate, as a PDF or photo</span></li>
            <li><span className="n">III</span><span>Delivery address, hours, and the days each location can receive freight</span></li>
            <li><span className="n">IV</span><span>Whether you want Lexington to arrange freight, or your own carrier</span></li>
            <li><span className="n">V</span><span>For retailers: three vendors who extend you credit</span></li>
          </ul>
        </div>
      </div>

      <span className="eyebrow eyebrow--ink" style={{ display: "block", marginBottom: 12 }}>
        Which best describes your business? <span style={{ color: "var(--gold-burnish)" }}>*</span>
      </span>
      <Choices value={d.business_type} onChange={choose} options={BUSINESS_TYPES} columns={2} />
      {err("business_type") ? <div className="field"><div className="err">Please choose one to continue.</div></div> : null}

      {d.path === "designer" ? (
        <div style={{ marginTop: 22 }}>
          <Notice title="Designer and decorator accounts">
            Trade accounts are set up to pay by credit card. Card details are never entered here; Lexington's credit
            department collects them by phone or through a separate form once your account is approved.
          </Notice>
        </div>
      ) : null}
      {d.path === "retail" ? (
        <div style={{ marginTop: 22 }}>
          <Notice title="Retail and commercial accounts">
            You will complete the full credit application for open terms, including major suppliers and, if available,
            a financial statement. Standard terms are net 30 days from invoice, subject to credit approval.
          </Notice>
        </div>
      ) : null}
    </div>
  );
}
