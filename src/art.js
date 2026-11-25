// art.js — bespoke procedural cut-paper illustrations for the Gemini 4 Neon 1080x1080 pop-up book.
// Every texture is deterministic (fixed seeds) and uses tactile fibres, deckled edges, and sticker borders.
import { canvas, paperFill, cutPath, label, FONT, stampDistress } from "./paper.js";
import { stream } from "./handmade.js";

export const C = {
  ink: "#1f1b17",
  cream: "#f3ebdd",
  sticker: "#fbf6ec",
  gray: "#b4b2ac",
  grayMid: "#9c9a95",
  grayDark: "#7d7b77",
  navy: "#1c2d48",
  gold: "#dfb963",
  // Five capability pull-tab colors (Risograph paper stock palette)
  ctx: "#2e7f7a",     // 1M 统一上下文 (teal)
  think: "#e0a13a",   // 可调思考深度 (amber)
  multi: "#2f55a4",   // 原生多模态 (cobalt)
  agent: "#d8472e",   // Agent 编排 (neon vermilion)
  value: "#8e4b8a",   // 性能与成本 (plum)
  // Element accents
  hBlue: "#5aa9d6",
  cSlate: "#3a404c",
  neonCyan: "#58e8e0",
  neonCoral: "#ff6647",
  yellow: "#f2c230",
  red: "#c9412f",
};

export const K = [C.ctx, C.think, C.multi, C.agent, C.value];
export const K_LABEL = ["1M 上下文", "可调思考", "原生多模态", "Agent编排", "性能与成本"];
export const MOD_NAMES = ["文本·代码", "图像·图表", "音频·语音", "视频·PDF"];
export const MOD_CODES = ["TEXT", "IMAGE", "AUDIO", "VIDEO"];
export const MOD_STYLES = ["silhouette", "halftone", "pixel", "neon"];
export const THINK_LEVELS = ["LOW", "MED", "HIGH", "XHIGH"];

