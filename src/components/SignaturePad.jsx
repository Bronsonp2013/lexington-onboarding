// Draw-on-screen signature. Emits a trimmed PNG data URL.
import React, { useEffect, useRef } from "react";
import SignaturePadLib from "signature_pad";

export function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const pad = new SignaturePadLib(canvas, { penColor: "#1c2230", minWidth: 0.9, maxWidth: 2.4, backgroundColor: "rgba(0,0,0,0)" });
    padRef.current = pad;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      pad.clear();
      if (data.length) pad.fromData(data);
      else if (value) pad.fromDataURL(value, { ratio: 1, width: canvas.offsetWidth, height: canvas.offsetHeight });
    };
    resize();
    window.addEventListener("resize", resize);

    const done = () => {
      if (pad.isEmpty()) { onChange(""); return; }
      onChange(trimmedPng(canvas));
    };
    pad.addEventListener("endStroke", done);
    return () => {
      window.removeEventListener("resize", resize);
      pad.off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clear = () => { padRef.current?.clear(); onChange(""); };

  return (
    <div>
      <div className="sigpad">
        <canvas ref={canvasRef} aria-label="Signature pad" />
        <span className="x">×</span>
        <span className="baseline" />
      </div>
      <div className="sig-tools">
        <span className="small muted">Sign above with your mouse or finger. This signature is placed on every form that requires one.</span>
        <button type="button" className="btn quiet" onClick={clear}>Clear</button>
      </div>
    </div>
  );
}

// Crop transparent margins so the stamp scales cleanly onto the PDF.
function trimmedPng(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (img[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return "";
  const pad = 12;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1; out.height = maxY - minY + 1;
  out.getContext("2d").drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
