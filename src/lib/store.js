// Draft persistence, dotted-path updates, ids, formatting helpers.
import { EMPTY_SUBMISSION, SCHEMA_VERSION } from "../data/schema.js";

export const KEY_DRAFT = "lhb-onboarding:draft:v1";
export const KEY_STEP = "lhb-onboarding:step:v1";

export function loadDraft() {
  try {
    const raw = localStorage.getItem(KEY_DRAFT);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.meta?.version !== SCHEMA_VERSION) return null;
    return deepMerge(EMPTY_SUBMISSION(), d);
  } catch { return null; }
}

export function saveDraft(d) {
  try { localStorage.setItem(KEY_DRAFT, JSON.stringify(d)); } catch { /* storage unavailable */ }
}

export function clearDraft() {
  try { localStorage.removeItem(KEY_DRAFT); localStorage.removeItem(KEY_STEP); } catch { /* ignore */ }
}

// Fill any keys missing from a stored draft with defaults (schema drift within a version).
function deepMerge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === "object") {
    const out = { ...base };
    for (const k of Object.keys(over || {})) {
      out[k] = k in base && base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) ? deepMerge(base[k], over[k]) : over[k];
    }
    return out;
  }
  return over === undefined ? base : over;
}

export function setPath(obj, path, value) {
  const keys = path.split(".");
  const out = Array.isArray(obj) ? obj.slice() : { ...obj };
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cur[k];
    const clone = Array.isArray(next) ? next.slice() : { ...(next || {}) };
    cur[k] = clone;
    cur = clone;
  }
  cur[keys[keys.length - 1]] = value;
  return out;
}

// Collision-safe: month prefix + base36 timestamp + 2 random chars, e.g. LHB-202609-MFQ3K8X2.
export function makeId() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const stamp = t.getTime().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 4);
  return `LHB-${y}${m}-${stamp}${rand}`;
}

export const todayISO = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

export const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${String(y).slice(2)}`;
};

export const fmtDateLong = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

// "09:00" -> "9am", "15:30" -> "3:30pm"
export const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hh}:${String(m).padStart(2, "0")}${suffix}` : `${hh}${suffix}`;
};

export const dayText = (shipTo, day) => {
  const d = shipTo.days?.[day];
  if (!d || !d.open) return "Closed";
  if (d.hours && d.hours.trim()) return d.hours.trim();
  return `${fmtTime(shipTo.hours_open)}-${fmtTime(shipTo.hours_close)}`;
};

export const fmtMoney = (v) => {
  if (v === "" || v == null) return "";
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return String(v);
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

export const joinAddr = (a) => [a.address1, a.address2].filter(Boolean).join(", ");
export const cityLine = (a) => [a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

// Resolve "same as business" addresses into concrete values.
export function resolveAddress(addr, company, fallbackName) {
  if (!addr.same_as_business) return { ...addr };
  return {
    same_as_business: true,
    location_name: fallbackName || company.legal_name,
    attention: "",
    address1: company.address1, address2: company.address2, city: company.city, state: company.state, zip: company.zip,
    phone: company.phone, email: company.email,
  };
}

export const slug = (s) => String(s || "application").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