// ------------------------------------------------------------------ drawing helpers
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function poly(g, pts) {
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
}
function star4(g, cx, cy, rOut, rIn) {
  for (let i = 0; i < 4; i++) {
    const a0 = (i * Math.PI) / 2 - Math.PI / 2;
    const a1 = a0 + Math.PI / 4;
    const a2 = a0 + Math.PI / 2;
    if (i === 0) g.moveTo(cx + Math.cos(a0) * rOut, cy + Math.sin(a0) * rOut);
    g.quadraticCurveTo(
      cx + Math.cos(a1) * rIn, cy + Math.sin(a1) * rIn,
      cx + Math.cos(a2) * rOut, cy + Math.sin(a2) * rOut
    );
  }
  g.closePath();
}
function shadowed(g, fn, { blur = 10, dx = 4, dy = 5, a = 0.32 } = {}) {
  g.save();
  g.shadowColor = `rgba(20,12,6,${a})`;
  g.shadowBlur = blur;
  g.shadowOffsetX = dx;
  g.shadowOffsetY = dy;
  fn();
  g.restore();
}
function cutFill(g, build, color, seed = 1, { shadow = true } = {}) {
  g.beginPath();
  build(g);
  if (shadow) shadowed(g, () => { g.fillStyle = color; g.fill(); });
  else { g.fillStyle = color; g.fill(); }
  g.save();
  g.beginPath();
  build(g);
  g.clip();
  const r = stream(seed);
  for (let i = 0; i < 240; i++) {
    g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
    g.lineWidth = 0.8 + r();
    const x = r() * g.canvas.width, y = r() * g.canvas.height;
    const a = r() * Math.PI, l = 6 + r() * 14;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.restore();
}
function stickerMargin(g, builders, margin) {
  g.save();
  g.lineJoin = "round";
  g.lineCap = "round";
  g.strokeStyle = C.sticker;
  g.fillStyle = C.sticker;
  g.lineWidth = margin * 2;
  shadowed(g, () => {
    for (const b of builders) {
      g.beginPath();
      b(g);
      g.stroke();
      g.fill();
    }
  }, { blur: 6, dx: 0, dy: 2, a: 0.25 });
  g.restore();
}
function cardboard(g, w, h, seed, base = "#a89f92") {
  const r = stream(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 11) {
    g.fillStyle = `rgba(0,0,0,${0.035 + r() * 0.03})`;
    g.fillRect(x, 0, 4, h);
  }
  paperFill(g, w, h, "rgba(0,0,0,0)", { seed: seed + 1, fibres: 0.7, mottle: 0.07, speck: 1.5 });
}

// ------------------------------------------------------------------ walnut table
export function drawTable(size = 2048) {
  const c = canvas(size, size), g = c.getContext("2d"), r = stream(4242);
  g.fillStyle = "#5c4433";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 340; i++) {
    const y0 = r() * size, k = 1 + Math.floor(r() * 3), amp = 3 + r() * 16, ph = r() * 6.283;
    const k2 = k * 3 + 1, amp2 = amp * 0.3;
    const dark = r() < 0.6;
    g.strokeStyle = dark ? `rgba(38,24,14,${0.06 + r() * 0.16})` : `rgba(150,112,78,${0.05 + r() * 0.12})`;
    g.lineWidth = 1 + r() * (dark ? 5 : 3);
    for (const off of [-size, 0, size]) {
      g.beginPath();
      for (let x = 0; x <= size; x += 16) {
        const y = y0 + off + Math.sin((x / size) * 6.283 * k + ph) * amp + Math.sin((x / size) * 6.283 * k2 + ph * 1.7) * amp2;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(20,12,6,${r() * 0.12})`;
    g.fillRect(r() * size, r() * size, 1 + r() * 2, 1);
  }
  return c;
}

// ------------------------------------------------------------------ bookcloth cover & pages
export function drawCover(w = 2048, h = 1096, withTitle = true) {
  const c = canvas(w, h), g = c.getContext("2d"), r = stream(77);
  g.fillStyle = C.navy;
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`;
    g.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 3) {
    g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`;
    g.fillRect(x, 0, 1, h);
  }
  if (withTitle) {
    g.strokeStyle = C.gold;
    g.lineWidth = 6;
    g.strokeRect(84, 84, w - 168, h - 168);
    g.lineWidth = 2.5;
    g.strokeRect(108, 108, w - 216, h - 216);

    // Periodic element badge on left of cover title
    const bx = 260, by = h / 2 - 140, bs = 270;
    g.strokeStyle = C.gold;
    g.lineWidth = 5;
    g.strokeRect(bx, by, bs, bs);
    g.fillStyle = "rgba(88, 232, 224, 0.12)";
    g.fillRect(bx + 6, by + 6, bs - 12, bs - 12);
    label(g, "10", bx + 30, by + 44, { font: FONT.type(52), color: C.gold, align: "left" });
    label(g, "Ne", bx + bs / 2, by + 148, { font: FONT.type(142), color: C.neonCyan });
    label(g, "20.18", bx + bs / 2, by + 234, { font: FONT.type(36), color: C.gold });

    // Main gold foil title
    label(g, "GEMINI 4", w / 2 + 190, h / 2 - 90, { font: FONT.type(158), color: C.gold, spacing: 14 });
    label(g, "NEON", w / 2 + 190, h / 2 + 78, { font: FONT.type(184), color: "#fbf2dc", spacing: 26 });
    label(g, "GOOGLE DEEPMIND · 2026", w / 2 + 190, h / 2 + 210, { font: FONT.type(44), color: C.gold, spacing: 8 });

    // Five capability color dots at bottom center
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(w / 2 + (i - 2) * 68, h - 160, 14, 0, 6.283);
      g.fillStyle = K[i];
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = C.gold;
      g.stroke();
    }
    stampDistress(g, 0, 0, w, h, 9, 0.11);
  }
  return c;
}

export function drawPaperSheet(w, h, color, seed) {
  const c = canvas(w, h), g = c.getContext("2d");
  paperFill(g, w, h, color, { seed, fibres: 1.2 });
  return c;
}

export function drawCardboard(w = 512, h = 512, seed = 31) {
  const c = canvas(w, h), g = c.getContext("2d");
  cardboard(g, w, h, seed);
  return c;
}

// ------------------------------------------------------------------ Act 1: Balance scale tiles, note, dilemma sheet, stamp
export function drawElementTile(symbol, num, name, sub, accent, w = 512, h = 512) {
  const c = canvas(w, h), g = c.getContext("2d");
  cutPath(g, [[10, 10], [w - 10, 10], [w - 10, h - 10], [10, h - 10]], { seed: num * 17, wobble: 1.4 });
  g.save();
  g.clip();
  paperFill(g, w, h, "#f5efe3", { seed: num * 19 });
  g.fillStyle = accent;
  g.fillRect(0, 0, w, 46);
  g.fillRect(0, h - 22, w, 22);
  g.restore();
  g.strokeStyle = accent;
  g.lineWidth = 8;
  g.strokeRect(24, 62, w - 48, h - 100);
  label(g, String(num), 60, 110, { font: FONT.type(58), color: accent, align: "left" });
  label(g, symbol, w / 2, 238, { font: FONT.type(210), color: C.ink });
  label(g, name, w / 2, 355, { font: FONT.type(54), color: accent, spacing: 4 });
  label(g, sub, w / 2, 425, { font: FONT.serif(900, 50), color: "#524c45" });
  return c;
}

export function drawQuestionNote(w = 900, h = 520) {
  const c = canvas(w, h), g = c.getContext("2d");
  cutPath(g, [[8, 8], [w - 8, 8], [w - 8, h - 8], [8, h - 8]], { seed: 21, wobble: 1.5 });
  g.save();
  g.clip();
  paperFill(g, w, h, "#f6f0e4", { seed: 22 });
  g.restore();
  label(g, "选型便签 · MODEL CHOICE", 56, 76, { font: FONT.type(42), color: "#6d655c", align: "left" });
  g.strokeStyle = "rgba(109,101,92,0.35)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(56, 114);
  g.lineTo(w - 56, 114);
  g.stroke();
  label(g, "既要强推理", w / 2, 240, { font: FONT.hand(106), color: C.ink });
  label(g, "又要跑得快？", w / 2 + 12, 368, { font: FONT.hand(106), color: C.red });
  g.strokeStyle = "#4b4640";
  g.lineWidth = 4;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(110, 444);
  g.bezierCurveTo(300, 458, 560, 434, 790, 448);
  g.stroke();
  return c;
}

export function drawDilemmaPage(w = 768, h = 540, seed = 61) {
  const c = canvas(w, h), g = c.getContext("2d");
  cutPath(g, [[6, 6], [w - 6, 6], [w - 6, h - 6], [6, h - 6]], { seed, wobble: 0.9 });
  g.save();
  g.clip();
  paperFill(g, w, h, "#bebcb6", { seed: seed + 1, fibres: 0.8, mottle: 0.04 });
  g.fillStyle = "#a6a49e";
  g.fillRect(58, 52, w - 116, 260);
  // flat lifeless bars
  g.fillStyle = "#8a8883";
  for (let i = 0; i < 6; i++) {
    const bh = 70 + ((i * 29 + seed) % 70);
    g.fillRect(104 + i * 96, 286 - bh, 56, bh);
  }
  label(g, "速度 vs 深度", w / 2, 130, { font: FONT.serif(900, 74), color: "#4e4c48" });
  g.fillStyle = "#9d9b95";
  g.fillRect(58, 344, w - 180, 22);
  g.fillRect(58, 386, w - 260, 22);
  g.fillRect(58, 428, w - 340, 22);
  g.restore();
  return c;
}

export function drawGenericFloodPage(w = 768, h = 540, seed = 64) {
  const c = canvas(w, h), g = c.getContext("2d");
  cutPath(g, [[6, 6], [w - 6, 6], [w - 6, h - 6], [6, h - 6]], { seed, wobble: 0.9 });
  g.save();
  g.clip();
  paperFill(g, w, h, "#bdbbb5", { seed: seed + 1, fibres: 0.8, mottle: 0.03 });
  g.fillStyle = "#a7a59f";
  g.fillRect(60, 52, w - 120, 240);
  label(g, "PARAMS++", w / 2, 130, { font: FONT.type(88), color: "#686662", spacing: 6 });
  label(g, "同质化参数堆砌", w / 2, 222, { font: FONT.serif(900, 58), color: "#585652" });
  g.fillStyle = "#9c9a94";
  for (let i = 0; i < 3; i++) g.fillRect(60, 330 + i * 44, (w - 120) * (0.92 - i * 0.2), 20);
  g.restore();
  return c;
}

export function drawStampMark(w = 512) {
  const c = canvas(w, w), g = c.getContext("2d");
  g.strokeStyle = "#c8302a";
  g.lineCap = "round";
  g.lineWidth = 34;
  g.beginPath();
  g.arc(w / 2, w / 2, w / 2 - 40, 0, 6.283);
  g.stroke();
  g.lineWidth = 52;
  g.beginPath();
  g.moveTo(w * 0.3, w * 0.3); g.lineTo(w * 0.7, w * 0.7);
  g.moveTo(w * 0.7, w * 0.3); g.lineTo(w * 0.3, w * 0.7);
  g.stroke();
  stampDistress(g, 0, 0, w, w, 12, 0.85);
  return c;
}

export function drawCheck(w = 256) {
  const c = canvas(w, w), g = c.getContext("2d");
  const b = (g) => poly(g, [[34, 128], [78, 90], [112, 138], [196, 34], [236, 76], [112, 214]]);
  stickerMargin(g, [b], 14);
  cutFill(g, b, C.agent, 93, { shadow: false });
  return c;
}

// ------------------------------------------------------------------ Act 2: Tent cards (H / C), Hero Ne card, Badges, Tally
export function drawTentCard(which, w = 768, h = 480) {
  const c = canvas(w, h), g = c.getContext("2d");
  const isH = which === "H";
  const accent = isH ? C.hBlue : C.cSlate;
  cutPath(g, [[6, 6], [w - 6, 6], [w - 6, h - 6], [6, h - 6]], { seed: isH ? 101 : 102, wobble: 1 });
  g.save();
  g.clip();
  paperFill(g, w, h, "#f5efe3", { seed: isH ? 103 : 104 });
  g.fillStyle = accent;
  g.fillRect(0, h - 38, w, 38);
  g.restore();
  // periodic badge left
  g.strokeStyle = accent;
  g.lineWidth = 8;
  g.strokeRect(48, 62, 220, 290);
  label(g, isH ? "1" : "6", 74, 108, { font: FONT.type(48), color: accent, align: "left" });
  label(g, isH ? "H" : "C", 158, 224, { font: FONT.type(172), color: C.ink });
  // right text
  label(g, isH ? "Hydrogen" : "Carbon", 506, 152, { font: FONT.type(isH ? 82 : 90), color: accent });
  label(g, isH ? "极速轻量" : "深层重载", 506, 276, { font: FONT.serif(900, 80), color: C.ink });
  return c;
}

export function drawHeroNeonCard(w = 920, h = 640) {
  const c = canvas(w, h), g = c.getContext("2d");
  const frame = (g) => rr(g, 24, 24, w - 48, h - 48, 26);
  stickerMargin(g, [frame], 18);
  cutFill(g, frame, C.navy, 109, { shadow: false });
  g.strokeStyle = C.neonCyan;
  g.lineWidth = 8;
  g.beginPath();
  rr(g, 52, 52, w - 104, h - 104, 18);
  g.stroke();

  // Gemini 4-point star glow
  g.save();
  g.shadowColor = C.neonCyan;
  g.shadowBlur = 24;
  g.fillStyle = C.neonCyan;
  g.beginPath();
  star4(g, 156, 162, 58, 15);
  g.fill();
  g.restore();

  label(g, "10 · NEON", w - 88, 128, { font: FONT.type(58), color: C.gold, align: "right" });
  label(g, "Ne", 242, 338, { font: FONT.type(210), color: C.neonCyan });
  label(g, "GEMINI 4", 622, 278, { font: FONT.type(80), color: "#fbf6ec" });
  label(g, "NEON", 622, 386, { font: FONT.type(112), color: C.neonCoral, spacing: 8 });
  label(g, "黄金平衡点 · 2026.11", w / 2, 524, { font: FONT.serif(900, 54), color: C.gold, spacing: 8 });
  return c;
}

const ICONS = [
  (g, s) => { // 0: 1M infinite scroll / context window
    g.beginPath(); rr(g, -s * 0.95, -s * 0.65, s * 1.9, s * 1.3, s * 0.16); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.6, -s * 0.2); g.lineTo(s * 0.6, -s * 0.2);
    g.moveTo(-s * 0.6, s * 0.12); g.lineTo(s * 0.4, s * 0.12);
    g.moveTo(-s * 0.6, s * 0.42); g.lineTo(s * 0.6, s * 0.42); g.stroke();
  },
  (g, s) => { // 1: thinking dial gauge
    g.beginPath(); g.arc(0, s * 0.25, s * 0.92, Math.PI, 0); g.stroke();
    g.beginPath(); g.moveTo(0, s * 0.25); g.lineTo(s * 0.56, -s * 0.35); g.stroke();
    g.beginPath(); g.arc(0, s * 0.25, s * 0.16, 0, 6.283); g.fill();
  },
  (g, s) => { // 2: multimodal 2x2 grid
    const d = s * 0.14, b = s * 0.72;
    g.beginPath();
    rr(g, -b - d, -b - d, b, b, s * 0.12);
    rr(g, d, -b - d, b, b, s * 0.12);
    rr(g, -b - d, d, b, b, s * 0.12);
    rr(g, d, d, b, b, s * 0.12);
    g.stroke();
  },
  (g, s) => { // 3: agent hub + 3 subnodes
    g.beginPath(); g.arc(0, -s * 0.45, s * 0.34, 0, 6.283); g.fill();
    for (const dx of [-0.72, 0, 0.72]) {
      g.beginPath(); g.moveTo(0, -s * 0.12); g.lineTo(dx * s, s * 0.45); g.stroke();
      g.beginPath(); g.arc(dx * s, s * 0.62, s * 0.22, 0, 6.283); g.stroke();
    }
  },
  (g, s) => { // 4: pareto rising star curve
    g.beginPath(); g.moveTo(-s * 0.85, s * 0.75); g.lineTo(-s * 0.85, -s * 0.8);
    g.moveTo(-s * 0.85, s * 0.75); g.lineTo(s * 0.9, s * 0.75); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.65, s * 0.5); g.quadraticCurveTo(-s * 0.1, s * 0.25, s * 0.62, -s * 0.52); g.stroke();
    g.beginPath(); star4(g, s * 0.62, -s * 0.52, s * 0.34, s * 0.1); g.fill();
  },
];

export function drawIcon(g, k, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = Math.max(4, s * 0.15);
  g.lineCap = "round";
  g.lineJoin = "round";
  ICONS[k](g, s);
  g.restore();
}

export function drawBadge(k, w = 440, h = 440) {
  const c = canvas(w, h), g = c.getContext("2d");
  const body = (g) => g.arc(w / 2, h / 2, 186, 0, 6.283);
  stickerMargin(g, [body], 16);
  cutFill(g, body, K[k], 110 + k, { shadow: false });
  drawIcon(g, k, w / 2, h / 2, 78, C.sticker);
  return c;
}

export function drawTally(n, w = 512) {
  const c = canvas(w, w), g = c.getContext("2d"), r = stream(131);
  const S = [
    [[110, 110], [400, 110]],
    [[255, 110], [255, 410]],
    [[255, 250], [380, 250]],
    [[140, 250], [140, 410]],
    [[90, 410], [420, 410]],
  ];
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const [[x0, y0], [x1, y1]] = S[i];
    for (let k = 0; k < 5; k++) {
      g.strokeStyle = `rgba(245,235,215,${0.32 + r() * 0.32})`;
      g.lineWidth = 7 + r() * 7;
      g.beginPath();
      g.moveTo(x0 + (r() - 0.5) * 8, y0 + (r() - 0.5) * 8);
      g.quadraticCurveTo(
        (x0 + x1) / 2 + (r() - 0.5) * 16,
        (y0 + y1) / 2 + (r() - 0.5) * 16,
        x1 + (r() - 0.5) * 8,
        y1 + (r() - 0.5) * 8
      );
      g.stroke();
    }
  }
  return c;
}

// ------------------------------------------------------------------ pull-tabs & tags
export function drawTab(k, w = 128, h = 512) {
  const c = canvas(w, h), g = c.getContext("2d");
  paperFill(g, w, h, K[k], { seed: 140 + k, fibres: 1, mottle: 0.06 });
  g.fillStyle = "rgba(255,255,255,0.2)";
  g.fillRect(0, 0, 10, h);
  return c;
}

export function drawTag(k, w = 768, h = 300) {
  const c = canvas(w, h), g = c.getContext("2d");
  cutPath(g, [[10, 10], [w - 10, 10], [w - 10, h - 10], [10, h - 10]], { seed: 150 + k, wobble: 1.3 });
  g.save();
  g.clip();
  paperFill(g, w, h, "#f6f0e4", { seed: 160 + k });
  g.fillStyle = K[k];
  g.fillRect(0, 0, w, 28);
  g.restore();
  drawIcon(g, k, 104, h / 2 + 14, 52, K[k]);
  label(g, K_LABEL[k], w / 2 + 74, h / 2 + 16, { font: FONT.serif(900, k === 1 ? 104 : 90), color: K[k] });
  return c;
}

// ------------------------------------------------------------------ Layer 1: 1M Unified Context Backdrop & Ribbons
export function drawContextBackdrop(w = 2048, h = 1096) {
  const c = canvas(w, h), g = c.getContext("2d"), r = stream(201);
  // Deep dusk-cyan astronomical paper backdrop
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#102838");
  sky.addColorStop(0.52, "#1c4a5c");
  sky.addColorStop(0.84, "#2c6d75");
  sky.addColorStop(1, "#e8b482");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  paperFill(g, w, h, "rgba(0,0,0,0)", { seed: 202, fibres: 0.85, mottle: 0.05 });

  // Paper star specks + constellation lines
  const stars = [];
  for (let i = 0; i < 85; i++) {
    const x = r() * w, y = r() * (h * 0.72), s = 2.5 + r() * 4.5;
    g.fillStyle = `rgba(250,242,216,${0.35 + r() * 0.55})`;
    g.fillRect(x, y, s, s);
    if (i < 12) stars.push([x, y]);
  }
  g.strokeStyle = "rgba(88,232,224,0.2)";
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < stars.length - 1; i++) {
    g.moveTo(stars[i][0], stars[i][1]);
    g.lineTo(stars[i + 1][0], stars[i + 1][1]);
  }
  g.stroke();

  // Giant cut-paper glowing moon/emblem on top-right: Ne · 10
  const nx = 1690, ny = 278;
  cutFill(g, (g) => g.arc(nx, ny, 166, 0, 6.283), "#f6ead0", 203);
  g.strokeStyle = C.neonCoral;
  g.lineWidth = 10;
  g.beginPath();
  g.arc(nx, ny, 146, 0, 6.283);
  g.stroke();
  label(g, "10", nx - 64, ny - 76, { font: FONT.type(46), color: C.navy });
  label(g, "Ne", nx, ny + 18, { font: FONT.type(148), color: C.navy });
  label(g, "NEON", nx, ny + 104, { font: FONT.type(38), color: C.agent, spacing: 6 });

  // Giant architectural context ruler across upper-left to center
  label(g, "1,048,576", 740, 260, { font: FONT.type(196), color: "#fbf4e4", spacing: 8 });
  label(g, "UNIFIED CONTEXT WINDOW · 统一百万上下文", 740, 390, { font: FONT.serif(900, 56), color: C.neonCyan, spacing: 6 });

  // Graduated ruler tape
  const ry = 530;
  cutFill(g, (g) => rr(g, 110, ry - 48, 1828, 110, 14), "#f2eadb", 208);
  g.fillStyle = C.ctx;
  g.fillRect(130, ry - 32, 1788, 22);
  g.strokeStyle = C.ink;
  g.lineWidth = 4;
  for (let i = 0; i <= 40; i++) {
    const x = 140 + (i / 40) * 1768;
    const tall = i % 10 === 0 ? 44 : i % 5 === 0 ? 30 : 18;
    g.beginPath();
    g.moveTo(x, ry - 10);
    g.lineTo(x, ry - 10 + tall);
    g.stroke();
  }
  const marks = [[140, "0"], [582, "256K"], [1024, "512K"], [1466, "768K"], [1908, "1M TOKENS"]];
  marks.forEach(([x, s], idx) => {
    label(g, s, x, ry + 48, {
      font: FONT.type(idx === 4 ? 44 : 38),
      color: idx === 4 ? C.agent : C.ink,
      align: idx === 0 ? "left" : idx === 4 ? "right" : "center",
    });
  });

  // Silhouette horizon mountains & glowing horizon city at bottom
  cutFill(g, (g) => poly(g, [[0, h], [0, 790], [220, 720], [420, 780], [680, 690], [920, 770], [1160, 710], [1420, 790], [1680, 700], [1900, 760], [w, 720], [w, h]]), "#1a3c4a", 209);
  return c;
}

export function drawContextRibbon(isFront, w = 2048, h = 250) {
  const c = canvas(w, h), g = c.getContext("2d");
  const top = (g) => {
    g.moveTo(0, h);
    g.lineTo(0, 88);
    for (let x = 0; x < w; x += 256) {
      g.bezierCurveTo(x + 48, 22, x + 152, 18, x + 190, 68);
      g.bezierCurveTo(x + 210, 92, x + 232, 96, x + 256, 88);
    }
    g.lineTo(w, h);
    g.closePath();
  };
  cutFill(g, top, isFront ? "#dfb06c" : "#2b6f7a", isFront ? 251 : 240);
  g.save();
  g.beginPath();
  top(g);
  g.clip();
  g.strokeStyle = isFront ? "#f8e7c4" : "#7fd3cc";
  g.lineWidth = 10;
  g.beginPath();
  for (let x = 0; x < w; x += 256) {
    g.moveTo(x + 24, 78);
    g.bezierCurveTo(x + 64, 38, x + 144, 34, x + 178, 68);
  }
  g.stroke();
  label(
    g,
    isFront ? "1M 长解码  ·  LONG DECODE  ·  64K+ 同步输出" : "INPUT 输入  +  THINKING 思考  +  OUTPUT 输出",
    w / 2,
    isFront ? h * 0.64 : h * 0.42,
    { font: FONT.serif(900, isFront ? 54 : 52), color: isFront ? "#2e2214" : "#f4efe4", spacing: 8 }
  );
  g.restore();
  return c;
}

export function drawBeam(w = 1024, h = 256) {
  const c = canvas(w, h), g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, "rgba(88,232,224,0.82)");
  gr.addColorStop(0.45, "rgba(255,226,140,0.45)");
  gr.addColorStop(1, "rgba(255,226,140,0)");
  g.fillStyle = gr;
  g.beginPath();
  poly(g, [[0, h / 2 - 12], [w, 0], [w, h], [0, h / 2 + 12]]);
  g.fill();
  return c;
}

// ------------------------------------------------------------------ Layer 2: Adjustable Thinking-Level Dial & 4 Origami Bars
export function drawThinkingDial(w = 880, h = 720) {
  const c = canvas(w, h), g = c.getContext("2d");
  const cx = w / 2, cy = h - 165, R = 340;
  const arcBody = (g) => {
    g.arc(cx, cy, R, Math.PI, 0);
    g.lineTo(cx + R, cy + 120);
    g.lineTo(cx - R, cy + 120);
    g.closePath();
  };
  stickerMargin(g, [arcBody], 18);
  cutFill(g, arcBody, "#f4ede0", 310, { shadow: false });

  // 4 colored arc wedges: LOW -> MED -> HIGH -> XHIGH
  const cols = [C.ctx, C.think, C.neonCoral, C.agent];
  for (let i = 0; i < 4; i++) {
    const a0 = Math.PI + (i * Math.PI) / 4 + 0.04;
    const a1 = Math.PI + ((i + 1) * Math.PI) / 4 - 0.04;
    g.beginPath();
    g.arc(cx, cy, R - 34, a0, a1);
    g.arc(cx, cy, R - 110, a1, a0, true);
    g.closePath();
    g.fillStyle = cols[i];
    g.fill();
    const am = (a0 + a1) / 2;
    label(g, THINK_LEVELS[i], cx + Math.cos(am) * (R - 154), cy + Math.sin(am) * (R - 154), {
      font: FONT.type(44),
      color: i === 3 ? C.agent : C.ink,
    });
  }
  g.strokeStyle = C.ink;
  g.lineWidth = 8;
  g.beginPath();
  g.arc(cx, cy, R - 26, Math.PI, 0);
  g.stroke();

  label(g, "THINKING LEVEL", cx, cy + 56, { font: FONT.type(52), color: C.ink, spacing: 4 });
  label(g, "四档可调思考深度", cx, cy + 104, { font: FONT.serif(900, 42), color: "#685c4e" });
  return c;
}

export function drawThinkBar(i, w = 280, h = 680) {
  const c = canvas(w, h), g = c.getContext("2d");
  const cols = [C.ctx, C.think, C.neonCoral, C.agent];
  const barH = Math.round(h * [0.36, 0.56, 0.76, 0.94][i]);
  const topY = h - barH;
  const rect = (g) => rr(g, 34, topY + 26, w - 68, barH - 36, 18);
  const shapes = [rect];
  if (i === 3) {
    shapes.push((g) => star4(g, w / 2, topY + 26, 48, 14));
  }
  stickerMargin(g, shapes, 14);
  cutFill(g, rect, cols[i], 320 + i, { shadow: false });
  // vertical origami crease
  g.fillStyle = "rgba(255,255,255,0.16)";
  g.fillRect(34, topY + 26, (w - 68) / 2, barH - 36);
  g.fillStyle = "rgba(0,0,0,0.08)";
  g.fillRect(w / 2, topY + 26, (w - 68) / 2, barH - 36);
  if (i === 3) {
    cutFill(g, (g) => star4(g, w / 2, topY + 26, 44, 13), C.yellow, 329, { shadow: false });
  }
  label(g, THINK_LEVELS[i], w / 2, h - 72, { font: FONT.type(54), color: "#fbf6ec" });
  return c;
}

// ------------------------------------------------------------------ Layer 3: 4-Panel Multimodal Accordion + Slats + Mini Props
function modalityScene(shape, mod, W, H) {
  if (mod === 0) { // TEXT & CODE
    shape("card", (g) => rr(g, W * 0.12, H * 0.12, W * 0.76, H * 0.76, 18));
    shape("accent", (g) => rr(g, W * 0.18, H * 0.22, W * 0.26, H * 0.08, 8));
    shape("line", (g) => {
      for (let i = 0; i < 5; i++) {
        const y = H * (0.38 + i * 0.1);
        g.moveTo(W * 0.18, y);
        g.lineTo(W * (0.78 - (i % 3) * 0.12), y);
      }
    });
    shape("el2", (g) => {
      g.moveTo(W * 0.68, H * 0.22); g.lineTo(W * 0.62, H * 0.28); g.lineTo(W * 0.68, H * 0.34);
      g.moveTo(W * 0.74, H * 0.22); g.lineTo(W * 0.8, H * 0.28); g.lineTo(W * 0.74, H * 0.34);
    });
  } else if (mod === 1) { // IMAGE & VISION
    shape("card", (g) => rr(g, W * 0.1, H * 0.12, W * 0.8, H * 0.76, 16));
    shape("sun", (g) => g.arc(W * 0.72, H * 0.31, H * 0.12, 0, 6.283));
    shape("el", (g) => poly(g, [[W * 0.14, H * 0.82], [W * 0.38, H * 0.38], [W * 0.6, H * 0.82]]));
    shape("accent", (g) => poly(g, [[W * 0.42, H * 0.82], [W * 0.66, H * 0.46], [W * 0.86, H * 0.82]]));
    shape("line", (g) => { rr(g, W * 0.3, H * 0.32, W * 0.34, H * 0.42, 8); });
  } else if (mod === 2) { // AUDIO & WAVEFORM
    const heights = [0.16, 0.34, 0.56, 0.72, 0.44, 0.82, 0.62, 0.38, 0.68, 0.48, 0.28, 0.18];
    shape("accent", (g) => {
      heights.forEach((hf, k) => {
        const x = W * (0.12 + k * 0.066);
        const bh = H * hf * 0.74;
        rr(g, x, H / 2 - bh / 2, W * 0.042, bh, 12);
      });
    });
    shape("line", (g) => {
      g.moveTo(W * 0.08, H / 2);
      g.lineTo(W * 0.92, H / 2);
    });
  } else { // VIDEO & PDF
    shape("card", (g) => rr(g, W * 0.1, H * 0.14, W * 0.54, H * 0.72, 16));
    shape("accent", (g) => poly(g, [[W * 0.3, H * 0.34], [W * 0.5, H * 0.5], [W * 0.3, H * 0.66]]));
    shape("el", (g) => rr(g, W * 0.68, H * 0.16, W * 0.22, H * 0.68, 12));
    shape("line", (g) => {
      for (let i = 0; i < 4; i++) {
        g.moveTo(W * 0.72, H * (0.3 + i * 0.13));
        g.lineTo(W * 0.86, H * (0.3 + i * 0.13));
      }
    });
  }
}

const MOD_LOOKS = {
  ink: {
    bg(g, W, H) { paperFill(g, W, H, "#f2eadb", { seed: 300, fibres: 0.8 }); },
    fill: { card: "#e8dfd0", sun: "#f2c230", el: "#d5cec0", accent: "#c7d3db", el2: "#2a2622" },
    stroke: "#2a2622", lw: 6, strokeOnly: { line: 1, el2: 1 },
  },
  silhouette: {
    bg(g, W, H) {
      const s = g.createLinearGradient(0, 0, 0, H);
      s.addColorStop(0, "#f2c989"); s.addColorStop(1, "#d97843");
      g.fillStyle = s; g.fillRect(0, 0, W, H);
    },
    fill: { card: "#231a15", accent: "#f2c230", el2: "#fff2d6" },
    stroke: "#fff2d6", lw: 7, strokeOnly: { line: 1, el2: 1 },
  },
  halftone: {
    bg(g, W, H) {
      g.fillStyle = "#5cc6ea"; g.fillRect(0, 0, W, H);
      for (let y = 8; y < H; y += 18) for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) {
        g.fillStyle = "#3ba1d0"; g.beginPath(); g.arc(x, y, 5, 0, 6.283); g.fill();
      }
    },
    fill: { card: "#fbf6ec", sun: "#ef3b2d", el: "#2462c4", accent: "#ffe34a" },
    stroke: "#111111", lw: 7, strokeOnly: { line: 1 },
  },
  pixel: {
    bg(g, W, H) { g.fillStyle = "#162752"; g.fillRect(0, 0, W, H); },
    fill: { accent: "#58e8e0", line: "#ffd23f" },
    lw: 10, strokeOnly: { line: 1 },
    palette: ["#162752", "#58e8e0", "#ffd23f", "#ef3b2d", "#fbf6ec"],
  },
  neon: {
    bg(g, W, H) {
      const s = g.createLinearGradient(0, 0, 0, H);
      s.addColorStop(0, "#150f33"); s.addColorStop(1, "#0b0820");
      g.fillStyle = s; g.fillRect(0, 0, W, H);
    },
    glow: { card: "#5ff2ff", accent: "#ff4fb0", el: "#ffe14d", line: "#5ff2ff" },
    lw: 6,
  },
};

export function drawModalityShot(mod, look, W = 900, H = 520) {
  const L = MOD_LOOKS[look];
  const c = canvas(W, H), g = c.getContext("2d");
  const pix = look === "pixel" ? 12 : 1;
  const d = pix > 1 ? canvas(W / pix, H / pix) : c;
  const gd = d.getContext("2d");
  if (pix > 1) gd.scale(1 / pix, 1 / pix);
  L.bg(gd, W, H);
  const shape = (role, build) => {
    gd.beginPath(); build(gd);
    gd.lineJoin = "round"; gd.lineCap = "round";
    if (L.glow) {
      const col = L.glow[role] || "#5ff2ff";
      gd.save();
      gd.shadowColor = col; gd.shadowBlur = 22; gd.strokeStyle = col; gd.lineWidth = L.lw;
      if (role === "accent") { gd.fillStyle = col + "44"; gd.fill(); }
      gd.stroke();
      gd.shadowBlur = 6; gd.lineWidth = L.lw * 0.45; gd.strokeStyle = "#ffffff"; gd.globalAlpha = 0.6; gd.stroke();
      gd.restore();
      return;
    }
    const fill = L.fill && L.fill[role];
    if (L.strokeOnly && L.strokeOnly[role]) {
      gd.strokeStyle = fill || L.stroke || "#2a2622";
      gd.lineWidth = L.lw;
      gd.stroke();
      return;
    }
    if (fill) { gd.fillStyle = fill; gd.fill(); }
    if (L.stroke) { gd.strokeStyle = L.stroke; gd.lineWidth = L.lw; gd.stroke(); }
  };
  modalityScene(shape, mod, W, H);
  if (pix > 1) {
    const id = gd.getImageData(0, 0, d.width, d.height), px = id.data;
    const pal = L.palette.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    for (let i = 0; i < px.length; i += 4) {
      let best = 0, bd = 1e9;
      for (let k = 0; k < pal.length; k++) {
        const dr = px[i] - pal[k][0], dg = px[i + 1] - pal[k][1], db = px[i + 2] - pal[k][2];
        const dd = dr * dr + dg * dg + db * db;
        if (dd < bd) { bd = dd; best = k; }
      }
      px[i] = pal[best][0]; px[i + 1] = pal[best][1]; px[i + 2] = pal[best][2]; px[i + 3] = 255;
    }
    gd.putImageData(id, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(d, 0, 0, W, H);
  }
  return c;
}

export function drawPanelFrame(i, w = 1024, h = 860) {
  const c = canvas(w, h), g = c.getContext("2d");
  paperFill(g, w, h, "#f4ede0", { seed: 400 + i, fibres: 1 });
  g.save();
  g.globalCompositeOperation = "destination-out";
  for (let k = 0; k < 11; k++) {
    g.beginPath(); rr(g, 34 + k * 88, 14, 42, 30, 7); g.fill();
    g.beginPath(); rr(g, 34 + k * 88, h - 44, 42, 30, 7); g.fill();
  }
  g.restore();
  label(g, `0${i + 1}`, 62, 114, { font: FONT.type(86), color: "#5e564d", align: "left" });
  label(g, MOD_CODES[i], w - 58, 114, { font: FONT.type(112), color: C.multi, align: "right" });
  g.strokeStyle = "#2a2622";
  g.lineWidth = 6;
  g.strokeRect(58, 176, 908, 525);
  return c;
}

export function drawModLabel(i, w = 500, h = 136) {
  const c = canvas(w, h), g = c.getContext("2d");
  cutPath(g, [[6, 6], [w - 6, 6], [w - 6, h - 6], [6, h - 6]], { seed: 430 + i, wobble: 1 });
  g.save();
  g.clip();
  paperFill(g, w, h, C.multi, { seed: 440 + i, fibres: 0.8 });
  g.restore();
  label(g, MOD_NAMES[i], w / 2, h / 2 + 4, { font: FONT.serif(900, 74), color: "#f6f0e4", spacing: 6 });
  return c;
}

export function drawModProp(i, w = 640, h = 512) {
  const c = canvas(w, h), g = c.getContext("2d");
  const parts = [];
  const P = (color, build, seed) => parts.push({ color, build, seed });
  if (i === 0) { // code typewriter
    P("#2d323b", (g) => { rr(g, 110, 210, 420, 230, 28); }, 501);
    P("#f6f0e4", (g) => { g.rect(190, 56, 260, 180); }, 502);
    P(C.ctx, (g) => { g.rect(226, 100, 140, 16); g.rect(226, 136, 180, 16); g.rect(226, 172, 110, 16); }, 503);
    P("#dfd6c5", (g) => { for (let k = 0; k < 6; k++) g.arc(170 + k * 60, 340, 20, 0, 6.283); }, 504);
  } else if (i === 1) { // vintage paper camera
    P("#2b3648", (g) => { rr(g, 100, 140, 440, 290, 32); }, 511);
    P("#d9b460", (g) => { rr(g, 200, 84, 180, 70, 18); g.rect(100, 140, 440, 62); }, 512);
    P("#f6f0e4", (g) => { g.arc(320, 295, 102, 0, 6.283); }, 513);
    P("#2462c4", (g) => { g.arc(320, 295, 68, 0, 6.283); }, 514);
    P(C.neonCyan, (g) => { g.arc(296, 272, 18, 0, 6.283); }, 515);
  } else if (i === 2) { // acoustic horn / waveform speaker
    P("#4a3222", (g) => { rr(g, 130, 110, 380, 340, 28); }, 521);
    P("#231c18", (g) => { g.arc(320, 285, 126, 0, 6.283); }, 522);
    P(C.value, (g) => { g.arc(320, 285, 86, 0, 6.283); }, 523);
    P(C.gold, (g) => { g.arc(320, 285, 32, 0, 6.283); }, 524);
  } else { // film clapperboard + PDF badge
    P("#222026", (g) => { rr(g, 110, 170, 420, 270, 22); }, 531);
    P("#f6f0e4", (g) => { poly(g, [[110, 170], [530, 170], [530, 106], [110, 106]]); }, 532);
    P(C.agent, (g) => {
      for (let k = 0; k < 4; k++) poly(g, [[140 + k * 95, 106], [190 + k * 95, 106], [160 + k * 95, 170], [110 + k * 95, 170]]);
    }, 533);
    P(C.neonCyan, (g) => { poly(g, [[276, 250], [386, 310], [276, 370]]); }, 534);
  }
  stickerMargin(g, parts.map((p) => p.build), 16);
  for (const p of parts) cutFill(g, p.build, p.color, p.seed, { shadow: false });
  return c;
}

// ------------------------------------------------------------------ Layer 4: Agent Orchestration Tower + Subagents + Flag
export function drawAgentTower(w = 640, h = 800) {
  const c = canvas(w, h), g = c.getContext("2d");
  const parts = [];
  const P = (color, build, seed) => parts.push({ color, build, seed });
  P(C.navy, (g) => poly(g, [[150, 740], [490, 740], [430, 250], [210, 250]]), 601);
  P(C.agent, (g) => rr(g, 170, 210, 300, 88, 20), 602);
  P(C.neonCyan, (g) => star4(g, 320, 118, 92, 24), 603);
  P("#f4ede0", (g) => rr(g, 200, 360, 240, 110, 16), 604);
  P(C.gold, (g) => rr(g, 184, 520, 272, 160, 16), 605);
  stickerMargin(g, parts.map((p) => p.build), 18);
  for (const p of parts) cutFill(g, p.build, p.color, p.seed, { shadow: false });
  label(g, "NEON", 320, 418, { font: FONT.type(74), color: C.navy });
  label(g, "低幻觉", 320, 574, { font: FONT.serif(900, 58), color: C.ink });
  label(g, "高可控", 320, 642, { font: FONT.serif(900, 58), color: C.agent });
  return c;
}

export function drawSubagent(i, w = 520, h = 400) {
  const c = canvas(w, h), g = c.getContext("2d");
  const meta = [
    { en: "CODE", zh: "代码工程", col: C.ctx },
    { en: "DATA", zh: "数据分析", col: C.think },
    { en: "LAB", zh: "科研推理", col: C.multi },
  ][i];
  const body = (g) => rr(g, 32, 36, w - 64, h - 72, 26);
  const ear = (g) => g.arc(w / 2, 40, 34, 0, 6.283);
  stickerMargin(g, [body, ear], 16);
  cutFill(g, ear, meta.col, 620 + i, { shadow: false });
  cutFill(g, body, "#f6f0e4", 630 + i, { shadow: false });
  g.fillStyle = meta.col;
  g.fillRect(32, 36, w - 64, 56);
  label(g, meta.en, w / 2, 178, { font: FONT.type(102), color: meta.col });
  label(g, meta.zh, w / 2, 286, { font: FONT.serif(900, 66), color: C.ink });
  return c;
}

export function drawFlag(w = 256, h = 256) {
  const c = canvas(w, h), g = c.getContext("2d");
  const b = (g) => poly(g, [[20, 30], [230, 90], [20, 150]]);
  stickerMargin(g, [b], 10);
  cutFill(g, b, C.agent, 720, { shadow: false });
  return c;
}

// ------------------------------------------------------------------ Layer 5: Pareto Chart Card & Price/Cache Tag
export function drawParetoCard(w = 840, h = 680) {
  const c = canvas(w, h), g = c.getContext("2d");
  const body = (g) => rr(g, 24, 24, w - 48, h - 48, 22);
  stickerMargin(g, [body], 16);
  cutFill(g, body, "#f6f0e4", 730, { shadow: false });
  g.fillStyle = C.value;
  g.fillRect(24, 24, w - 48, 92);
  label(g, "FRONTIER · 前沿梯队", w / 2, 74, { font: FONT.serif(900, 50), color: "#fbf6ec", spacing: 4 });

  // Axes
  g.strokeStyle = C.ink;
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(116, 172); g.lineTo(116, 540); g.lineTo(748, 540);
  g.stroke();

  // Pareto curve
  g.strokeStyle = C.value;
  g.lineWidth = 10;
  g.setLineDash([16, 12]);
  g.beginPath();
  g.moveTo(150, 496);
  g.quadraticCurveTo(360, 290, 650, 210);
  g.stroke();
  g.setLineDash([]);

  // Other dots
  g.fillStyle = C.grayDark;
  for (const [x, y] of [[240, 440], [360, 390], [500, 355], [610, 310]]) {
    g.beginPath(); g.arc(x, y, 16, 0, 6.283); g.fill();
  }

  // Highlighted Neon Star at top of curve
  g.save();
  g.fillStyle = C.agent;
  g.beginPath();
  star4(g, 565, 226, 54, 16);
  g.fill();
  g.restore();

  label(g, "NEON #3", 565, 164, { font: FONT.type(54), color: C.agent });
  label(g, "VALS #2 · 综合前沿", 430, 598, { font: FONT.serif(900, 50), color: C.ink });
  return c;
}

export function drawPriceTag(w = 720, h = 420) {
  const c = canvas(w, h), g = c.getContext("2d");
  const pts = [[74, 18], [w - 18, 18], [w - 18, h - 18], [74, h - 18], [16, h / 2]];
  const body = (g) => poly(g, pts);
  stickerMargin(g, [body], 14);
  cutFill(g, body, "#efe2c4", 740, { shadow: false });
  g.beginPath();
  g.arc(72, h / 2, 18, 0, 6.283);
  g.fillStyle = "#5a4b38";
  g.fill();

  label(g, "$3 / $15", w / 2 + 28, 134, { font: FONT.type(120), color: C.ink });
  // Crimson stamp pill for -95% Cache
  cutFill(g, (g) => rr(g, 148, 226, w - 210, 128, 24), C.agent, 744, { shadow: false });
  label(g, "-95% 缓存输入", w / 2 + 40, 294, { font: FONT.serif(900, 64), color: "#fbf6ec" });
  return c;
}

// ------------------------------------------------------------------ Diegetic 3D Tabletop Caption Strip
// Hand-torn kraft/cream cardstock strip with deckled edges, paper fibres, colored washi-tape tabs,
// and letterpress ink so the subtitle lives physically on the walnut tabletop inside Three.js.
const CUE_ACCENTS = [
  C.hBlue, C.red, C.neonCyan, C.gold, C.navy,
  C.ctx, C.think, C.multi, C.agent, C.value,
  C.grayDark, C.neonCoral,
];

export function drawCaptionStrip(text, idx, w = 1520, h = 216) {
  const c = canvas(w, h), g = c.getContext("2d");
  const fontSize = text.length > 20 ? 54 : 58;
  g.font = FONT.serif(900, fontSize);
  g.letterSpacing = "2px";
  const tw = g.measureText(text).width;
  const padX = 86;
  const boxW = Math.min(w - 64, Math.max(520, tw + padX * 2));
  const x0 = (w - boxW) / 2;
  const x1 = x0 + boxW;
  const y0 = 32, y1 = h - 22;

  // Hand-torn deckled cardstock polygon
  const pts = [
    [x0 + 6, y0 + 4], [x0 + boxW * 0.25, y0], [x0 + boxW * 0.52, y0 + 5], [x0 + boxW * 0.78, y0 + 1], [x1 - 5, y0 + 6],
    [x1, (y0 + y1) * 0.5], [x1 - 7, y1 - 4], [x0 + boxW * 0.72, y1], [x0 + boxW * 0.45, y1 - 5], [x0 + boxW * 0.2, y1 - 1],
    [x0 + 4, y1 - 5], [x0, (y0 + y1) * 0.48],
  ];
  cutPath(g, pts, { seed: 910 + idx * 13, wobble: 2.2, step: 28 });
  g.save();
  g.clip();
  paperFill(g, w, h, "#f1e6d2", { seed: 920 + idx * 17, fibres: 1.5, mottle: 0.08, speck: 1.3 });
  // Subtle warm deckled inner edge shade
  g.strokeStyle = "rgba(92, 68, 44, 0.22)";
  g.lineWidth = 6;
  g.stroke();
  // Delicate ruled craft line near bottom of paper strip
  g.strokeStyle = "rgba(110, 88, 66, 0.18)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x0 + 42, y1 - 24);
  g.lineTo(x1 - 42, y1 - 24);
  g.stroke();
  g.restore();

  // Translucent colored washi-tape tabs holding left & right corners onto the desk
  const accent = CUE_ACCENTS[idx % CUE_ACCENTS.length];
  const drawTape = (tx, ty, rot, s) => {
    g.save();
    g.translate(tx, ty);
    g.rotate(rot);
    g.globalAlpha = 0.84;
    cutPath(g, [[-36, -15], [36, -15], [36, 15], [-36, 15]], { seed: s, wobble: 1.6, step: 14 });
    g.fillStyle = accent;
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.fillRect(-34, -13, 68, 5);
    g.restore();
  };
  drawTape(x0 + 28, y0 + 14, -0.42, 950 + idx);
  drawTape(x1 - 28, y0 + 16, 0.38, 970 + idx);

  // Letterpress ink caption text
  label(g, text, w / 2, (y0 + y1) / 2 + 2, {
    font: FONT.serif(900, fontSize),
    color: "#1e1915",
    spacing: 2,
  });
  stampDistress(g, x0 + 30, y0 + 20, boxW - 60, y1 - y0 - 40, 990 + idx, 0.07);
  return c;
}

// ------------------------------------------------------------------ Background Studio Workshop Textures
export function drawWorkshopWall(w = 2048, h = 1024) {
  const c = canvas(w, h), g = c.getContext("2d"), r = stream(1401);
  // Warm aged plaster wall with cozy studio tungsten gradient
  const gr = g.createRadialGradient(w * 0.52, h * 0.36, 90, w * 0.52, h * 0.42, w * 0.65);
  gr.addColorStop(0, "#6c523c");
  gr.addColorStop(0.5, "#4c3828");
  gr.addColorStop(1, "#2a1d14");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  paperFill(g, w, h, "rgba(0,0,0,0)", { seed: 1402, fibres: 0.5, mottle: 0.09, speck: 1.4 });

  // Subtle vertical wood-plaster seam lines
  g.strokeStyle = "rgba(25,15,8,0.16)";
  g.lineWidth = 3;
  for (let x = 128; x < w; x += 256) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * 0.78); g.stroke();
  }
  // Dark walnut wainscoting at bottom 22% of wall
  const wy = Math.round(h * 0.78);
  g.fillStyle = "#322218";
  g.fillRect(0, wy, w, h - wy);
  g.fillStyle = "#523a28";
  g.fillRect(0, wy - 12, w, 16);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(0, wy + 4, w, 10);
  for (let x = 40; x < w; x += 220) {
    g.strokeStyle = "rgba(95,68,45,0.28)";
    g.lineWidth = 5;
    g.strokeRect(x, wy + 26, 180, h - wy - 44);
  }
  // Soft plaster dust/texture
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(255,235,205,${r() * 0.05})` : `rgba(18,10,5,${r() * 0.08})`;
    g.fillRect(r() * w, r() * wy, 2 + r() * 4, 2 + r() * 3);
  }
  return c;
}

export function drawPeriodicPoster(w = 1400, h = 720) {
  const c = canvas(w, h), g = c.getContext("2d");
  paperFill(g, w, h, "#efe4cd", { seed: 1501, fibres: 1.1, mottle: 0.07 });
  // Aged double border
  g.strokeStyle = "#3a2e23";
  g.lineWidth = 6;
  g.strokeRect(26, 26, w - 52, h - 52);
  g.lineWidth = 2;
  g.strokeRect(38, 38, w - 76, h - 76);

  // Header
  label(g, "PERIODIC TABLE OF MODELS · GEMINI 4 SERIES", w / 2, 92, { font: FONT.type(42), color: "#2b241d", spacing: 5 });
  g.strokeStyle = "rgba(58,46,35,0.35)";
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(80, 128); g.lineTo(w - 80, 128); g.stroke();

  // Simplified vintage periodic-table grid (10 cols x 4 rows)
  const gx0 = 90, gy0 = 160, cw = 112, ch = 114, gap = 10;
  const cells = [
    [0, 0, "1", "H", "Hydrogen", C.hBlue, false],
    [9, 0, "2", "He", "", "#b8ae9b", false],
    [0, 1, "3", "Li", "", "#c7bea9", false],
    [1, 1, "4", "Be", "", "#c7bea9", false],
    [5, 1, "6", "C", "Carbon", C.cSlate, false],
    [6, 1, "7", "N", "", "#c7bea9", false],
    [7, 1, "8", "O", "", "#c7bea9", false],
    [8, 1, "9", "F", "", "#c7bea9", false],
    [9, 1, "10", "Ne", "NEON", C.agent, true],
    [0, 2, "11", "Na", "", "#cfc6b2", false],
    [1, 2, "12", "Mg", "", "#cfc6b2", false],
    [4, 2, "13", "Al", "", "#d6cebc", false],
    [5, 2, "14", "Si", "", "#d6cebc", false],
    [6, 2, "15", "P", "", "#d6cebc", false],
    [7, 2, "16", "S", "", "#d6cebc", false],
    [8, 2, "17", "Cl", "", "#d6cebc", false],
    [9, 2, "18", "Ar", "Argon", C.multi, false],
  ];
  for (const [col, row, num, sym, name, colr, hero] of cells) {
    const x = gx0 + col * (cw + gap);
    const y = gy0 + row * (ch + gap);
    g.fillStyle = hero ? "#1c2d48" : (name ? "#f7f0e0" : "#e5dac3");
    g.fillRect(x, y, cw, ch);
    g.strokeStyle = hero ? C.neonCoral : (name ? colr : "#9e9482");
    g.lineWidth = hero ? 6 : (name ? 4 : 2);
    g.strokeRect(x, y, cw, ch);
    label(g, num, x + 14, y + 22, { font: FONT.type(22), color: hero ? C.gold : "#5a5045", align: "left" });
    label(g, sym, x + cw / 2, y + 60, { font: FONT.type(hero ? 56 : 44), color: hero ? C.neonCyan : (name ? C.ink : "#7d7466") });
    if (name) {
      label(g, name, x + cw / 2, y + 98, { font: FONT.type(18), color: hero ? C.gold : colr });
    }
    if (hero) {
      // Hand-drawn red pencil circle around Ne 10!
      g.save();
      g.strokeStyle = C.agent;
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(x + cw / 2, y + ch / 2, cw * 0.72, ch * 0.68, -0.15, 0, 6.283);
      g.stroke();
      g.restore();
    }
  }
  // Bottom studio notes + 5 color dots
  label(g, "NOTES: BALANCE BETWEEN SPEED (H) & DEEP REASONING (C)  ->  NEON 10", w / 2, h - 78, { font: FONT.type(28), color: "#5e5042" });
  // Corner brass tacks
  for (const [tx, ty] of [[52, 52], [w - 52, 52], [52, h - 52], [w - 52, h - 52]]) {
    g.beginPath(); g.arc(tx, ty, 11, 0, 6.283); g.fillStyle = "#c99c46"; g.fill();
    g.strokeStyle = "#6e4e18"; g.lineWidth = 2; g.stroke();
  }
  return c;
}

export function drawScaleBlueprint(w = 768, h = 560) {
  const c = canvas(w, h), g = c.getContext("2d");
  paperFill(g, w, h, "#e6d8be", { seed: 1510, fibres: 1.0, mottle: 0.08 });
  g.strokeStyle = "rgba(65,52,38,0.35)";
  g.lineWidth = 2;
  for (let x = 40; x < w; x += 48) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, h - 24); g.stroke(); }
  for (let y = 40; y < h; y += 48) { g.beginPath(); g.moveTo(24, y); g.lineTo(w - 24, y); g.stroke(); }
  g.strokeStyle = "#3a2e23";
  g.lineWidth = 4;
  g.strokeRect(24, 24, w - 48, h - 48);
  label(g, "DRAFT #01 · TRADE-OFF", w / 2, 76, { font: FONT.type(38), color: "#3a2e23" });
  // Hand-drawn pencil sketch of a balance scale
  g.strokeStyle = "#2b241d";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(w / 2, 430); g.lineTo(w / 2, 195);
  g.moveTo(w / 2 - 90, 430); g.lineTo(w / 2 + 90, 430);
  g.moveTo(190, 235); g.lineTo(w - 190, 175);
  g.moveTo(190, 235); g.lineTo(155, 340); g.lineTo(225, 340); g.closePath();
  g.moveTo(w - 190, 175); g.lineTo(w - 225, 290); g.lineTo(w - 155, 290); g.closePath();
  g.stroke();
  label(g, "H", 190, 315, { font: FONT.type(58), color: C.hBlue });
  label(g, "C", w - 190, 265, { font: FONT.type(58), color: C.cSlate });
  label(g, "速度 vs 深度 ?", w / 2, 492, { font: FONT.hand(58), color: C.red });
  return c;
}

