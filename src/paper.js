// paper.js — build-time procedural canvas textures: paper fibres, hand-cut deckled edges,
// typography helpers, and rubber-stamp distress. Deterministic via seeded PRNG.
import * as THREE from "three";
import { stream } from "./handmade.js";

export const FONT = {
  serif: (w, px) => `${w} ${px}px "Noto Serif SC"`,
  hand: (px) => `400 ${px}px "Long Cang"`,
  type: (px) => `400 ${px}px "Special Elite"`,
};

let MAX_ANISO = 8;
export function setMaxAniso(n) { MAX_ANISO = n; }

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
export function toTexture(c, { srgb = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAX_ANISO;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// paper stock: base colour + fibres + speckles + faint mottling
export function paperFill(g, w, h, color, { seed = 1, fibres = 1, mottle = 0.05, speck = 1 } = {}) {
  const r = stream(seed);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  const blobs = Math.round((w * h) / 9000);
  for (let i = 0; i < blobs; i++) {
    const x = r() * w, y = r() * h, rad = 20 + r() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const a = mottle * (r() * 0.9 + 0.1);
    gr.addColorStop(0, r() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(80,60,40,${a * 0.7})`);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const n = Math.round(((w * h) / 1400) * fibres);
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, len = 4 + r() * 16, a = r() * Math.PI;
    g.strokeStyle = r() < 0.55 ? `rgba(255,255,255,${0.1 + r() * 0.16})` : `rgba(60,45,30,${0.05 + r() * 0.08})`;
    g.lineWidth = 0.6 + r() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(
      x + Math.cos(a) * len * 0.5 + (r() - 0.5) * 4,
      y + Math.sin(a) * len * 0.5 + (r() - 0.5) * 4,
      x + Math.cos(a) * len,
      y + Math.sin(a) * len
    );
    g.stroke();
  }
  const s = Math.round(((w * h) / 5000) * speck);
  for (let i = 0; i < s; i++) {
    g.fillStyle = `rgba(40,30,20,${0.08 + r() * 0.2})`;
    const d = 0.6 + r() * 1.4;
    g.fillRect(r() * w, r() * h, d, d);
  }
}

// trace a polygon with a slightly irregular hand-cut edge
export function cutPath(g, pts, { seed = 7, wobble = 1.2, step = 10 } = {}) {
  const r = stream(seed);
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const x = x0 + (x1 - x0) * u + (r() - 0.5) * wobble * 2;
      const y = y0 + (y1 - y0) * u + (r() - 0.5) * wobble * 2;
      if (i === 0 && k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
  }
  g.closePath();
}

export function label(g, s, x, y, o = {}) {
  g.save();
  g.translate(x, y);
  if (o.rot) g.rotate(o.rot);
  g.font = o.font || FONT.serif(900, 48);
  g.fillStyle = o.color || "#1e1b18";
  g.textAlign = o.align || "center";
  g.textBaseline = o.baseline || "middle";
  if (o.spacing) g.letterSpacing = `${o.spacing}px`;
  if (o.alpha != null) g.globalAlpha = o.alpha;
  g.fillText(s, 0, 0);
  g.restore();
}

export function stampDistress(g, x, y, w, h, seed = 3, amount = 0.35) {
  const r = stream(seed);
  g.save();
  g.globalCompositeOperation = "destination-out";
  const n = Math.round(((w * h) / 60) * amount);
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.7})`;
    const d = 0.6 + r() * 2.2;
    g.fillRect(x + r() * w, y + r() * h, d, d);
  }
  g.restore();
}
