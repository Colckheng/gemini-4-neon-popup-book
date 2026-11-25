#!/usr/bin/env node
// voiceover.mjs — 12-cue voiceover generator (free Edge-TTS), precise timeline aligner,
// broadcast vocal processor, sidechain-ducked 3-stem mixer, and lossless MP4 muxer.
//
// Drop your own high-quality dry clips (01.wav..12.wav or .mp3/.m4a/.flac) into assets/audio/vo/
// and run `npm run vo:mix` anytime to re-align, master, and mux into MP4 in ~2 seconds!

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DURATION } from "../src/timeline.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VO_DIR = path.join(ROOT, "assets", "audio", "vo");
const SCRIPT_PATH = path.join(VO_DIR, "script.json");
const AUDIO_DIR = path.join(ROOT, "assets", "audio");
const SR = 48000;
const TOTAL_FRAMES = Math.round(DURATION * SR);

// Priority order when resolving user-provided vs generated clips for each cue (e.g. 01.*)
const EXTS = [".wav", ".flac", ".m4a", ".ogg", ".mp3"];

// ---------------------------------------------------------------- CLI parsing
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const getOpt = (name, fallback = null) => {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : fallback;
};

const doGenerate = hasFlag("--generate") || hasFlag("--tts");
const doForce = hasFlag("--force");
const doMux = !hasFlag("--no-mux");
const scriptCfg = JSON.parse(fs.readFileSync(SCRIPT_PATH, "utf8"));

const VOICE = getOpt("--voice", scriptCfg.voice || "zh-CN-YunxiNeural");
const BASE_RATE = getOpt("--rate", scriptCfg.baseRate || "+6%");
const PITCH = getOpt("--pitch", scriptCfg.pitch || "-2Hz");
const INPUT_MP4 = path.resolve(ROOT, getOpt("--in", scriptCfg.inputVideo || "renders/gemini-4-neon-1080x1080-v3.mp4"));
const OUTPUT_MP4 = path.resolve(ROOT, getOpt("--out", scriptCfg.outputVideo || "renders/gemini-4-neon-1080x1080-v3-vo.mp4"));

// ---------------------------------------------------------------- helpers
function run(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, {
    cwd: ROOT,
    stdio: opts.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 128 * 1024 * 1024,
    ...opts,
  });
}

function parseRatePct(rateStr) {
  const m = String(rateStr).match(/^([+-]?\d+)%$/);
  return m ? Number(m[1]) : 0;
}

function formatRatePct(pct) {
  const n = Math.round(pct);
  return `${n >= 0 ? "+" : ""}${n}%`;
}