export function drawFoldBlueprint(w = 720, h = 560) {
  const c = canvas(w, h), g = c.getContext("2d");
  paperFill(g, w, h, "#213c54", { seed: 1520, fibres: 0.7, mottle: 0.06 });
  g.strokeStyle = "rgba(220,240,255,0.16)";
  g.lineWidth = 1.5;
  for (let x = 32; x < w; x += 40) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, h - 24); g.stroke(); }
  for (let y = 32; y < h; y += 40) { g.beginPath(); g.moveTo(24, y); g.lineTo(w - 24, y); g.stroke(); }
  g.strokeStyle = "rgba(235,245,255,0.72)";
  g.lineWidth = 4;
  g.strokeRect(24, 24, w - 48, h - 48);
  label(g, "POP-UP 90° V-FOLD · SPEC", w / 2, 74, { font: FONT.type(34), color: "#e8f3ff", spacing: 3 });
  // Folded book isometric schematic
  g.strokeStyle = "#8ae8e0";
  g.lineWidth = 4;
  g.beginPath();
  poly(g, [[140, 390], [360, 450], [580, 390], [360, 330]]);
  g.stroke();
  g.beginPath();
  poly(g, [[140, 390], [140, 180], [360, 120], [360, 330]]);
  g.stroke();
  g.setLineDash([10, 8]);
  g.strokeStyle = "#ffd36b";
  g.beginPath();
  g.moveTo(210, 360); g.lineTo(310, 210); g.lineTo(430, 365);
  g.moveTo(260, 395); g.lineTo(480, 395);
  g.stroke();
  g.setLineDash([]);
  label(g, "5 PULL-TABS · LAYERED MECHANISM", w / 2, h - 62, { font: FONT.type(26), color: "#ffd36b" });
  return c;
}

