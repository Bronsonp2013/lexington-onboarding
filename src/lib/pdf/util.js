// pdf-lib helpers shared by every fill map.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const cache = new Map();

// ---- text the standard PDF fonts can print ---------------------------------------------
// Helvetica and Times in pdf-lib only cover the WinAnsi character set (ASCII, Latin-1 and a
// few typographic marks). One character outside it, such as "Ł", an emoji or Chinese text,
// makes pdf-lib throw and the whole packet fails. Every value is passed through winAnsi()
// before it reaches a form, so the PDFs print the closest safe text while the sheet and
// submission.json keep exactly what the applicant typed.
const WINANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const FOLD = { "Ł": "L", "ł": "l", "Đ": "D", "đ": "d", "Ħ": "H", "ħ": "h", "ı": "i", "Ŀ": "L", "ŀ": "l", "Ŧ": "T", "ŧ": "t", "ĸ": "k",
  "‐": "-", "‑": "-", "‒": "-", "―": "—", "′": "'", "″": '"', "⁄": "/", "−": "-" };
const okChar = (ch) => {
  const c = ch.codePointAt(0);
  return c === 10 || c === 13 || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRA.has(ch);
};
export function winAnsi(value) {
  const s = String(value);
  let out = "";
  for (const ch of s) {
    if (okChar(ch)) { out += ch; continue; }
    if (ch === "\t" || /[\u2000-\u200a\u202f\u205f\u3000]/.test(ch)) { out += " "; continue; }
    if (/[\u200b-\u200d\u2060\ufeff\ufe00-\ufe0f]/.test(ch) || /\p{Extended_Pictographic}|\p{Emoji_Modifier}/u.test(ch)) continue;
    if (FOLD[ch]) { out += FOLD[ch]; continue; }
    // Accented letters outside Latin-1 (ő, č, ş, ...) print as their base letter.
    const base = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    if (base && [...base].every(okChar)) { out += base; continue; }
    out += "?";
  }
  return out;
}

// Deep copy with every string made printable. Data URLs (the signature image) pass through.
export function pdfSafe(value) {
  if (typeof value === "string") return value.startsWith("data:") ? value : winAnsi(value);
  if (Array.isArray(value)) return value.map(pdfSafe);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = pdfSafe(v);
    return out;
  }
  return value;
}

const BASE = String(import.meta.env?.BASE_URL || "/").replace(/\/+$/, "");

export async function loadTemplate(path) {
  const url = path.startsWith("http") ? path : BASE + path;
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Could not load form template ${url} (${r.status})`);
      return r.arrayBuffer();
    }));
  }
  const buf = await cache.get(url);
  return PDFDocument.load(buf.slice(0), { ignoreEncryption: true });
}

// Safe setters: a missing field never throws; it is reported so the map can be fixed.
export function makeFiller(form) {
  const missing = [];
  const text = (name, value, size = 9) => {
    if (value == null || value === "") return;
    try {
      const f = form.getTextField(name);
      f.setFontSize(size);
      const s = winAnsi(value);
      const max = f.getMaxLength?.();
      if (max != null && s.length > max) {
        // Lexington's forms cap some fields (e.g. 33 chars). Widen the cap so the
        // full value prints; the appearance stream shrinks text to fit the box.
        try { f.setMaxLength(undefined); } catch { /* keep cap */ }
      }
      f.setText(s);
    } catch (e) {
      // last resort: truncate to the cap so nothing is lost silently
      try {
        const f = form.getTextField(name);
        const max = f.getMaxLength?.();
        if (max != null) { f.setText(winAnsi(value).slice(0, max)); return; }
      } catch { /* fall through */ }
      missing.push(name);
    }
  };
  const check = (name, on = true) => {
    if (!on) return;
    try { form.getCheckBox(name).check(); } catch { missing.push(name); }
  };
  const radio = (name, value) => {
    if (!value) return;
    try { form.getRadioGroup(name).select(value); } catch { missing.push(name); }
  };
  const dropdown = (name, value) => {
    if (!value) return;
    try { form.getDropdown(name).select(value); } catch { missing.push(name); }
  };
  return { text, check, radio, dropdown, missing };
}

export async function finalize(doc, form) {
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  try { form.updateFieldAppearances(helv); } catch { /* some templates lack DA */ }
  try { form.flatten(); } catch { /* keep fields if flatten fails */ }
  return doc;
}

// Stamp a PNG signature inside a box (bottom-left origin), preserving aspect ratio.
export async function stampSignature(doc, pageIndex, pngDataUrl, box) {
  if (!pngDataUrl) return;
  const page = doc.getPages()[pageIndex];
  const png = await doc.embedPng(pngDataUrl);
  const { x, y, width, height } = box;
  const scale = Math.min(width / png.width, height / png.height);
  const w = png.width * scale;
  const h = png.height * scale;
  page.drawImage(png, { x, y: y + (height - h) / 2, width: w, height: h });
}

export async function drawText(doc, pageIndex, items, size = 10) {
  const page = doc.getPages()[pageIndex];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const it of items) {
    if (it.text == null || it.text === "") continue;
    page.drawText(winAnsi(it.text), { x: it.x, y: it.y, size: it.size || size, font, color: rgb(0.1, 0.12, 0.16), maxWidth: it.maxWidth });
  }
}

export const yes = (b) => (b ? "Yes" : "No");
export const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s);
