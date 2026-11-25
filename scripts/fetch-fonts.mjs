#!/usr/bin/env node
// fetch-fonts.mjs — download per-character Google Fonts subsets (woff2) into assets/fonts/
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const { CUES, LABEL_TEXT } = await import(pathToFileURL(path.join(ROOT, "src", "timeline.js")).href);

const ascii = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-–—.,:;!?/+×≠#$%&()'\" ·→";
const zh = [...new Set([...(CUES.map((c) => c.text).join("") + LABEL_TEXT + ascii)])].join("");
const FAMILIES = [
  { family: "Noto Serif SC", weights: [500, 900], text: zh, file: "NotoSerifSC" },
  { family: "Long Cang", weights: [400], text: zh, file: "LongCang" },
  { family: "Special Elite", weights: [400], text: ascii, file: "SpecialElite" },
];

fs.mkdirSync(path.join(ROOT, "assets", "fonts"), { recursive: true });
const curlBin = process.platform === "win32" ? "curl.exe" : "curl";

for (const f of FAMILIES) {
  for (const w of f.weights) {
    const url = `https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g, "+")}:wght@${w}&text=${encodeURIComponent(f.text)}`;
    const css = execFileSync(curlBin, ["-sS", "--retry", "4", "--retry-all-errors", "-A", UA, url], {
      encoding: "utf8",
      maxBuffer: 1 << 24,
    });
    const srcs = [...css.matchAll(/url\((https:[^)]+)\)\s*format\('woff2'\)/g)].map((m) => m[1]);
    if (!srcs.length) throw new Error(`no woff2 for ${f.family} ${w}:\n${css.slice(0, 300)}`);
    const out = path.join(ROOT, "assets", "fonts", `${f.file}-${w}.woff2`);
    execFileSync(curlBin, ["-sS", "--retry", "4", "--retry-all-errors", "-A", UA, srcs[0], "-o", out]);
    const head = fs.readFileSync(out).subarray(0, 4).toString("latin1");
    if (head !== "wOF2") throw new Error(`${out} is not woff2 (${head})`);
    console.log(`${path.relative(ROOT, out)}  ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
  }
}
