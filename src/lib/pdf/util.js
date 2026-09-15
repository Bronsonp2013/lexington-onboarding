// pdf-lib helpers shared by every fill map.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const cache = new Map();

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
      const s = String(value);
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
        if (max != null) { f.setText(String(value).slice(0, max)); return; }
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
    page.drawText(String(it.text), { x: it.x, y: it.y, size: it.size || size, font, color: rgb(0.1, 0.12, 0.16), maxWidth: it.maxWidth });
  }
}

export const yes = (b) => (b ? "Yes" : "No");
export const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s);
