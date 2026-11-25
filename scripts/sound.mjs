#!/usr/bin/env node
// sound.mjs — studio-grade CC0 Freesound foley (sourced via vibe-motion/sound) + warm music-box score
// for the 1080x1080 Gemini 4 Neon pop-up book. Synced to src/timeline.js (34.0s, 48 kHz stereo).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { T, CUES, DURATION } from "../src/timeline.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SFX_DIR = path.join(ROOT, "assets", "audio", "sfx_wav");
const SR = 48000, N = Math.ceil(DURATION * SR), TAU = Math.PI * 2;

// ---------------------------------------------------------------- deterministic PRNG
let seed = 0x4e653130; // "Ne10"
const rand = () => {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >>> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed / 4294967296;
};
const nz = () => rand() * 2 - 1;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, u) => a + (b - a) * u;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------------- load real 48kHz stereo Freesound WAVs
function readWavMonoNormalized(filename) {
  const buf = fs.readFileSync(path.join(SFX_DIR, filename));
  let pos = 12, dataOffset = 44, dataBytes = buf.length - 44;
  while (pos + 8 <= buf.length) {
    const id = buf.subarray(pos, pos + 4).toString("ascii");
    const sz = buf.readUInt32LE(pos + 4);
    if (id === "data") { dataOffset = pos + 8; dataBytes = sz; break; }
    pos += 8 + sz + (sz & 1);
  }
  const frames = Math.floor(dataBytes / 4);
  const out = new Float32Array(frames);
  let pk = 1e-6;
  for (let i = 0; i < frames; i++) {
    const l = buf.readInt16LE(dataOffset + i * 4) / 32768;
    const r = buf.readInt16LE(dataOffset + i * 4 + 2) / 32768;
    const m = 0.5 * (l + r);
    out[i] = m;
    const a = Math.abs(m);
    if (a > pk) pk = a;
  }
  // Peak-normalize to 0.92 so every clip gain is calibrated consistently
  const g = 0.92 / pk;
  for (let i = 0; i < frames; i++) out[i] *= g;
  return out;
}

const SFX = {
  stamp:     readWavMonoNormalized("fs_470710_traditional-stamp-wav.wav"),
  slide:     readWavMonoNormalized("fs_464302_PaperSlide-wav.wav"),
  envelope:  readWavMonoNormalized("fs_444431_Sliding-Envelope-wav.wav"),
  bookClose: readWavMonoNormalized("fs_156927_bkClose-wav.wav"),
  bookSlam:  readWavMonoNormalized("fs_195795_Closing-book.wav"),
  pageFlip:  readWavMonoNormalized("fs_828802_Paper-Page-Flip.wav"),
  sketchFlip:readWavMonoNormalized("fs_466375_Page-flipping-wav.wav"),
  pageRustle:readWavMonoNormalized("fs_211246_PageRustle.wav"),
  cardFold:  readWavMonoNormalized("fs_364740_open-cardboard-box-compartment-wav.wav"),
  dialClick: readWavMonoNormalized("fs_395125_Desk-lamp-switch.wav"),
  metalClick:readWavMonoNormalized("fs_778444_Metallic_Click.wav"),
  popShort:  readWavMonoNormalized("fs_665183_Item-or-Material-Pickup-Pop-1-of-3.wav"),
  popWarm:   readWavMonoNormalized("fs_635075_popchat-wav.wav"),
  woodKnock: readWavMonoNormalized("fs_369710_Wood-Knock.wav"),
  woodTap:   readWavMonoNormalized("fs_704935_Wooden-Tap.wav"),
  rustleA:   readWavMonoNormalized("fs_181774_rustling-paper-wav.wav"),
  rustleB:   readWavMonoNormalized("fs_449127_Rustling-Paper.wav"),
  gleam:     readWavMonoNormalized("fs_351408_GLEAM-GLOW-SFX-CHIME-wav.wav"),
  twinkle:   readWavMonoNormalized("fs_639429_Crystal-Twinkle.wav"),
};

