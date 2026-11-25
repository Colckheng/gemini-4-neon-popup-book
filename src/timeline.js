// timeline.js — single source of timing truth for the 1080x1080 Gemini 4 Neon pop-up book.
// Imported by both src/scene.js (browser) and scripts/sound.mjs (Node). All values in seconds.

export const DURATION = 34.0;

export const CUES = [
  { n: 1, start: 0.0, end: 2.6, text: "选大模型，总在速度和深度之间两难" },
  { n: 2, start: 2.7, end: 5.3, text: "要么轻快但浅尝辄止，要么深邃却沉重昂贵" },
  { n: 3, start: 5.4, end: 7.6, text: "2026年11月，Google 推出 Gemini 4 Neon" },
  { n: 4, start: 7.7, end: 10.0, text: "介于 Hydrogen 与 Carbon 之间的黄金平衡点" },
  { n: 5, start: 10.1, end: 12.5, text: "打开这本立体书，拉动五道核心能力机关" },
  { n: 6, start: 12.6, end: 15.5, text: "一百万统一上下文，输入、思考与长输出一气呵成" },
  { n: 7, start: 15.6, end: 18.5, text: "四档可调思考深度，从极速响应到极限推理随需切换" },
  { n: 8, start: 18.6, end: 21.7, text: "文本、图像、音频、视频与 PDF 原生同步理解" },
  { n: 9, start: 21.8, end: 24.7, text: "擅长多步 Agent 编排，可控性拔尖且幻觉率创新低" },
  { n: 10, start: 24.8, end: 27.7, text: "性能稳居前沿梯队，缓存输入直降九成五" },
  { n: 11, start: 27.8, end: 30.5, text: "在模型层出不穷的今天，参数不再是唯一答案" },
  { n: 12, start: 30.6, end: 34.0, text: "Gemini 4 Neon，让深度思考真正立于工程一线" },
];

// Every Chinese character drawn on procedural canvases inside the 3D set (font subset source)
export const LABEL_TEXT =
  "选大模型既要强推理又要跑得快两难极速轻量深层重载黄金平衡" +
  "百万统一上下文可调思考原生多模态智能体编排性能与成本前沿梯队" +
  "输入思考长解码长输出文本图像音频视频文档代码数据科研" +
  "低幻觉高可控缓存九五折同质化参数堆砌平庸单页速度深度成本" +
  "谷歌深度思维周期表霓虹元素氢碳正·、：“”！？—￥%";

// Picture events (seconds)
export const T = {
  // Act 1 · The speed vs depth dilemma (cues 1-2)
  noteSlide: 0.35, noteRest: 1.05,
  scaleRockStart: 0.55, scaleRockEnd: 3.15,
  dilemmaPageIn: 2.35, dilemmaLand: 2.85,
  stampIn: 3.2, stampHit: 3.55, stampOut: 3.9,

  // Act 2 · Gemini 4 Neon emerges between H & C, binds into the book (cues 3-4)
  cardUp: [5.55, 5.72],
  heroCardUp: 5.95,
  badges: [6.25, 6.55, 6.85, 7.15, 7.45],
  badgeFly: 7.72, flyStep: 0.1, flyDur: 0.28,
  coverClose: 8.45,
  tabsOut: 9.02, tabStep: 0.07,
  cardsDown: 9.25,

  // Act 3 · Open book & fan five capability tabs (cue 5)
  bookOpen: 10.18,
  fan: 10.75,
  tagsUp: 10.95, tagStep: 0.1,

  // Act 4 · Five pull-tabs, one capability layer each (cues 6-10)
  pull: [12.7, 15.7, 18.7, 21.9, 24.9],

  // Layer 1 · 1M Unified Context
  scroll: [12.88, 13.85],
  ribbonBack: 13.45,
  ribbonFront: 13.72,
  beam: 14.1,

  // Layer 2 · 4 Thinking Levels (LOW / MED / HIGH / XHIGH)
  dialRise: 15.85,
  thinkSteps: [16.18, 16.66, 17.14, 17.62],

  // Layer 3 · Native Multimodal (4-panel accordion + slats + props)
  accRise: 18.85,
  accOpen: [19.0, 19.62],
  slats: 19.72, slatStep: 0.36, slatLag: 0.032, slatDur: 0.18,
  propIn: 19.35, propStep: 0.38,

  // Layer 4 · Agentic Orchestration
  towerRise: 22.05,
  subagents: [22.3, 22.52, 22.74],
  play: 22.95, dwell: [0.42, 0.36, 0.36, 0.48],
  ribbonBadge: 23.85,

  // Layer 5 · Frontier Benchmarks & Price/Cache (-95%)
  paretoRise: 25.08,
  priceTagRise: 25.42,
  checks: 25.95, checkStep: 0.13,

  // Act 5 · Flood of generic gray sheets -> tabs poke out -> book bursts tall (cues 11-12)
  labelsDown: 27.82,
  layersDown: 27.98,
  tabsIn: 28.12,
  coverDown: 28.32,
  spit: 28.25, spitStep: 0.06, spitCount: 32,
  poke: 30.58, pokeStep: 0.22,
  tremble: [31.55, 32.12],
  burst: 32.14,
  spot: [32.42, 33.25],
};