function findCueFile(stem) {
  for (const ext of EXTS) {
    const p = path.join(VO_DIR, `${stem}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Decode any audio file to 48kHz mono Float32Array via ffmpeg pipe (no temp files)
function decodeMonoF32(filePath, extraAudioFilter = null) {
  const ffArgs = ["-v", "error", "-i", filePath];
  if (extraAudioFilter) ffArgs.push("-af", extraAudioFilter);
  ffArgs.push("-ac", "1", "-ar", String(SR), "-f", "f32le", "pipe:1");
  const buf = run("ffmpeg", ffArgs, { capture: true });
  const count = Math.floor(buf.byteLength / 4);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}

// Deterministic silence trimmer with generous consonant-safe padding and click-free fades
function trimSilence(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  if (peak < 1e-6) return samples;
  const thresh = Math.max(0.0035, peak * 0.015);
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < thresh) first++;
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < thresh) last--;

  const prePad = Math.round(0.025 * SR);
  const postPad = Math.round(0.055 * SR);
  const s0 = Math.max(0, first - prePad);
  const s1 = Math.min(samples.length, last + postPad + 1);
  const out = samples.slice(s0, s1);

  const fi = Math.min(Math.round(0.006 * SR), Math.floor(out.length / 4));
  const fo = Math.min(Math.round(0.015 * SR), Math.floor(out.length / 4));
  for (let i = 0; i < fi; i++) out[i] *= i / fi;
  for (let i = 0; i < fo; i++) out[out.length - 1 - i] *= i / fo;
  return out;
}

// Tighten sluggish internal punctuation silences (> maxGapSec) via smooth crossfading
// so tight slots breathe naturally without speeding up speech syllables.
function tightenInternalPauses(samples, { maxGapSec = 0.095, keepRatio = 0.25 } = {}) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  if (peak < 1e-6) return samples;

  const thresh = Math.max(0.004, peak * 0.018);
  const win = Math.round(0.01 * SR); // 10ms energy blocks
  const blocks = Math.ceil(samples.length / win);
  const isSilent = new Uint8Array(blocks);
  for (let b = 0; b < blocks; b++) {
    const s0 = b * win;
    const s1 = Math.min(samples.length, s0 + win);
    let m = 0;
    for (let i = s0; i < s1; i++) {
      const a = Math.abs(samples[i]);
      if (a > m) m = a;
    }
    if (m < thresh) isSilent[b] = 1;
  }

  const maxGapBlocks = Math.round(maxGapSec / 0.01);
  const xfade = Math.round(0.008 * SR);
  const chunks = [];
  let cursor = 0;

  let b = 0;
  while (b < blocks) {
    if (!isSilent[b]) { b++; continue; }
    let bEnd = b;
    while (bEnd < blocks && isSilent[bEnd]) bEnd++;
    const runBlocks = bEnd - b;
    if (runBlocks > maxGapBlocks && b > 2 && bEnd < blocks - 2) {
      const targetBlocks = Math.max(maxGapBlocks, Math.round(maxGapBlocks + (runBlocks - maxGapBlocks) * keepRatio));
      const keepEachSide = Math.floor((targetBlocks * win) / 2);
      const cutStart = Math.min(samples.length, b * win + keepEachSide);
      const cutEnd = Math.max(cutStart, Math.min(samples.length, bEnd * win - keepEachSide));
      if (cutEnd - cutStart > xfade * 2) {
        chunks.push(samples.subarray(cursor, cutStart + xfade));
        cursor = cutEnd - xfade;
      }
    }
    b = bEnd;
  }
  chunks.push(samples.subarray(cursor));
  if (chunks.length === 1) return samples;

  // Crossfade-join chunks cleanly
  let totalLen = chunks[0].length;
  for (let c = 1; c < chunks.length; c++) totalLen += chunks[c].length - xfade;
  const out = new Float32Array(totalLen);
  out.set(chunks[0], 0);
  let pos = chunks[0].length;
  for (let c = 1; c < chunks.length; c++) {
    const seg = chunks[c];
    const start = pos - xfade;
    for (let i = 0; i < xfade; i++) {
      const u = i / xfade;
      out[start + i] = out[start + i] * (1 - u) + seg[i] * u;
    }
    out.set(seg.subarray(xfade), pos);
    pos += seg.length - xfade;
  }
  return out;
}

function cleanCueAudio(rawSamples, tightenPauses = true) {
  const trimmed = trimSilence(rawSamples);
  return tightenPauses ? tightenInternalPauses(trimmed) : trimmed;
}

function measureRmsPeak(samples) {
  let sum = 0;
  let peak = 1e-9;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sum += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  return { rms: Math.sqrt(sum / Math.max(1, samples.length)), peak };
}

function buildAtempoChain(speed) {
  const parts = [];
  let rem = speed;
  while (rem > 2.0) {
    parts.push("atempo=2.0");
    rem /= 2.0;
  }
  while (rem < 0.5) {
    parts.push("atempo=0.5");
    rem /= 0.5;
  }
  parts.push(`atempo=${rem.toFixed(4)}`);
  return parts.join(",");
}

function writeStereoWav(filePath, monoSamples) {
  const N = monoSamples.length;
  const bytes = 44 + N * 4;
  const b = Buffer.alloc(bytes);
  b.write("RIFF", 0);
  b.writeUInt32LE(bytes - 8, 4);
  b.write("WAVE", 8);
  b.write("fmt ", 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(N * 4, 40);
  let o = 44;
  for (let i = 0; i < N; i++) {
    const clamped = Math.max(-1, Math.min(1, monoSamples[i]));
    const s = Math.round(clamped * 32767);
    b.writeInt16LE(s, o);
    b.writeInt16LE(s, o + 2);
    o += 4;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, b);
}

// ---------------------------------------------------------------- Step 1: Optional Edge-TTS generation
function runEdgeTts(text, outMp3, rateStr) {
  run(
    "uvx",
    [
      "edge-tts",
      "--voice", VOICE,
      `--rate=${rateStr}`,
      `--pitch=${PITCH}`,
      "--text", text,
      "--write-media", outMp3,
    ],
    { capture: true }
  );
}

async function generateClipsIfRequested() {
  if (!doGenerate) return;
  fs.mkdirSync(VO_DIR, { recursive: true });
  const basePct = parseRatePct(BASE_RATE);
  console.log(`\n[1/4] Generating Edge-TTS clips (voice=${VOICE}, baseRate=${BASE_RATE}, pitch=${PITCH})...`);

  for (const cue of scriptCfg.cues) {
    const existing = findCueFile(cue.file);
    const targetMp3 = path.join(VO_DIR, `${cue.file}.mp3`);
    if (existing && !doForce) {
      console.log(`  cue ${cue.file}: keep existing ${path.basename(existing)}`);
      continue;
    }

    const budget = cue.end - cue.start;
    const text = cue.spoken || cue.caption;
    let ratePct = cue.rate ? parseRatePct(cue.rate) : basePct;

    runEdgeTts(text, targetMp3, formatRatePct(ratePct));
    let trimmed = cleanCueAudio(decodeMonoF32(targetMp3));
    let dur = trimmed.length / SR;

    // If clip exceeds cue slot, re-synthesize natively at faster neural speech rate (capped at +32% for naturalness)
    if (dur > budget) {
      const ratio = dur / (budget - 0.03);
      const nextRate = Math.min(32, Math.ceil((1 + ratePct / 100) * ratio * 100 - 100 + 2));
      if (nextRate > ratePct) {
        ratePct = nextRate;
        runEdgeTts(text, targetMp3, formatRatePct(ratePct));
        trimmed = cleanCueAudio(decodeMonoF32(targetMp3));
        dur = trimmed.length / SR;
      }
    }

    console.log(
      `  cue ${cue.file}: ${dur.toFixed(2)}s / ${budget.toFixed(2)}s (rate ${formatRatePct(ratePct)}) — ${text}`
    );
  }
}

// ---------------------------------------------------------------- Step 2: Assemble aligned 34.0s dry VO track
function assembleDryVoiceover() {
  console.log(`\n[2/4] Aligning 12 voiceover clips to src/timeline.js (${DURATION.toFixed(1)}s, ${SR} Hz)...`);
  const timeline = new Float32Array(TOTAL_FRAMES);
  const targetRms = Math.pow(10, -18.5 / 20); // consistent active speech level per cue
  const report = [];

  for (let i = 0; i < scriptCfg.cues.length; i++) {
    const cue = scriptCfg.cues[i];
    const nextCue = scriptCfg.cues[i + 1];
    const srcFile = findCueFile(cue.file);
    if (!srcFile) {
      throw new Error(
        `Missing clip for cue ${cue.file} in ${path.relative(ROOT, VO_DIR)}. Run with --generate or place ${cue.file}.wav/.mp3 there.`
      );
    }

    const slotBudget = cue.end - cue.start;
    const hardCeiling = (nextCue ? nextCue.start - 0.06 : DURATION - 0.12) - cue.start;

    let samples = cleanCueAudio(decodeMonoF32(srcFile));
    const rawDur = samples.length / SR;
    let speedApplied = 1.0;

    if (rawDur > hardCeiling) {
      // Gently speed up with pitch-preserving atempo so cue fits comfortably inside its slot with zero overlap
      speedApplied = rawDur / Math.max(0.4, slotBudget - 0.01);
      const af = buildAtempoChain(speedApplied);
      samples = cleanCueAudio(decodeMonoF32(srcFile, af));
    }

    const finalDur = samples.length / SR;
    const { rms, peak } = measureRmsPeak(samples);
    const gain = Math.min(targetRms / Math.max(1e-6, rms), 0.85 / peak);

    const startIdx = Math.round(cue.start * SR);
    for (let k = 0; k < samples.length; k++) {
      const dst = startIdx + k;
      if (dst >= 0 && dst < TOTAL_FRAMES) {
        timeline[dst] += samples[k] * gain;
      }
    }

    const endTime = cue.start + finalDur;
    const gapToNext = nextCue ? nextCue.start - endTime : DURATION - endTime;
    report.push({
      cue: cue.file,
      src: path.basename(srcFile),
      start: cue.start,
      end: endTime,
      dur: finalDur,
      budget: slotBudget,
      speed: speedApplied,
      gap: gapToNext,
    });
  }

  for (const r of report) {
    const spd = r.speed > 1.005 ? ` [atempo ${r.speed.toFixed(2)}x]` : "";
    console.log(
      `  ${r.cue} (${r.src.padEnd(8)}) ${r.start.toFixed(2)}s -> ${r.end.toFixed(2)}s (${r.dur.toFixed(2)}s / ${r.budget.toFixed(2)}s, gap +${r.gap.toFixed(2)}s)${spd}`
    );
  }

  const dryPath = path.join(VO_DIR, "_vo_dry_tmp.wav");
  writeStereoWav(dryPath, timeline);
  return dryPath;
}

// ---------------------------------------------------------------- Step 3: Broadcast vocal chain + 3-stem ducking mix
function analyzeEbuR128(wavPath) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", wavPath, "-af", "ebur128=peak=true", "-f", "null", "-"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const text = r.stderr || "";
  const iMatch = text.match(/Integrated loudness:[\s\S]*?I:\s*([-\d.]+)\s*LUFS/);
  const lraMatch = text.match(/Loudness range:[\s\S]*?LRA:\s*([-\d.]+)\s*LU/);
  const tpMatch = text.match(/True peak:[\s\S]*?Peak:\s*([-\d.]+)\s*dBFS/);
  return {
    lufs: iMatch ? parseFloat(iMatch[1]) : NaN,
    lra: lraMatch ? parseFloat(lraMatch[1]) : NaN,
    truePeak: tpMatch ? parseFloat(tpMatch[1]) : NaN,
  };
}

function masterVoiceAndMix(dryPath) {
  console.log(`\n[3/4] Mastering vocal stem (EQ + comp + constant-gain LUFS) & 3-stem ducking mix...`);
  const voShapedTmp = path.join(VO_DIR, "_vo_shaped_tmp.wav");
  const voOut = path.join(AUDIO_DIR, "voiceover.wav");
  const mixOut = path.join(AUDIO_DIR, "mix_vo.wav");
  const foleyPath = path.join(AUDIO_DIR, "foley.wav");
  const musicPath = path.join(AUDIO_DIR, "musicbox.wav");

  // Pass 1: Close-mic warm broadcast vocal tone (no dynamic loudnorm pumping!)
  const vocalToneAf = [
    "highpass=f=80:poles=2",
    "equalizer=f=175:t=q:w=1.0:g=1.6",
    "equalizer=f=360:t=q:w=1.3:g=-1.6",
    "equalizer=f=3000:t=q:w=1.2:g=2.0",
    "highshelf=f=9000:g=-1.2",
    "acompressor=threshold=-20dB:ratio=2.8:attack=8:release=110:makeup=2",
    `atrim=0:${DURATION}`,
  ].join(",");

  run("ffmpeg", ["-y", "-v", "error", "-i", dryPath, "-af", vocalToneAf, "-ar", String(SR), "-ac", "2", "-c:a", "pcm_s16le", voShapedTmp], {
    capture: true,
  });

  // Pass 2: Measure integrated loudness and apply constant linear gain to hit -15.5 LUFS + soft peak ceiling
  const stats = analyzeEbuR128(voShapedTmp);
  const targetLufs = -15.5;
  const gainDb = Number.isFinite(stats.lufs) ? Math.max(-12, Math.min(12, targetLufs - stats.lufs)) : 0;

  run(
    "ffmpeg",
    [
      "-y", "-v", "error",
      "-i", voShapedTmp,
      "-af", `volume=${gainDb.toFixed(2)}dB,alimiter=limit=0.84:attack=3:release=45:level=disabled`,
      "-ar", String(SR), "-ac", "2", "-c:a", "pcm_s16le",
      voOut,
    ],
    { capture: true }
  );

  // Clean up temporary files
  for (const tmp of [dryPath, voShapedTmp]) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }

  // 3-stem studio mix:
  // - voiceover upfront center
  // - musicbox ducked gently (-4 to -6 dB) via sidechaincompress whenever voice is active
  // - foley crisp & tactile (-3.5 dB overall, gentle -2.5 dB vocal-pocket dip at 2.2 kHz)
  const filterComplex = [
    "[0:a]asplit=2[vo_mix][vo_sc]",
    "[2:a]volume=-1.5dB[mus_in]",
    "[mus_in][vo_sc]sidechaincompress=threshold=0.025:ratio=4.5:attack=25:release=380:makeup=1[mus_ducked]",
    "[1:a]volume=-3.5dB,equalizer=f=2200:t=q:w=1.1:g=-2.5[fol_pocket]",
    `[vo_mix][fol_pocket][mus_ducked]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.89:attack=3:release=50:level=disabled,atrim=0:${DURATION}[out]`,
  ].join(";");

  run(
    "ffmpeg",
    [
      "-y", "-v", "error",
      "-i", voOut,
      "-i", foleyPath,
      "-i", musicPath,
      "-filter_complex", filterComplex,
      "-map", "[out]",
      "-ar", String(SR), "-ac", "2", "-c:a", "pcm_s16le",
      mixOut,
    ],
    { capture: true }
  );

  const voStats = analyzeEbuR128(voOut);
  const mixStats = analyzeEbuR128(mixOut);
  console.log(
    `  voiceover.wav : ${voStats.lufs.toFixed(1)} LUFS · LRA ${voStats.lra.toFixed(1)} LU · True Peak ${voStats.truePeak.toFixed(1)} dBFS`
  );
  console.log(
    `  mix_vo.wav    : ${mixStats.lufs.toFixed(1)} LUFS · LRA ${mixStats.lra.toFixed(1)} LU · True Peak ${mixStats.truePeak.toFixed(1)} dBFS`
  );

  return { voOut, mixOut };
}

// ---------------------------------------------------------------- Step 4: Lossless MP4 mux
function muxIntoMp4(mixWav) {
  if (!doMux) return;
  if (!fs.existsSync(INPUT_MP4)) {
    throw new Error(`Input video not found: ${INPUT_MP4}`);
  }
  console.log(`\n[4/4] Losslessly muxing audio into ${path.relative(ROOT, OUTPUT_MP4)} (-c:v copy)...`);
  fs.mkdirSync(path.dirname(OUTPUT_MP4), { recursive: true });
  run(
    "ffmpeg",
    [
      "-y", "-v", "error",
      "-i", INPUT_MP4,
      "-i", mixWav,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-ar", String(SR),
      "-ac", "2",
      "-movflags", "+faststart",
      "-shortest",
      OUTPUT_MP4,
    ],
    { capture: true }
  );
  const sizeMb = (fs.statSync(OUTPUT_MP4).size / (1024 * 1024)).toFixed(2);
  console.log(`  Done! Wrote ${path.relative(ROOT, OUTPUT_MP4)} (${sizeMb} MB)`);
}

// ---------------------------------------------------------------- Main
await generateClipsIfRequested();
const dryPath = assembleDryVoiceover();
const { mixOut } = masterVoiceAndMix(dryPath);
muxIntoMp4(mixOut);