// Extract a calibrated window with speed/pitch resampling and click-free fades
function sliceSfx(clip, { start = 0, dur = 0.5, rate = 1.0, fadeIn = 0.008, fadeOut = 0.04 } = {}) {
  const s0 = Math.max(0, Math.floor(start * SR));
  const outN = Math.max(1, Math.floor(dur * SR));
  const out = new Float32Array(outN);
  const fi = Math.max(1, Math.floor(fadeIn * SR));
  const fo = Math.max(1, Math.floor(fadeOut * SR));
  for (let i = 0; i < outN; i++) {
    const srcIdx = s0 + i * rate;
    const i0 = Math.floor(srcIdx);
    if (i0 + 1 >= clip.length) break;
    const frac = srcIdx - i0;
    let v = clip[i0] * (1 - frac) + clip[i0 + 1] * frac;
    if (i < fi) v *= i / fi;
    if (i > outN - fo) v *= Math.max(0, (outN - i) / fo);
    out[i] = v;
  }
  return out;
}

// ---------------------------------------------------------------- stems & placement
const stem = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const foley = stem(), music = stem();
const panLR = (p) => { const a = ((clamp(p, -1, 1) + 1) * Math.PI) / 4; return [Math.cos(a), Math.sin(a)]; };
function place(st, t0, buf, pan = 0, gain = 1) {
  const [gl, gr] = panLR(pan), s0 = Math.round(t0 * SR);
  for (let i = 0; i < buf.length; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    st.L[k] += buf[i] * gl * gain;
    st.R[k] += buf[i] * gr * gain;
  }
}
const F = (t, buf, pan = 0, gain = 1) => place(foley, t, buf, pan, gain);

// ================================================================= REAL STUDIO FOLEY SCORE
// Subtle desk paper-card placement whenever a 3D torn-paper caption strip flips up
CUES.forEach((c, i) => {
  if (i === 0) return; // cue 1 is already present on frame 0
  F(c.start, sliceSfx(SFX.envelope, { start: 0.34, dur: 0.24, rate: 1.05 + (i % 3) * 0.06, fadeIn: 0.005, fadeOut: 0.06 }), 0, 0.20);
});

// Act 1 · Cardboard balance scale rocking + handwritten note slide + dilemma sheet + rubber stamp slam
F(T.noteSlide, sliceSfx(SFX.slide, { start: 0.20, dur: 0.65, rate: 1.04 }), -0.25, 0.58);
[0.65, 1.35, 2.05, 2.75].forEach((t, k) => {
  // Cardboard balance fulcrum tap + subtle cardboard shift
  F(t, sliceSfx(SFX.woodKnock, { start: 0.0, dur: 0.14, rate: 0.88 + (k % 2) * 0.24 }), k % 2 ? 0.22 : -0.22, 0.44);
  F(t + 0.02, sliceSfx(SFX.cardFold, { start: 0.22, dur: 0.24, rate: 1.12 - (k % 2) * 0.14 }), 0, 0.22);
});
F(T.dilemmaPageIn, sliceSfx(SFX.envelope, { start: 0.32, dur: 0.48, rate: 0.96 }), 0.18, 0.54);
F(T.dilemmaLand - 0.02, sliceSfx(SFX.pageFlip, { start: 0.32, dur: 0.18, rate: 0.85 }), 0.12, 0.38);
// Real traditional rubber stamp hit aligned precisely to its measured 0.50s impact transient!
F(T.stampHit - 0.02, sliceSfx(SFX.stamp, { start: 0.48, dur: 0.32, rate: 1.0, fadeIn: 0.004 }), 0.06, 0.95);
F(T.stampOut, sliceSfx(SFX.metalClick, { start: 0.06, dur: 0.12, rate: 0.92 }), 0.06, 0.24);

