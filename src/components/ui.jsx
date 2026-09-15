// Shared form primitives styled on the LHB design system.
import React, { useRef } from "react";

export function Field({ label, required, hint, error, span = 6, children, className = "" }) {
  return (
    <div className={`field span-${span} ${className}`}>
      {label ? (
        <label className="lbl">
          <span>{label}{required ? <span className="req">*</span> : null}</span>
          {hint ? <span className="hint">{hint}</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <div className="err">{error}</div> : null}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = "text", invalid, autoComplete, inputMode, maxLength, name }) {
  return (
    <input
      className={`input ${invalid ? "invalid" : ""}`}
      type={type}
      name={name}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength}
    />
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea className="textarea" rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  );
}

export function Select({ value, onChange, options, placeholder = "Select", invalid }) {
  return (
    <select className={`select ${invalid ? "invalid" : ""}`} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

export function StateSelect({ value, onChange, options, invalid }) {
  return <Select value={value} onChange={onChange} options={options.map(([c, n]) => [c, `${c} — ${n}`])} placeholder="State" invalid={invalid} />;
}

export function Choices({ value, onChange, options, columns = 2 }) {
  return (
    <div className={`choices choices--${columns}`}>
      {options.map((o) => (
        <button type="button" key={o.id} className={`choice ${value === o.id ? "on" : ""}`} onClick={() => onChange(o.id)}>
          <span className="ring" />
          <span>
            <span className="c-label">{o.label}</span>
            {o.sub ? <span className="c-sub">{o.sub}</span> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

export function RadioRow({ value, onChange, options }) {
  return (
    <div className="radio-row">
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return (
          <button type="button" key={v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>
        );
      })}
    </div>
  );
}

export function Checkbox({ value, onChange, children }) {
  return (
    <button type="button" className={`check ${value ? "on" : ""}`} onClick={() => onChange(!value)}>
      <span className="box">
        {value ? (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : null}
      </span>
      <span className="txt">{children}</span>
    </button>
  );
}

export function Upload({ file, onChange, accept = ".pdf,.jpg,.jpeg,.png", maxBytes, label = "Attach file" }) {
  const ref = useRef(null);
  const size = file?.size ? `${(file.size / 1024).toFixed(0)} KB` : "";
  return (
    <div className="upload">
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (maxBytes && f.size > maxBytes) {
            alert(`That file is ${(f.size / 1024 / 1024).toFixed(1)} MB. Please attach a file under ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`);
            e.target.value = "";
            return;
          }
          onChange(f);
          e.target.value = "";
        }}
      />
      <div style={{ minWidth: 0 }}>
        <span className={`fname ${file ? "" : "empty"}`}>{file ? file.name : "No file attached"}</span>
        {size ? <span className="fsize">{size}</span> : null}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {file ? <button type="button" className="btn quiet" onClick={() => onChange(null)}>Remove</button> : null}
        <button type="button" className="btn quiet" onClick={() => ref.current?.click()}>{file ? "Replace" : label}</button>
      </div>
    </div>
  );
}

export function SectionHeader({ kicker, title, lead }) {
  return (
    <header className="section-head">
      <div className="kicker-row">
        <span className="eyebrow">{kicker}</span>
        <span className="line" />
      </div>
      <h2 className="title">{title}</h2>
      {lead ? <p className="lead">{lead}</p> : null}
    </header>
  );
}

export function SubHead({ children, right }) {
  return (
    <div className="sub-head">
      <span className="eyebrow">{children}</span>
      {right}
    </div>
  );
}

export function Notice({ title, children, warn }) {
  return (
    <div className={`notice ${warn ? "warn" : ""}`}>
      {title ? <b>{title}</b> : null}
      {children}
    </div>
  );
}

export function Rule({ gold }) {
  return <hr className={`rule ${gold ? "rule--gold" : ""}`} />;
}