// Camera keys tuned specifically for 1080x1080 square framing (fov = 34 deg)
export const SHOTS = [
  // Act 1: focus on left tabletop balance scale (H vs C)
  { t: 0.0, tgt: [-6.85, 1.02, 1.55], dist: 8.8, elev: 24, azim: 10 },
  { t: 4.55, tgt: [-6.85, 1.02, 1.55], dist: 8.8, elev: 24, azim: 10 },
  // Act 2: pan smoothly to center book flanked by H & C tent cards
  { t: 5.5, tgt: [0.0, 1.0, 1.55], dist: 14.8, elev: 28, azim: 0 },
  { t: 9.2, tgt: [0.0, 1.0, 1.55], dist: 14.8, elev: 28, azim: 0 },
  // Act 3: tighten onto opening book + fanned 5 pull-tabs
  { t: 10.35, tgt: [0.0, 1.12, 1.75], dist: 12.6, elev: 25, azim: -10 },
  { t: 12.3, tgt: [0.0, 1.12, 1.75], dist: 12.6, elev: 25, azim: 4 },
  // Act 4.1: 1M context backdrop scroll & ribbons
  { t: 13.4, tgt: [0.0, 1.32, 1.55], dist: 11.8, elev: 21, azim: 3 },
  { t: 15.35, tgt: [0.0, 1.32, 1.55], dist: 11.8, elev: 21, azim: 3 },
  // Act 4.2: Thinking levels dial & stepped origami bars
  { t: 16.05, tgt: [0.0, 1.15, 1.62], dist: 11.6, elev: 23, azim: -4 },
  { t: 18.35, tgt: [0.0, 1.15, 1.62], dist: 11.6, elev: 23, azim: 2 },
  // Act 4.3: 4-panel multimodal accordion + slats
  { t: 19.1, tgt: [0.0, 0.98, 1.85], dist: 11.4, elev: 22, azim: 0 },
  { t: 21.55, tgt: [0.0, 0.98, 1.85], dist: 11.4, elev: 22, azim: 2 },
  // Act 4.4: Agent orchestration tower + subagents
  { t: 22.35, tgt: [-0.15, 0.96, 1.98], dist: 11.6, elev: 24, azim: -3 },
  { t: 24.55, tgt: [0.1, 0.96, 1.98], dist: 11.6, elev: 24, azim: 2 },
  // Act 4.5: Pareto & Price/Cache + checkmarks across all 5 tabs
  { t: 25.35, tgt: [0.15, 1.0, 1.95], dist: 12.3, elev: 25, azim: 4 },
  { t: 27.45, tgt: [0.0, 1.0, 1.9], dist: 12.6, elev: 26, azim: 2 },
  // Act 5.1: Pull wide high-angle as generic gray sheets flood the table
  { t: 28.45, tgt: [-0.4, 0.65, 1.75], dist: 16.4, elev: 35, azim: 2 },
  { t: 30.25, tgt: [-0.4, 0.65, 1.75], dist: 16.4, elev: 35, azim: 2 },
  // Act 5.2: Push in as 5 tabs poke out and book trembles
  { t: 31.15, tgt: [0.0, 0.72, 1.85], dist: 12.8, elev: 30, azim: 2 },
  { t: 32.15, tgt: [0.0, 0.72, 1.85], dist: 12.8, elev: 30, azim: 2 },
  // Act 5.3: Heroic reveal as Neon bursts tall under spotlight
  { t: 33.85, tgt: [0.0, 1.2, 1.7], dist: 12.1, elev: 22.5, azim: 0 },
];