// Act 2 · H/C tent cards, Hero Neon card + sparkle, 5 badges + stacked pages, book slam, 5 tabs zip
T.cardUp.forEach((t, k) => {
  F(t + 0.04, sliceSfx(SFX.cardFold, { start: 0.22, dur: 0.34, rate: 1.02 + k * 0.1 }), k ? 0.52 : -0.52, 0.52);
  F(t + 0.06, sliceSfx(SFX.popWarm, { start: 0.0, dur: 0.16, rate: 0.95 + k * 0.12 }), k ? 0.52 : -0.52, 0.38);
});
F(T.heroCardUp + 0.04, sliceSfx(SFX.cardFold, { start: 0.21, dur: 0.42, rate: 0.92 }), 0, 0.65);
F(T.heroCardUp + 0.06, sliceSfx(SFX.twinkle, { start: 0.16, dur: 1.45, rate: 1.05, fadeOut: 0.35 }), 0, 0.56);

T.badges.forEach((t, k) => {
  const pan = (k - 2) * 0.25;
  F(t + 0.02, sliceSfx(SFX.popShort, { start: 0.0, dur: 0.07, rate: 0.92 + k * 0.09 }), pan, 0.54);
  F(t + 0.06, sliceSfx(SFX.envelope, { start: 0.40, dur: 0.14, rate: 1.35 + k * 0.05 }), 0, 0.26); // tally stroke
});
for (let i = 0; i < 5; i++) {
  const fly = T.badgeFly + i * T.flyStep, land = fly + T.flyDur + 0.1;
  F(fly, sliceSfx(SFX.pageFlip, { start: 0.04, dur: 0.22, rate: 1.15 + i * 0.04 }), (i - 2) * 0.22, 0.36);
  F(land - 0.02, sliceSfx(SFX.pageFlip, { start: 0.33, dur: 0.16, rate: 0.95 + i * 0.04 }), 0, 0.52);
}
// Heavy hardcover book slam (AT 4033a studio close + sound-room close layered at exact impact!)
F(T.coverClose + 0.06, sliceSfx(SFX.sketchFlip, { start: 0.22, dur: 0.32, rate: 0.92 }), 0, 0.42);
F(T.coverClose + 0.35, sliceSfx(SFX.bookSlam, { start: 1.43, dur: 0.36, rate: 1.0, fadeIn: 0.003 }), 0, 0.92);
F(T.coverClose + 0.34, sliceSfx(SFX.bookClose, { start: 0.30, dur: 0.38, rate: 0.95 }), 0, 0.52);
// 5 pull-tabs zip out
for (let i = 0; i < 5; i++) {
  F(T.tabsOut + i * T.tabStep, sliceSfx(SFX.envelope, { start: 0.34, dur: 0.24, rate: 1.18 + i * 0.05 }), (i - 2) * 0.22, 0.46);
}
F(T.cardsDown, sliceSfx(SFX.pageFlip, { start: 0.32, dur: 0.18, rate: 0.92 }), -0.45, 0.35);
F(T.cardsDown + 0.04, sliceSfx(SFX.pageFlip, { start: 0.32, dur: 0.18, rate: 0.98 }), 0.45, 0.35);

// Act 3 · Book opens & 5 tags fan + pop up
F(T.bookOpen, sliceSfx(SFX.sketchFlip, { start: 0.22, dur: 0.58, rate: 0.84 }), 0, 0.62);
F(T.bookOpen + 0.08, sliceSfx(SFX.cardFold, { start: 0.22, dur: 0.44, rate: 0.86 }), 0, 0.48);
F(T.bookOpen + 0.54, sliceSfx(SFX.woodKnock, { start: 0.0, dur: 0.12, rate: 0.72 }), 0, 0.34);
F(T.fan, sliceSfx(SFX.pageRustle, { start: 0.46, dur: 0.38, rate: 1.1 }), 0, 0.54);
for (let i = 0; i < 5; i++) {
  F(T.tagsUp + i * T.tagStep + 0.05, sliceSfx(SFX.popWarm, { start: 0.0, dur: 0.16, rate: 0.92 + i * 0.08 }), (i - 2) * 0.28, 0.48);
}