export function drawCuttingMat(w = 2048, h = 1024) {
  const c = canvas(w, h), g = c.getContext("2d");
  paperFill(g, w, h, "#224640", { seed: 1530, fibres: 0.4, mottle: 0.05, speck: 0.6 });
  g.strokeStyle = "rgba(225,235,215,0.22)";
  g.lineWidth = 2;
  for (let x = 64; x <= w - 64; x += 64) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x, h - 64); g.stroke(); }
  for (let y = 64; y <= h - 64; y += 64) { g.beginPath(); g.moveTo(64, y); g.lineTo(w - 64, y); g.stroke(); }
  g.strokeStyle = "rgba(235,240,220,0.48)";
  g.lineWidth = 4;
  g.strokeRect(64, 64, w - 128, h - 128);
  // Diagonal 45° guide lines
  g.setLineDash([12, 10]);
  g.strokeStyle = "rgba(235,240,220,0.25)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(64, h - 64); g.lineTo(64 + 896, 64);
  g.moveTo(w - 64, h - 64); g.lineTo(w - 64 - 896, 64);
  g.stroke();
  g.setLineDash([]);
  label(g, "A2 CUTTING MAT · STUDIO EDITION", 120, 106, { font: FONT.type(30), color: "rgba(235,240,220,0.5)", align: "left" });
  return c;
}

export function drawRuler(w = 1024, h = 160) {
  const c = canvas(w, h), g = c.getContext("2d");
  paperFill(g, w, h, "#c99c58", { seed: 1540, fibres: 0.8, mottle: 0.06 });
  g.strokeStyle = "#3a2816";
  g.lineWidth = 4;
  for (let i = 0; i <= 40; i++) {
    const x = 32 + (i / 40) * (w - 64);
    const len = i % 5 === 0 ? 54 : 28;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, len); g.stroke();
  }
  label(g, "CM  ·  CRAFT STUDIO", w / 2, h * 0.68, { font: FONT.type(34), color: "#3a2816", spacing: 6 });
  return c;
}