// Act 4 · Five pull-tabs + real bespoke mechanical & paper foley!
T.pull.forEach((t, i) => {
  const pan = (i - 2) * 0.26;
  F(t, sliceSfx(SFX.slide, { start: 0.20, dur: 0.24, rate: 1.24 }), pan, 0.62);
  F(t + 0.18, sliceSfx(SFX.metalClick, { start: 0.13, dur: 0.12, rate: 1.15 }), pan, 0.46);
});

// Layer 1 · 1M Context Scroll unroll + two ribbons pop up
F(T.scroll[0], sliceSfx(SFX.rustleA, { start: 0.78, dur: T.scroll[1] - T.scroll[0], rate: 1.0, fadeIn: 0.04, fadeOut: 0.12 }), 0, 0.56);
F(T.ribbonBack + 0.04, sliceSfx(SFX.cardFold, { start: 0.22, dur: 0.34, rate: 0.95 }), -0.1, 0.58);
F(T.ribbonFront + 0.04, sliceSfx(SFX.pageFlip, { start: 0.04, dur: 0.28, rate: 0.92 }), 0.1, 0.58);

// Layer 2 · Mechanical Thinking-Level Dial (4 ultra-crisp real rotary switch clicks!) + 4 rising bars
F(T.dialRise + 0.04, sliceSfx(SFX.cardFold, { start: 0.22, dur: 0.35, rate: 1.04 }), -0.35, 0.58);
T.thinkSteps.forEach((t, i) => {
  const pan = -0.25 + i * 0.18;
  // Real rotary desk-lamp switch click pitched up with thinking level!
  F(t + 0.01, sliceSfx(SFX.dialClick, { start: 0.055, dur: 0.14, rate: 0.94 + i * 0.09, fadeIn: 0.002 }), pan, 0.78);
  F(t + 0.06, sliceSfx(SFX.popWarm, { start: 0.0, dur: 0.16, rate: 0.92 + i * 0.12 }), 0.12 + i * 0.14, 0.46);
});

// Layer 3 · 4-panel Multimodal Accordion + 24 riffle slats + 4 mini props
F(T.accRise + 0.04, sliceSfx(SFX.cardFold, { start: 0.22, dur: 0.36, rate: 0.92 }), -0.3, 0.58);
F(T.accOpen[0] + 0.04, sliceSfx(SFX.sketchFlip, { start: 0.24, dur: 0.62, rate: 1.05 }), 0, 0.56);
for (let i = 0; i < 4; i++) {
  const pan = -0.42 + i * 0.28;
  F(T.propIn + i * T.propStep + 0.04, sliceSfx(SFX.popShort, { start: 0.0, dur: 0.07, rate: 0.96 + i * 0.08 }), pan, 0.52);
  F(T.propIn + i * T.propStep + 0.05, sliceSfx(SFX.pageFlip, { start: 0.32, dur: 0.16, rate: 1.08 + i * 0.05 }), pan, 0.34);
  for (let k = 0; k < 6; k++) {
    F(T.slats + i * T.slatStep + k * T.slatLag + 0.05, sliceSfx(SFX.metalClick, { start: 0.13, dur: 0.06, rate: 1.35 + k * 0.08, fadeIn: 0.002, fadeOut: 0.02 }), pan, 0.24);
  }
}

// Layer 4 · Agent Tower + 3 Subagents + 4 crisp Wooden-Tap orchestration beats
F(T.towerRise + 0.04, sliceSfx(SFX.cardFold, { start: 0.22, dur: 0.38, rate: 0.88 }), -0.5, 0.62);
T.subagents.forEach((t, i) => {
  F(t + 0.04, sliceSfx(SFX.popWarm, { start: 0.0, dur: 0.16, rate: 1.04 + i * 0.09 }), -0.2 + i * 0.22, 0.48);
});
const HITS = [];
let ht = T.play;
for (const d of T.dwell) { HITS.push(ht); ht += d; }
HITS.forEach((t, k) => {
  F(t, sliceSfx(SFX.woodTap, { start: 0.825, dur: 0.16, rate: 0.96 + k * 0.08, fadeIn: 0.002 }), -0.45 + k * 0.3, 0.72);
});

// Layer 5 · Pareto + Price Tag + 5 snappy checkmark knocks
F(T.paretoRise + 0.04, sliceSfx(SFX.cardFold, { start: 0.22, dur: 0.34, rate: 1.08 }), 0.42, 0.56);
F(T.priceTagRise + 0.04, sliceSfx(SFX.pageFlip, { start: 0.04, dur: 0.26, rate: 1.14 }), 0.55, 0.56);
for (let i = 0; i < 5; i++) {
  const pan = (i - 2) * 0.26;
  F(T.checks + i * T.checkStep, sliceSfx(SFX.woodKnock, { start: 0.0, dur: 0.11, rate: 1.1 + i * 0.1 }), pan, 0.48);
  F(T.checks + i * T.checkStep + 0.01, sliceSfx(SFX.popShort, { start: 0.0, dur: 0.07, rate: 1.05 + i * 0.08 }), pan, 0.36);
}

// Act 5 · Book shuts + Flood of 32 gray sheets + 5 tabs poke + Tremble + BURST FINALE!
F(T.layersDown, sliceSfx(SFX.pageRustle, { start: 0.45, dur: 0.45, rate: 1.15 }), 0, 0.54);
F(T.coverDown + 0.26, sliceSfx(SFX.bookSlam, { start: 1.43, dur: 0.36, rate: 0.96, fadeIn: 0.003 }), 0, 0.82);
F(T.spit, sliceSfx(SFX.rustleB, { start: 0.40, dur: 2.35, rate: 1.04, fadeIn: 0.06, fadeOut: 0.25 }), -0.15, 0.52);
F(T.spit + 0.35, sliceSfx(SFX.rustleA, { start: 0.95, dur: 2.1, rate: 0.96, fadeIn: 0.08, fadeOut: 0.25 }), 0.2, 0.46);
for (let i = 0; i < T.spitCount; i += 2) {
  const t0 = T.spit + i * T.spitStep;
  const pan = i % 4 === 0 ? -0.48 : 0.48;
  F(t0 + 0.06, sliceSfx(SFX.pageFlip, { start: 0.04, dur: 0.22, rate: 0.92 + (i % 5) * 0.07 }), pan, 0.34);
}

// 5 tabs poke through gray pile
for (let i = 0; i < 5; i++) {
  const t = T.poke + i * T.pokeStep, pan = (i - 2) * 0.26;
  F(t, sliceSfx(SFX.envelope, { start: 0.34, dur: 0.24, rate: 1.14 + i * 0.06 }), pan, 0.52);
  F(t + 0.18, sliceSfx(SFX.popWarm, { start: 0.0, dur: 0.16, rate: 0.96 + i * 0.08 }), pan, 0.46);
}
// Book trembles under gray sheets
F(T.tremble[0], sliceSfx(SFX.rustleB, { start: 5.50, dur: 0.65, rate: 1.05, fadeIn: 0.08, fadeOut: 0.08 }), 0, 0.62);

// GRAND FINALE BURST (heavy cardboard burst + cascading flips + magical gleam/twinkle chime!)
F(T.burst - 0.01, sliceSfx(SFX.bookSlam, { start: 1.43, dur: 0.40, rate: 0.84, fadeIn: 0.003 }), 0, 0.96);
F(T.burst, sliceSfx(SFX.cardFold, { start: 0.21, dur: 0.52, rate: 0.82 }), 0, 0.72);
F(T.burst + 0.02, sliceSfx(SFX.sketchFlip, { start: 0.22, dur: 0.95, rate: 1.08 }), 0, 0.68);
[0.18, 0.26, 0.36, 0.46, 0.56, 0.68].forEach((d, k) => {
  F(T.burst + d, sliceSfx(SFX.popWarm, { start: 0.0, dur: 0.16, rate: 0.92 + k * 0.08 }), ((k % 5) - 2) * 0.25, 0.44);
});
// Shimmering Neon Chime bloom on the spotlight reveal!
F(T.burst - 0.04, sliceSfx(SFX.gleam, { start: 1.52, dur: 1.85, rate: 1.04, fadeIn: 0.04, fadeOut: 0.45 }), 0, 0.58);
F(T.burst + 0.12, sliceSfx(SFX.twinkle, { start: 0.16, dur: 1.75, rate: 1.0, fadeOut: 0.45 }), 0, 0.48);

// ================================================================= MUSIC-BOX SCORE (delicate bed)
function tine(midi, { amp = 0.2, decay = 1.5, bright = 1, detune = 0 }) {
  const f = hz(midi) * Math.pow(2, detune / 1200);
  const dur = Math.min(4.0, decay * 2.5), n = Math.floor(dur * SR), out = new Float32Array(n);
  const parts = [[1, 1, decay], [2.0, 0.22 * bright, decay * 0.45], [3.0, 0.06 * bright, decay * 0.28], [5.9, 0.08 * bright, decay * 0.1], [9.2, 0.03 * bright, decay * 0.05]];
  for (const [r, a, d] of parts) {
    const fr = f * r; if (fr > 16000) continue;
    const w = (TAU * fr) / SR; let ph = rand() * TAU;
    for (let i = 0; i < n; i++) { ph += w; out[i] += Math.sin(ph) * a * Math.exp(-i / (d * SR)); }
  }
  for (let i = 0; i < 90; i++) out[i] += nz() * 0.16 * Math.exp(-i / 16);
  for (let i = 0; i < n; i++) out[i] *= amp * Math.min(1, i / 40);
  return out;
}
const note = (t, midi, o = {}) => place(music, t, tine(midi, o), clamp((midi - 72) / 30, -0.5, 0.5), 1);

// Act 1 · hesitant two-note seesaw
note(0.7, 64, { amp: 0.1, decay: 1.1, bright: 0.5 });
note(1.4, 57, { amp: 0.1, decay: 1.1, bright: 0.4 });
note(2.1, 64, { amp: 0.09, decay: 1.0, bright: 0.5 });
note(3.55, 52, { amp: 0.12, decay: 0.7, bright: 0.3, detune: -35 });

// Act 2 · Neon arrives
note(T.heroCardUp + 0.04, 65, { amp: 0.15, decay: 1.8 });
note(T.heroCardUp + 0.12, 72, { amp: 0.14, decay: 1.8 });
note(T.heroCardUp + 0.2, 77, { amp: 0.16, decay: 2.0 });
const CALL = [69, 72, 74, 77, 81];
T.badges.forEach((t, k) => note(t + 0.02, CALL[k], { amp: 0.15, decay: 1.3 }));
[65, 69, 72, 77, 81].forEach((m, i) => note(T.badgeFly + i * T.flyStep + T.flyDur + 0.1, m, { amp: 0.12, decay: 1.1 }));
note(T.coverClose + 0.36, 41, { amp: 0.15, decay: 2.1, bright: 0.4 });
note(T.coverClose + 0.36, 53, { amp: 0.11, decay: 2.1, bright: 0.5 });
note(T.coverClose + 0.58, 72, { amp: 0.11, decay: 1.5 });
note(T.coverClose + 0.82, 77, { amp: 0.13, decay: 1.8 });

// Act 3 · Book opens & 5 tags motif
[65, 67, 69, 72, 74, 77].forEach((m, i) => note(T.bookOpen + 0.05 + i * 0.065, m, { amp: 0.08, decay: 0.9 }));
[65, 67, 69, 72, 74].forEach((m, i) => note(T.tagsUp + i * T.tagStep + 0.08, m, { amp: 0.14, decay: 1.4 }));

// Act 4 · Layer-by-layer ostinato
const STEP = 0.28, START = T.pull[0] + 0.05, STOP = 27.85;
const CHORDS = [
  { from: 0, arp: [65, 69, 72, 69], bass: 41, top: [77, 81] },
  { from: T.pull[2] + 0.05, arp: [62, 65, 69, 65], bass: 38, top: [74, 77] },
  { from: T.pull[3] + 0.05, arp: [58, 62, 65, 62], bass: 34, top: [74, 77] },
  { from: T.pull[4] - 0.8, arp: [60, 64, 67, 64], bass: 36, top: [72, 76] },
  { from: T.pull[4] + 0.6, arp: [65, 69, 72, 69], bass: 41, top: [77, 81] },
];
const chordAt = (t) => { let c = CHORDS[0]; for (const k of CHORDS) if (t >= k.from) c = k; return c; };
let windStep = STEP, idx = 0;
for (let t = START; t < STOP + 1.1; idx++) {
  const c = chordAt(t);
  let amp = 0.09, det = 0;
  if (t >= STOP) {
    const u = (t - STOP) / 1.1;
    amp *= 1 - u;
    det = -135 * u * u;
  }
  if (amp > 0.004) {
    note(t, c.arp[idx % 4], { amp, decay: 1.1, detune: det });
    if (t >= T.pull[1] && idx % 4 === 0) note(t, c.bass + (idx % 8 === 0 ? 12 : 0), { amp: amp * 1.1, decay: 1.8, bright: 0.4, detune: det });
    if (t >= T.pull[2] && idx % 2 === 1) note(t, c.top[(idx >> 1) % 2], { amp: amp * 0.58, decay: 0.9, detune: det });
  }
  t += t >= STOP ? (windStep *= 1.12) : STEP;
}
T.thinkSteps.forEach((t, i) => note(t + 0.04, [72, 76, 79, 84][i], { amp: 0.11, decay: 1.0, bright: 1.3 }));
HITS.forEach((t, k) => note(t, [84, 81, 79, 77][k % 4], { amp: 0.08, decay: 0.8, bright: 1.35 }));

// Act 5 · 5 rising poke notes + radiant finale resolution
[65, 69, 72, 76, 79].forEach((m, i) => note(T.poke + i * T.pokeStep + 0.2, m, { amp: 0.12 + i * 0.012, decay: 1.2 }));
[41, 53, 60, 65, 69, 72, 77].forEach((m, i) => note(T.burst + 0.02 + i * 0.02, m, { amp: m < 55 ? 0.15 : 0.13, decay: 2.6, bright: m < 55 ? 0.5 : 1.05 }));
[77, 79, 81, 84, 86, 89, 91, 93, 96].forEach((m, i) => note(T.burst + 0.12 + i * 0.045, m, { amp: 0.055, decay: 0.95, bright: 1.2 }));
note(32.95, 81, { amp: 0.12, decay: 1.4 });
note(33.22, 79, { amp: 0.11, decay: 1.4 });
note(33.48, 77, { amp: 0.13, decay: 2.2 });
note(33.48, 65, { amp: 0.09, decay: 2.2 });

// ================================================================= studio room reverb + mastering
function reverb(st, { wet = 0.25, size = 1, damp = 0.35, fb = 0.83 }) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((l) => Math.round(l * size));
  const aps = [556, 441, 341, 225].map((l) => Math.round(l * size));
  for (const [ch, off] of [["L", 0], ["R", 23]]) {
    const x = st[ch], y = new Float32Array(N);
    const cb = combs.map((l) => ({ b: new Float32Array(l + off), i: 0, f: 0 }));
    const ap = aps.map((l) => ({ b: new Float32Array(l + off), i: 0 }));
    for (let n = 0; n < N; n++) {
      let acc = 0;
      for (const c of cb) {
        const o = c.b[c.i];
        c.f = o * (1 - damp) + c.f * damp;
        c.b[c.i] = x[n] * 0.015 + c.f * fb;
        c.i = (c.i + 1) % c.b.length;
        acc += o;
      }
      for (const a of ap) {
        const bo = a.b[a.i];
        const o = -acc + bo;
        a.b[a.i] = acc + bo * 0.5;
        a.i = (a.i + 1) % a.b.length;
        acc = o;
      }
      y[n] = acc;
    }
    for (let n = 0; n < N; n++) x[n] += y[n] * wet * 8;
  }
}
reverb(music, { wet: 0.30, size: 1.15, damp: 0.3, fb: 0.84 });
reverb(foley, { wet: 0.05, size: 0.45, damp: 0.5, fb: 0.65 }); // crisp close-mic tabletop room glue

const peakOf = (st) => { let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, Math.abs(st.L[i]), Math.abs(st.R[i])); return m; };
const rmsOf = (st) => { let s = 0; for (let i = 0; i < N; i++) s += st.L[i] * st.L[i] + st.R[i] * st.R[i]; return Math.sqrt(s / (2 * N)); };
const scale = (st, g) => { for (let i = 0; i < N; i++) { st.L[i] *= g; st.R[i] *= g; } };
const db = (d) => Math.pow(10, d / 20), todb = (v) => (20 * Math.log10(Math.max(1e-9, v))).toFixed(1);

// Real studio foley sits upfront (-2.5 dBFS peak), warm music box nests gently beneath (-21.5 dBFS RMS)
scale(foley, db(-2.5) / peakOf(foley));
scale(music, db(-21.5) / rmsOf(music));
for (const st of [foley, music]) {
  for (let i = Math.round((DURATION - 0.6) * SR); i < N; i++) {
    const g = 0.5 + 0.5 * Math.cos((Math.PI * (i / SR - (DURATION - 0.6))) / 0.6);
    st.L[i] *= g; st.R[i] *= g;
  }
}
const mix = stem();
for (let i = 0; i < N; i++) { mix.L[i] = foley.L[i] + music.L[i]; mix.R[i] = foley.R[i] + music.R[i]; }
const mp = peakOf(mix);
if (mp > db(-1)) scale(mix, db(-1) / mp);

function writeWav(file, st) {
  const bytes = 44 + N * 4, b = Buffer.alloc(bytes);
  b.write("RIFF", 0); b.writeUInt32LE(bytes - 8, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(N * 4, 40);
  let o = 44;
  for (let i = 0; i < N; i++) {
    const d1 = (rand() - rand()) / 32768, d2 = (rand() - rand()) / 32768;
    b.writeInt16LE(Math.round(clamp(st.L[i] + d1, -1, 1) * 32767), o);
    b.writeInt16LE(Math.round(clamp(st.R[i] + d2, -1, 1) * 32767), o + 2);
    o += 4;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
}

const out = path.join(ROOT, "assets", "audio");
writeWav(path.join(out, "foley.wav"), foley);
writeWav(path.join(out, "musicbox.wav"), music);
writeWav(path.join(out, "mix.wav"), mix);
console.log(`real CC0 foley peak ${todb(peakOf(foley))} dBFS (rms ${todb(rmsOf(foley))} dBFS) · music rms ${todb(rmsOf(music))} dBFS · mix peak ${todb(peakOf(mix))} dBFS`);
console.log(`wrote ${path.relative(ROOT, out)}/{foley,musicbox,mix}.wav (${DURATION}s, ${SR} Hz)`);
