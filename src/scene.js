// scene.js — 1080x1080 Gemini 4 Neon handmade stop-motion pop-up book stage.
// Builds every paper object once, then poses the entire world as a pure deterministic function of time.
import * as THREE from "three";
import { makeClock, createPost, srnd, rnd } from "./handmade.js";
import { toTexture, FONT, setMaxAniso } from "./paper.js";
import * as A from "./art.js";
import { T, SHOTS, CUES } from "./timeline.js";

const W = 1080, H = 1080, HP = Math.PI / 2, DEG = Math.PI / 180;

// ---------------------------------------------------------------- renderer + handmade variables
const cnv = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({
  canvas: cnv,
  antialias: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
setMaxAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

function readVars() {
  let v = {};
  try {
    v = (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {};
  } catch (e) { v = {}; }
  const num = (x, d) => (x === undefined || x === null || x === "" || Number.isNaN(Number(x)) ? d : Number(x));
  return {
    captions: !(v.captions === false || v.captions === "false"),
    fps: num(v.fps, 12),
    jitter: num(v.jitter, 1),
    boil: num(v.boil, 1),
    matter: num(v.matter, 1),
    flicker: num(v.flicker, 1),
  };
}
const VARS = readVars();
const frameAt = makeClock(VARS.fps);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x160f0a);
scene.fog = new THREE.Fog(0x160f0a, 28, 60);
const camera = new THREE.PerspectiveCamera(34, W / H, 0.5, 95);
const post = createPost(renderer, W, H);

// ---------------------------------------------------------------- math & easing
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, u) => a + (b - a) * u;
const E = {
  lin: (u) => u,
  out: (u) => 1 - Math.pow(1 - u, 3),
  in: (u) => u * u * u,
  inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  sine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  back: (u) => 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2),
};
function tr(keys) {
  const isArr = Array.isArray(keys[0][1]);
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t < keys[i][0]) {
        const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i];
        const u = t1 > t0 ? (e || E.inOut)((t - t0) / (t1 - t0)) : 1;
        return isArr ? v0.map((a, k) => a + (v1[k] - a) * u) : v0 + (v1 - v0) * u;
      }
    }
    return keys[keys.length - 1][1];
  };
}
const within = (t, a, b) => t >= a && t < b;

// ---------------------------------------------------------------- materials & mesh builders
function tex(c, o) { return toTexture(c, o); }
function paperMat(map, { alpha = false, side = THREE.DoubleSide, rough = 0.92, color = 0xffffff } = {}) {
  return new THREE.MeshStandardMaterial({ map, color, roughness: rough, metalness: 0, side, alphaTest: alpha ? 0.5 : 0 });
}
function geoPlane(w, h, anchor = "center") {
  const g = new THREE.PlaneGeometry(w, h);
  if (anchor === "bottom") g.translate(0, h / 2, 0);
  else if (anchor === "top") g.translate(0, -h / 2, 0);
  else if (anchor === "leftBottom") g.translate(w / 2, h / 2, 0);
  else if (anchor === "left") g.translate(w / 2, 0, 0);
  return g;
}
function flatGeo(w, h) { return new THREE.PlaneGeometry(w, h).rotateX(-HP); }
function mk(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
const group = (parent) => { const g = new THREE.Group(); (parent || scene).add(g); return g; };

function jit(o, id, fr, amt, rotAmt) {
  const j = VARS.jitter;
  if (j <= 0 || amt <= 0) return;
  o.position.x += srnd(id, fr, 1) * amt * j;
  o.position.z += srnd(id, fr, 2) * amt * j;
  o.position.y += srnd(id, fr, 3) * amt * 0.3 * j;
  const ra = (rotAmt == null ? amt * 0.9 : rotAmt) * j;
  o.rotation.y += srnd(id, fr, 4) * ra;
  o.rotation.z += srnd(id, fr, 5) * ra * 0.6;
}

// ---------------------------------------------------------------- set dimensions (1080x1080 square balanced)
const BW = 5.6, BD = 3.0, FLOOR_Y = 0.062, PIV_Y = 0.085;
const L = 1.18, PH = (L * 860) / 1024;
const PIC_W = (L * 908) / 1024, PIC_H = (PH * 525) / 860;
const PIC_X = (L * (58 + 454)) / 1024, PIC_Y = PH - (PH * (176 + 262.5)) / 860;
const ACC_X0 = -2.3, ACC_Z0 = 1.48, ALPHA_OPEN = 13 * DEG, ALPHA_SHUT = 88 * DEG;
const SCALE_POS = { x: -6.9, z: 1.05 };
const TAB_X = [-2.12, -1.06, 0, 1.06, 2.12], TAB_LEN = 0.96, FAN = 0.145, TAB_Z = 2.42, PULL = 0.24, TAG_TILT = -0.46;

function chain(alpha) {
  const pts = [[ACC_X0, 0]], yaws = [];
  for (let i = 0; i < 4; i++) {
    const s = i % 2 === 0 ? 1 : -1, [x, z] = pts[i];
    pts.push([x + L * Math.cos(alpha), z + s * L * Math.sin(alpha)]);
    yaws.push(-s * alpha);
  }
  return { pts, yaws };
}
const OPEN_CHAIN = chain(ALPHA_OPEN);
const PANEL_CX = [0, 1, 2, 3].map((i) => (OPEN_CHAIN.pts[i][0] + OPEN_CHAIN.pts[i + 1][0]) / 2);

const O = {};

async function build() {
  await Promise.all([
    document.fonts.load(FONT.serif(900, 64)),
    document.fonts.load(FONT.serif(500, 64)),
    document.fonts.load(FONT.hand(64)),
    document.fonts.load(FONT.type(64)),
  ]).catch(() => null);

  // ----- lights: warm practical studio spotlight + cool back rim + warm bounce + soft fill
  const key = new THREE.SpotLight(0xffe1bb, 3.2, 0, 0.68, 0.85, 0);
  key.position.set(-7.0, 12.8, 10.2);
  key.target.position.set(-0.8, 0, 1.45);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.near = 4;
  key.shadow.camera.far = 42;
  key.shadow.bias = -0.00018;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 3;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0xd9e8ff, 0.55);
  rim.position.set(6, 7, -9);
  const bounce = new THREE.DirectionalLight(0xffd4a8, 0.44);
  bounce.position.set(9, 4, 7);
  scene.add(rim, bounce);
  const fill = new THREE.HemisphereLight(0xffeedd, 0x2c2019, 0.64);
  scene.add(fill);
  // Warm practical studio wall-grazing & miniature desk lamp lights (enrich upper background depth)
  const wallLight = new THREE.PointLight(0xffd699, 2.2, 24, 1.35);
  wallLight.position.set(-0.6, 4.7, -2.7);
  const leftWallLight = new THREE.PointLight(0xffce8c, 1.4, 18, 1.4);
  leftWallLight.position.set(-7.6, 3.8, -2.5);
  const lampGlow = new THREE.PointLight(0xffc773, 2.0, 12, 1.5);
  lampGlow.position.set(-3.1, 2.55, -3.75);
  scene.add(wallLight, leftWallLight, lampGlow);
  O.key = key;
  O.keyBase = key.intensity;
  O.lampGlow = lampGlow;
  O.wallLight = wallLight;

  // ----- walnut tabletop
  const tableTex = tex(A.drawTable(2048), { repeat: [7, 7] });
  const table = mk(
    new THREE.PlaneGeometry(56, 56).rotateX(-HP),
    new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.78, metalness: 0 }),
    { cast: false }
  );
  table.position.set(-2, 0, 0);
  scene.add(table);

  // ----- Bookbinder's Studio Workshop Backdrop & Background Props (creamy DOF depth, zero overlap with hero book)
  const studio = group();
  const wallMat = new THREE.MeshStandardMaterial({ map: tex(A.drawWorkshopWall()), roughness: 0.94, metalness: 0 });
  const backWall = mk(new THREE.PlaneGeometry(34, 11).translate(0, 5.5, 0), wallMat, { cast: false, receive: true });
  backWall.position.set(-2.5, 0, -5.4);
  studio.add(backWall);

  // Wooden wall ledge shelf
  const shelfWood = new THREE.MeshStandardMaterial({ color: 0x4f3522, roughness: 0.74 });
  const wallShelf = mk(new THREE.BoxGeometry(24, 0.13, 0.68), shelfWood, { cast: true, receive: true });
  wallShelf.position.set(-2.2, 1.68, -5.06);
  studio.add(wallShelf);
  for (const bx of [-9.5, -5.2, -1.0, 3.2, 7.2]) {
    const bracket = mk(new THREE.BoxGeometry(0.12, 0.38, 0.54), shelfWood, { cast: false });
    bracket.position.set(bx, 1.44, -5.12);
    studio.add(bracket);
  }

  // Center wall: Vintage Hand-Drawn Gemini 4 Periodic Table Poster (framed right above open book!)
  const posterMesh = mk(
    new THREE.PlaneGeometry(4.9, 2.38),
    paperMat(tex(A.drawPeriodicPoster()), { rough: 0.92 }),
    { cast: false, receive: true }
  );
  posterMesh.position.set(0.05, 3.45, -5.32);
  posterMesh.rotation.z = -0.008;
  studio.add(posterMesh);

  // Left-back wall (behind Act 1 Balance Scale): Pinned "SPEED vs DEPTH" craft blueprint
  const scaleBp = mk(
    new THREE.PlaneGeometry(2.55, 1.82),
    paperMat(tex(A.drawScaleBlueprint()), { rough: 0.93 }),
    { cast: false, receive: true }
  );
  scaleBp.position.set(-7.65, 2.68, -5.32);
  scaleBp.rotation.z = 0.025;
  studio.add(scaleBp);

  // Right-back wall: Pinned Pop-up 90° V-Fold Blueprint
  const foldBp = mk(
    new THREE.PlaneGeometry(2.45, 1.88),
    paperMat(tex(A.drawFoldBlueprint()), { rough: 0.93 }),
    { cast: false, receive: true }
  );
  foldBp.position.set(4.18, 3.22, -5.32);
  foldBp.rotation.z = -0.02;
  studio.add(foldBp);

  // Left-of-poster hanging 5-color paper swatches on craft twine
  const twine = mk(new THREE.CylinderGeometry(0.012, 0.012, 2.6, 6).rotateZ(HP), new THREE.MeshStandardMaterial({ color: 0xbda886, roughness: 0.9 }), { cast: false });
  twine.position.set(-3.95, 3.68, -5.28);
  studio.add(twine);
  A.K.forEach((col, i) => {
    const sw = mk(
      new THREE.PlaneGeometry(0.42, 0.58),
      paperMat(tex(A.drawPaperSheet(128, 180, col, 1600 + i)), { rough: 0.92 }),
      { cast: false }
    );
    sw.position.set(-4.87 + i * 0.46, 3.35, -5.29);
    sw.rotation.z = (i % 2 ? 0.04 : -0.04);
    studio.add(sw);
  });

  // Back desk cutting mat peeking cleanly behind the book spine (z = -3.75)
  const cuttingMat = mk(
    flatGeo(9.4, 3.8),
    new THREE.MeshStandardMaterial({ map: tex(A.drawCuttingMat()), roughness: 0.88, metalness: 0 }),
    { cast: false, receive: true }
  );
  cuttingMat.position.set(0.2, 0.008, -3.55);
  cuttingMat.rotation.y = 0.015;
  studio.add(cuttingMat);

  // Back-left miniature brass-and-green-shade studio desk lamp (sits cleanly behind flat cover, z = -4.2)
  const lamp = group(studio);
  lamp.position.set(-3.55, 0, -4.15);
  const lampBrass = new THREE.MeshStandardMaterial({ color: 0xc89a44, roughness: 0.36, metalness: 0.7 });
  const lampGreen = new THREE.MeshStandardMaterial({ color: 0x1f5646, roughness: 0.32, metalness: 0.15, side: THREE.DoubleSide });
  const lampBase = mk(new THREE.CylinderGeometry(0.46, 0.52, 0.14, 24), lampBrass);
  lampBase.position.y = 0.07;
  const lampStem1 = mk(new THREE.CylinderGeometry(0.042, 0.048, 2.2, 12), lampBrass);
  lampStem1.position.set(0, 1.15, 0);
  lampStem1.rotation.z = 0.14;
  const lampArm = mk(new THREE.CylinderGeometry(0.036, 0.036, 1.35, 12), lampBrass);
  lampArm.position.set(0.32, 2.55, 0.25);
  lampArm.rotation.set(0.42, 0, -0.78);
  const lampShade = mk(new THREE.ConeGeometry(0.56, 0.44, 24, 1, true), lampGreen);
  lampShade.position.set(0.72, 2.75, 0.48);
  lampShade.rotation.set(0.32, 0, -0.35);
  const lampBulb = mk(
    new THREE.SphereGeometry(0.14, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe4a8 }),
    { cast: false, receive: false }
  );
  lampBulb.position.set(0.68, 2.6, 0.46);
  lamp.add(lampBase, lampStem1, lampArm, lampShade, lampBulb);

  // Left-back desk: stack of 3 vintage cloth hardcover books + brass paperweight (x = -4.55, z = -2.05)
  const stackBooks = group(studio);
  stackBooks.position.set(-4.55, 0, -2.05);
  const bookSpecs = [
    { w: 2.1, h: 0.28, d: 1.55, col: 0x264b42, y: 0.14, ry: 0.18 },
    { w: 1.95, h: 0.26, d: 1.44, col: 0x7a2e28, y: 0.41, ry: 0.05 },
    { w: 1.8, h: 0.24, d: 1.32, col: 0x243854, y: 0.66, ry: -0.14 },
  ];
  const pageEdgeMat = new THREE.MeshStandardMaterial({ color: 0xebe0c8, roughness: 0.94 });
  bookSpecs.forEach((bs) => {
    const coverM = new THREE.MeshStandardMaterial({ color: bs.col, roughness: 0.84 });
    const bm = mk(new THREE.BoxGeometry(bs.w, bs.h, bs.d), [pageEdgeMat, coverM, coverM, coverM, pageEdgeMat, pageEdgeMat]);
    bm.position.y = bs.y;
    bm.rotation.y = bs.ry;
    stackBooks.add(bm);
  });
  const paperweight = mk(new THREE.CylinderGeometry(0.24, 0.28, 0.16, 20), lampBrass);
  paperweight.position.set(0.1, 0.86, 0.08);
  stackBooks.add(paperweight);

  // Near Act 1 Balance Scale: Wooden crimson ink pad box (x = -4.85, z = -0.55) + Ceramic pencil mug (x = -9.15, z = -1.65)
  const inkBox = group(studio);
  inkBox.position.set(-4.85, 0, -0.55);
  inkBox.rotation.y = 0.28;
  const inkWood = mk(new THREE.BoxGeometry(0.88, 0.18, 0.68), shelfWood);
  inkWood.position.y = 0.09;
  const inkPad = mk(new THREE.BoxGeometry(0.72, 0.04, 0.52), new THREE.MeshStandardMaterial({ color: 0xa62620, roughness: 0.95 }));
  inkPad.position.y = 0.19;
  inkBox.add(inkWood, inkPad);

  const mugGroup = group(studio);
  mugGroup.position.set(-9.55, 0, -2.15);
  const mug = mk(new THREE.CylinderGeometry(0.36, 0.32, 0.86, 24), new THREE.MeshStandardMaterial({ color: 0xd9cbb6, roughness: 0.65 }));
  mug.position.y = 0.43;
  mugGroup.add(mug);
  const pencilCols = [0x2e7f7a, 0xe0a13a, 0xd8472e, 0x2f55a4, 0x8e4b8a];
  pencilCols.forEach((col, i) => {
    const p = mk(new THREE.CylinderGeometry(0.032, 0.032, 1.38, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }));
    p.position.set((i - 2) * 0.075, 0.86, (i % 2 ? 0.06 : -0.06));
    p.rotation.set((i % 2 ? 0.14 : -0.12), 0, (i - 2) * 0.11);
    mugGroup.add(p);
  });

  // Right-back desk (x = +4.45, z = -1.95): Kraft paper cylinder holding 4 rolled colored cardstock tubes + wooden ruler
  const rollHolder = group(studio);
  rollHolder.position.set(4.45, 0, -1.95);
  const cup = mk(new THREE.CylinderGeometry(0.46, 0.42, 0.92, 24), new THREE.MeshStandardMaterial({ color: 0x9c7b56, roughness: 0.9 }));
  cup.position.y = 0.46;
  rollHolder.add(cup);
  [
    { col: A.C.ctx, x: -0.16, z: -0.1, h: 1.95, rx: -0.08, rz: 0.14 },
    { col: A.C.think, x: 0.15, z: -0.12, h: 2.25, rx: -0.1, rz: -0.1 },
    { col: A.C.agent, x: -0.08, z: 0.14, h: 1.72, rx: 0.12, rz: 0.08 },
    { col: A.C.multi, x: 0.18, z: 0.12, h: 2.08, rx: 0.08, rz: -0.15 },
  ].forEach((rt, i) => {
    const tube = mk(
      new THREE.CylinderGeometry(0.11, 0.11, rt.h, 16, 1, true),
      paperMat(tex(A.drawPaperSheet(256, 256, rt.col, 1650 + i)), { rough: 0.9 })
    );
    tube.position.set(rt.x, rt.h / 2 + 0.18, rt.z);
    tube.rotation.set(rt.rx, 0, rt.rz);
    rollHolder.add(tube);
  });

  // Wooden craft ruler lying naturally on right side of desk
  const rulerMesh = mk(
    new THREE.BoxGeometry(2.6, 0.04, 0.38),
    paperMat(tex(A.drawRuler()), { rough: 0.78 })
  );
  rulerMesh.position.set(4.3, 0.02, 0.45);
  rulerMesh.rotation.y = -1.28;
  studio.add(rulerMesh);

  // Wall shelf decorative craft items: small stacked craft boxes + miniature paper-leaf terracotta pot
  const potGroup = group(studio);
  potGroup.position.set(2.55, 1.75, -4.95);
  const pot = mk(new THREE.CylinderGeometry(0.28, 0.2, 0.42, 16), new THREE.MeshStandardMaterial({ color: 0xb65a3c, roughness: 0.85 }));
  pot.position.y = 0.21;
  potGroup.add(pot);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3b7a54, roughness: 0.85, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const leaf = mk(geoPlane(0.24, 0.62, "bottom"), leafMat);
    leaf.position.set(Math.cos(ang) * 0.08, 0.36, Math.sin(ang) * 0.08);
    leaf.rotation.set(0.45, ang, 0);
    potGroup.add(leaf);
  }
  const shelfBox1 = mk(new THREE.BoxGeometry(1.1, 0.44, 0.56), new THREE.MeshStandardMaterial({ color: 0x9c8668, roughness: 0.9 }));
  shelfBox1.position.set(-1.35, 1.97, -4.95);
  const shelfBox2 = mk(new THREE.BoxGeometry(0.86, 0.34, 0.48), new THREE.MeshStandardMaterial({ color: 0x2f55a4, roughness: 0.86 }));
  shelfBox2.position.set(-1.28, 2.36, -4.95);
  shelfBox2.rotation.y = 0.12;
  studio.add(shelfBox1, shelfBox2);

  // ----- the pop-up book
  const navyTex = tex(A.drawCover(1024, 548, false), { repeat: [3, 2] });
  const navy = new THREE.MeshStandardMaterial({ map: navyTex, roughness: 0.85 });
  const creamTex = tex(A.drawPaperSheet(2048, 1096, "#f4ede0", 801));
  const book = group();
  O.book = book;

  const bottomBoard = mk(new THREE.BoxGeometry(5.82, 0.05, 3.18), navy);
  bottomBoard.position.set(0, 0.025, 1.52);
  const floorPage = mk(flatGeo(BW, BD), paperMat(creamTex));
  floorPage.position.set(0, FLOOR_Y, 1.5);
  const spine = mk(new THREE.BoxGeometry(5.82, 0.12, 0.09), navy);
  spine.position.set(0, 0.06, -0.035);
  const block = mk(new THREE.BoxGeometry(5.52, 0.022, 2.94), new THREE.MeshStandardMaterial({ color: 0xefe6d6, roughness: 0.95 }));
  block.position.set(0, 0.066, 1.5);
  book.add(bottomBoard, floorPage, spine, block);
  O.block = block;

  const cover = group(book);
  cover.position.set(0, PIV_Y, 0);
  const bf = group(cover);
  bf.rotation.x = HP;
  const backPage = mk(geoPlane(BW, BD, "bottom"), paperMat(creamTex));
  backPage.position.z = 0.003;
  const topBoard = mk(new THREE.BoxGeometry(5.82, 3.18, 0.05).translate(0, 1.52, 0), navy);
  topBoard.position.z = -0.03;
  const titleTex = tex(A.drawCover(2048, 1096, true));
  const title = mk(
    new THREE.PlaneGeometry(5.64, 3.04).rotateX(Math.PI),
    new THREE.MeshStandardMaterial({ map: titleTex, roughness: 0.58, metalness: 0.06 }),
    { cast: false }
  );
  title.position.set(0, 1.52, -0.057);
  bf.add(backPage, topBoard, title);
  O.cover = cover;
  O.bf = bf;

  // ----- Layer 1: 1M Unified Context Scroll + Roller + Neon Light Beam + Two Ribbons
  const ctxTex = tex(A.drawContextBackdrop());
  const scrollMesh = mk(geoPlane(BW + 0.03, BD + 0.02, "top"), paperMat(ctxTex), { cast: false });
  scrollMesh.position.set(0, BD + 0.01, 0.008);
  const roller = mk(
    new THREE.CylinderGeometry(0.072, 0.072, 5.72, 24).rotateZ(HP),
    paperMat(tex(A.drawPaperSheet(512, 256, "#efe6d4", 802)))
  );
  const beam = new THREE.Mesh(
    geoPlane(2.35, 0.52, "left"),
    new THREE.MeshBasicMaterial({ map: tex(A.drawBeam()), transparent: true, depthWrite: false, opacity: 0.78, side: THREE.DoubleSide })
  );
  beam.position.set(-BW / 2 + BW * (1520 / 2048), BD * (1 - 278 / 1096), 0.022);
  beam.rotation.z = Math.PI - 0.12;
  bf.add(scrollMesh, roller, beam);
  O.scroll = scrollMesh;
  O.ctxTex = ctxTex;
  O.roller = roller;
  O.beam = beam;

  const standee = (w, h, map, parent = book) => {
    const pivot = group(parent);
    const m = mk(geoPlane(w, h, "bottom"), paperMat(map, { alpha: true }));
    pivot.add(m);
    return pivot;
  };

  O.ribbonBack = standee(BW, (BW * 340) / 2048, tex(A.drawContextRibbon(false, 2048, 340)));
  O.ribbonBack.position.set(0, FLOOR_Y, 0.25);
  O.ribbonFront = standee(BW, (BW * 215) / 2048, tex(A.drawContextRibbon(true, 2048, 215)));
  O.ribbonFront.position.set(0, FLOOR_Y, 0.54);

  // ----- Layer 2: Adjustable Thinking-Depth Dial + Brass Pointer + 4 Origami Bars
  O.dialPivot = group(book);
  O.dialPivot.position.set(-1.38, FLOOR_Y, 0.92);
  const dialCard = mk(geoPlane(1.76, 1.44, "bottom"), paperMat(tex(A.drawThinkingDial()), { alpha: true }));
  O.dialPivot.add(dialCard);
  const needlePivot = group(O.dialPivot);
  needlePivot.position.set(0, 0.33, 0.025);
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc99c46, roughness: 0.38, metalness: 0.65 });
  const needleArm = mk(new THREE.BoxGeometry(0.052, 0.44, 0.024).translate(0, 0.19, 0), new THREE.MeshStandardMaterial({ color: 0xd8472e, roughness: 0.5 }));
  const needleCap = mk(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 18).rotateX(HP), brassMat);
  needlePivot.add(needleArm, needleCap);
  O.thinkNeedle = needlePivot;

  O.thinkBars = [0, 1, 2, 3].map((i) => {
    const p = standee(0.58, 1.42, tex(A.drawThinkBar(i)));
    p.position.set(0.22 + i * 0.66, FLOOR_Y, 0.92);
    return p;
  });

  // ----- Layer 3: 4-Panel Multimodal Accordion + Slats + Mini Props
  const acc = group(book);
  acc.position.set(0, FLOOR_Y, ACC_Z0);
  O.acc = acc;
  O.panels = [];
  for (let i = 0; i < 4; i++) {
    const hinge = group(acc);
    const body = group(hinge);
    const frame = mk(geoPlane(L, PH, "leftBottom"), paperMat(tex(A.drawPanelFrame(i)), { alpha: true }));
    body.add(frame);
    const inkTex = tex(A.drawModalityShot(i, "ink"));
    const styleTex = tex(A.drawModalityShot(i, A.MOD_STYLES[i]));
    const slats = [];
    const SW = PIC_W / 6;
    for (let k = 0; k < 6; k++) {
      const s = group(body);
      s.position.set(PIC_X - PIC_W / 2 + SW * (k + 0.5), PIC_Y, 0.008);
      const mkFace = (map, back) => {
        const g = new THREE.PlaneGeometry(SW, PIC_H);
        const uv = g.attributes.uv;
        for (let q = 0; q < uv.count; q++) uv.setX(q, (k + uv.getX(q)) / 6);
        if (back) g.rotateY(Math.PI);
        return mk(g, new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.FrontSide }), { cast: false });
      };
      s.add(mkFace(inkTex, false), mkFace(styleTex, true));
      slats.push(s);
    }
    const modLabel = mk(geoPlane(0.68, 0.185, "bottom"), paperMat(tex(A.drawModLabel(i)), { alpha: true }));
    modLabel.position.set(PIC_X, PH - 0.02, 0.012);
    body.add(modLabel);
    O.panels.push({ hinge, body, frame, slats, modLabel });
  }

  O.modProps = [0, 1, 2, 3].map((i) => {
    const p = standee(0.76, 0.61, tex(A.drawModProp(i)));
    p.position.set(PANEL_CX[i], FLOOR_Y, 2.15 + (i % 2 ? -0.05 : 0.04));
    return p;
  });

  // ----- Layer 4: Agent Orchestration Tower + 3 Subagents + Playhead Flag
  O.agentTower = standee(0.92, 1.15, tex(A.drawAgentTower()));
  O.agentTower.position.set(-2.14, FLOOR_Y, 2.55);
  O.subagents = [0, 1, 2].map((i) => {
    const p = standee(0.72, 0.55, tex(A.drawSubagent(i)));
    p.position.set(-0.98 + i * 0.88, FLOOR_Y, 2.66);
    return p;
  });
  const flag = group(book);
  const stick = mk(new THREE.CylinderGeometry(0.015, 0.015, 0.44, 8), new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6 }));
  stick.position.y = 0.22;
  const pennant = mk(geoPlane(0.34, 0.34, "leftBottom"), paperMat(tex(A.drawFlag()), { alpha: true }));
  pennant.position.set(0.015, 0.14, 0);
  flag.add(stick, pennant);
  O.flag = flag;

  // ----- Layer 5: Frontier Pareto Chart + Hanging Price Tag (cleanly separated from tabs)
  O.paretoCard = standee(1.16, 0.94, tex(A.drawParetoCard()));
  O.paretoCard.position.set(1.48, FLOOR_Y, 2.38);
  O.priceTag = group(book);
  O.priceTag.position.set(2.38, FLOOR_Y, 2.52);
  const tagStalk = mk(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 8), new THREE.MeshStandardMaterial({ color: 0x3a322a, roughness: 0.6 }));
  tagStalk.position.set(0, 0.17, 0);
  const tagPlane = mk(geoPlane(1.02, 0.59, "bottom"), paperMat(tex(A.drawPriceTag()), { alpha: true }));
  tagPlane.position.set(0, 0.28, 0.008);
  O.priceTag.add(tagStalk, tagPlane);

  // ----- Five stacked capability pages (Act 2)
  O.pages = A.K.map((col, i) => {
    const d = 2.88 - i * 0.16;
    const m = mk(flatGeo(5.4, d), paperMat(tex(A.drawPaperSheet(1024, 480, col, 820 + i))));
    m.userData.z = 0.06 + d / 2;
    book.add(m);
    return m;
  });

  // ----- Pull-tabs + tags + checkmarks
  const tagChecks = tex(A.drawCheck());
  O.tabs = A.K.map((col, i) => {
    const pivot = group(book);
    const slide = group(pivot);
    const strip = mk(
      new THREE.PlaneGeometry(0.32, TAB_LEN).rotateX(-HP).translate(0, 0, TAB_LEN / 2),
      paperMat(tex(A.drawTab(i)))
    );
    slide.add(strip);
    const tagPivot = group(slide);
    tagPivot.position.z = TAB_LEN - 0.02;
    const tag = mk(geoPlane(0.96, 0.375, "bottom"), paperMat(tex(A.drawTag(i)), { alpha: true }));
    tagPivot.add(tag);
    const check = mk(geoPlane(0.24, 0.24), paperMat(tagChecks, { alpha: true }), { cast: false });
    check.position.set(0.4, 0.35, 0.014);
    tagPivot.add(check);
    return { pivot, slide, tagPivot, check };
  });

  // ----- Act 1: Cardboard Balance Scale (H vs C) + Question Note + Dilemma Sheet + Rubber Stamp
  const cbMat = new THREE.MeshStandardMaterial({ map: tex(A.drawCardboard(512, 512, 31)), roughness: 0.94 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x6f4a28, roughness: 0.72 });
  const scaleGroup = group();
  scaleGroup.position.set(SCALE_POS.x, 0, SCALE_POS.z);
  const scaleBase = mk(new THREE.BoxGeometry(1.9, 0.16, 1.1).translate(0, 0.08, 0), cbMat);
  const scalePost = mk(new THREE.BoxGeometry(0.22, 1.94, 0.22).translate(0, 1.05, 0), cbMat);
  const fulcrum = mk(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 16).rotateX(HP), brassMat);
  fulcrum.position.set(0, 1.92, 0);
  scaleGroup.add(scaleBase, scalePost, fulcrum);

  const scaleBeam = group(scaleGroup);
  scaleBeam.position.set(0, 1.92, 0);
  const bar = mk(new THREE.BoxGeometry(2.6, 0.1, 0.1), darkWood);
  scaleBeam.add(bar);

  const makePan = (side, tileCanvas, tileSize, thick) => {
    const hang = group(scaleBeam);
    hang.position.set(side * 1.14, -0.02, 0);
    const strL = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.96, 6), brassMat);
    strL.position.set(-0.2, -0.48, 0); strL.rotation.z = -0.2;
    const strR = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.96, 6), brassMat);
    strR.position.set(0.2, -0.48, 0); strR.rotation.z = 0.2;
    const tray = mk(new THREE.CylinderGeometry(0.46, 0.38, 0.06, 20), brassMat);
    tray.position.set(0, -0.95, 0);
    const tileMat = paperMat(tex(tileCanvas));
    const tile = mk(new THREE.BoxGeometry(tileSize, tileSize, thick), [cbMat, cbMat, cbMat, cbMat, tileMat, tileMat]);
    tile.position.set(0, -0.91 + tileSize / 2, 0);
    hang.add(strL, strR, tray, tile);
    return hang;
  };
  O.panH = makePan(-1, A.drawElementTile("H", 1, "Hydrogen", "轻快 · 浅层", A.C.hBlue), 0.66, 0.09);
  O.panC = makePan(1, A.drawElementTile("C", 6, "Carbon", "深邃 · 沉重", A.C.cSlate), 0.76, 0.26);
  O.scaleGroup = scaleGroup;
  O.scaleBeam = scaleBeam;

  // Handwritten question note + gray dilemma page + red X mark + wooden rubber stamp
  O.note = mk(flatGeo(1.74, 1.0), paperMat(tex(A.drawQuestionNote())));
  scene.add(O.note);
  O.dilemmaPage = mk(flatGeo(1.48, 1.03), paperMat(tex(A.drawDilemmaPage())));
  scene.add(O.dilemmaPage);
  O.mark = mk(flatGeo(0.58, 0.58), paperMat(tex(A.drawStampMark()), { alpha: true }), { cast: false });
  O.mark.position.set(-5.82, 0.012, 2.52);
  O.mark.rotation.y = -0.14;
  scene.add(O.mark);

  const stamp = group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.7 });
  const rubber = mk(new THREE.BoxGeometry(0.56, 0.035, 0.56), new THREE.MeshStandardMaterial({ color: 0xb82a24, roughness: 0.8 }));
  rubber.position.y = 0.0175;
  const sBase = mk(new THREE.BoxGeometry(0.62, 0.14, 0.62), wood);
  sBase.position.y = 0.105;
  const handle = mk(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 18), wood);
  handle.position.y = 0.425;
  const sKnob = mk(new THREE.SphereGeometry(0.15, 20, 14), wood);
  sKnob.position.y = 0.72;
  stamp.add(rubber, sBase, handle, sKnob);
  O.stamp = stamp;

  // ----- Act 2: H & C tent cards, Hero Neon card, 5 floating badges, 正 tally
  const tent = (which, x, yaw) => {
    const pivot = group();
    pivot.position.set(x, 0, 2.86);
    pivot.rotation.y = yaw;
    const leaf = group(pivot);
    leaf.add(mk(geoPlane(1.32, 0.82, "bottom"), paperMat(tex(A.drawTentCard(which)))));
    return { pivot, leaf };
  };
  O.cardH = tent("H", -3.42, 0.28);
  O.cardC = tent("C", 3.42, -0.28);

  O.heroCard = standee(2.45, 1.7, tex(A.drawHeroNeonCard()), scene);
  O.heroCard.position.set(0, 0.08, 1.42);

  O.badges = [0, 1, 2, 3, 4].map((k) => {
    const m = mk(geoPlane(0.92, 0.92), paperMat(tex(A.drawBadge(k)), { alpha: true }));
    const ang = -0.82 + k * 0.41;
    m.userData.home = [Math.sin(ang) * 2.45, 2.2 + Math.cos(ang) * 0.65, 1.95 - Math.abs(k - 2) * 0.15];
    m.userData.roll = srnd(k, 77) * 0.12;
    scene.add(m);
    return m;
  });

  O.tallyTex = [0, 1, 2, 3, 4, 5].map((n) => tex(A.drawTally(n)));
  O.tally = mk(flatGeo(0.76, 0.76), paperMat(O.tallyTex[0], { alpha: true }), { cast: false });
  O.tally.position.set(0, 0.004, 3.85);
  scene.add(O.tally);

  // ----- Act 5: Flood of 32 identical flat gray "PARAMS++" sheets
  const floodMat = paperMat(tex(A.drawGenericFloodPage(768, 540, 64)));
  const floodGeo = flatGeo(1.45, 1.02);
  O.flood = [];
  for (let i = 0; i < T.spitCount; i++) {
    const m = mk(floodGeo, floodMat);
    scene.add(m);
    const t0 = T.spit + i * T.spitStep;
    const dur = 0.42 + rnd(i, 3) * 0.14;
    const tLand = t0 + dur;
    let x, z, onBook = false;
    if (t0 > T.coverDown + 0.1 && rnd(i, 9) < 0.56) {
      onBook = true;
      x = -2.25 + rnd(i, 5) * 4.5;
      z = 0.42 + rnd(i, 7) * 2.25;
    } else {
      for (let k = 0; k < 28; k++) {
        x = -7.6 + rnd(i, 11, k) * 15.2;
        z = -1.2 + rnd(i, 13, k) * 5.6;
        const inBookBody = Math.abs(x) < 3.25 && z > -0.25 && z < 4.15;
        const crossesBackdrop = Math.abs(x) < 3.3 && z < 0.45;
        if (!inBookBody && !crossesBackdrop) break;
      }
    }
    const yRest = onBook ? 0.136 + i * 0.0022 : 0.005 + i * 0.0022;
    const yaw = rnd(i, 17) * Math.PI * 2;
    const out = onBook ? [Math.sign(x || 1) * (4.15 + rnd(i, 19) * 1.9), z + srnd(i, 23) * 0.85] : null;
    const fromSide = i % 2 === 0 ? -8.5 : 8.5;
    O.flood.push({
      m, t0, dur, tLand, x, z, onBook, yRest, yaw, out, fromSide,
      peak: 1.2 + rnd(i, 29) * 1.1,
      spin: [srnd(i, 31) * 7, srnd(i, 37) * 5],
    });
  }

  // ----- Diegetic 3D Tabletop Paper Caption Strip (physically lit, shadowed, boiled, grained!)
  O.captionTex = CUES.map((c, idx) => tex(A.drawCaptionStrip(c.text, idx)));
  O.captionRig = group();
  O.captionPivot = group(O.captionRig);
  O.captionMat = paperMat(O.captionTex[0], { alpha: true, rough: 0.90 });
  // Slight warm self-bounce emissive so shadows stay natural while ink stays readable in dark scenes
  O.captionMat.emissive = new THREE.Color(0x281e15);
  O.captionMat.emissiveIntensity = 0.22;
  O.captionMesh = mk(geoPlane(1.0, 216 / 1520, "bottom"), O.captionMat, { cast: true, receive: true });
  O.captionPivot.add(O.captionMesh);
  O.captionRay = new THREE.Raycaster();
  O.captionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.028);
  O.captionHit = new THREE.Vector3();

  renderer.compile(scene, camera);
}

// ================================================================= keyframe tracks
const TR = {};
function buildTracks() {
  const cc = T.coverClose, cd = T.coverDown, bu = T.burst;
  TR.cover = tr([
    [0, 2], [cc, 2], [cc + 0.36, 0, E.in], [cc + 0.44, 0.07, E.out], [cc + 0.54, 0, E.in],
    [T.bookOpen, 0], [T.bookOpen + 0.55, 1.07, E.out], [T.bookOpen + 0.76, 1],
    [cd, 1], [cd + 0.28, 0, E.in], [cd + 0.35, 0.05, E.out], [cd + 0.44, 0, E.in],
    [bu, 0], [bu + 0.32, 1.1, E.out], [bu + 0.54, 0.97], [bu + 0.7, 1],
  ]);

  const layer = (up, down, again, dur = 0.28) =>
    tr([[up, 0], [up + dur, 1, E.back], [down, 1], [down + 0.16, 0, E.in], [again, 0], [again + dur, 1, E.back]]);

  // Layer 1 · 1M Context
  TR.scroll = tr([[T.scroll[0], 0], [T.scroll[1], 1, E.out]]);
  TR.ribbonBack = layer(T.ribbonBack, T.layersDown + 0.12, bu + 0.18);
  TR.ribbonFront = layer(T.ribbonFront, T.layersDown + 0.08, bu + 0.24);

  // Layer 2 · Thinking Levels
  TR.dial = layer(T.dialRise, T.layersDown + 0.06, bu + 0.28);
  const angles = [1.15, 0.38, -0.38, -1.15]; // LOW (left) -> XHIGH (right)
  TR.needle = tr([
    [0, 1.25],
    [T.thinkSteps[0], 1.25], [T.thinkSteps[0] + 0.16, angles[0], E.back],
    [T.thinkSteps[1], angles[0]], [T.thinkSteps[1] + 0.16, angles[1], E.back],
    [T.thinkSteps[2], angles[1]], [T.thinkSteps[2] + 0.16, angles[2], E.back],
    [T.thinkSteps[3], angles[2]], [T.thinkSteps[3] + 0.18, angles[3], E.back],
  ]);
  TR.thinkBars = T.thinkSteps.map((ts, i) => layer(ts, T.layersDown + 0.04 + i * 0.015, bu + 0.32 + i * 0.04, 0.24));

  // Layer 3 · Multimodal Accordion + Slats + Props
  TR.accRise = tr([
    [T.accRise, 0], [T.accRise + 0.2, 1, E.out],
    [T.layersDown + 0.04, 1], [T.layersDown + 0.22, 0, E.in],
    [bu + 0.26, 0], [bu + 0.44, 1, E.back],
  ]);
  TR.alpha = tr([
    [T.accOpen[0], ALPHA_SHUT], [T.accOpen[1], ALPHA_OPEN, E.inOut],
    [T.layersDown, ALPHA_OPEN], [T.layersDown + 0.16, ALPHA_SHUT, E.in],
    [bu + 0.32, ALPHA_SHUT], [bu + 0.62, ALPHA_OPEN, E.out],
  ]);
  TR.slat = [0, 1, 2, 3].map((i) =>
    [0, 1, 2, 3, 4, 5].map((k) => {
      const t0 = T.slats + i * T.slatStep + k * T.slatLag;
      return tr([[t0, 0], [t0 + T.slatDur, Math.PI, E.inOut]]);
    })
  );
  TR.modLabel = [0, 1, 2, 3].map((i) => {
    const t0 = T.slats + i * T.slatStep + 0.24;
    return tr([[t0, 0], [t0 + 0.2, 1, E.back]]);
  });
  TR.modProps = [0, 1, 2, 3].map((i) => layer(T.propIn + i * T.propStep, T.layersDown + 0.02 * i, bu + 0.48 + i * 0.04));

  // Layer 4 · Agent Tower + Subagents + Playhead hits
  TR.agentTower = layer(T.towerRise, T.layersDown, bu + 0.56, 0.3);
  TR.subagents = T.subagents.map((ts, i) => layer(ts, T.layersDown + 0.01 * i, bu + 0.62 + i * 0.04, 0.24));
  const hits = [];
  let ht = T.play;
  for (const d of T.dwell) { hits.push(ht); ht += d; }
  TR.hits = hits;
  TR.hitEnd = ht;

  // Layer 5 · Pareto Card + Price Tag
  TR.pareto = layer(T.paretoRise, T.layersDown, bu + 0.68, 0.28);
  TR.priceTag = layer(T.priceTagRise, T.layersDown, bu + 0.74, 0.26);

  // Pull-tabs
  TR.tabs = [0, 1, 2, 3, 4].map((i) => {
    const o = T.tabsOut + i * T.tabStep, p = T.poke + i * T.pokeStep;
    return {
      slide: tr([
        [0, -1.02], [o, -1.02], [o + 0.26, 0, E.out],
        [T.pull[i], 0], [T.pull[i] + 0.2, PULL, E.out],
        [T.tabsIn, PULL], [T.tabsIn + 0.22, -1.02, E.in],
        [p, -1.02], [p + 0.24, 0.12, E.back],
      ]),
      yaw: tr([
        [T.fan + i * 0.04, 0], [T.fan + i * 0.04 + 0.36, (i - 2) * FAN, E.back],
        [T.tabsIn, (i - 2) * FAN], [T.tabsIn + 0.18, 0],
        [p, 0], [p + 0.26, (i - 2) * FAN * 0.82, E.out],
      ]),
      y: tr([[0, 0.1], [T.bookOpen, 0.1], [T.bookOpen + 0.15, 0.056], [T.tabsIn + 0.24, 0.056], [T.tabsIn + 0.28, 0.1]]),
      tilt: tr([
        [0, -HP], [T.tagsUp + i * T.tagStep, -HP], [T.tagsUp + i * T.tagStep + 0.24, TAG_TILT, E.back],
        [T.labelsDown, TAG_TILT], [T.labelsDown + 0.14, -HP, E.in],
        [p + 0.08, -HP], [p + 0.3, TAG_TILT, E.back],
      ]),
      check: tr([[T.checks + i * T.checkStep, 0], [T.checks + i * T.checkStep + 0.18, 1, E.back]]),
    };
  });

  // Act 1 · Scale, Note, Dilemma Page, Stamp
  TR.notePos = tr([
    [0, [-4.8, 0.014, 3.85]],
    [T.noteSlide, [-4.8, 0.014, 3.85]],
    [T.noteRest, [-7.82, 0.014, 2.55], E.out],
  ]);
  TR.dilemmaPos = tr([
    [T.dilemmaPageIn, [-4.5, 0.42, 1.85]],
    [T.dilemmaLand, [-5.84, 0.006, 2.55], E.in],
  ]);
  TR.stampPos = tr([
    [T.stampIn, [-5.1, 3.2, 3.4]],
    [T.stampHit, [-5.82, 0.012, 2.52], E.in],
    [T.stampOut, [-5.82, 0.012, 2.52]],
    [T.stampOut + 0.34, [-4.8, 3.3, 3.6], E.out],
  ]);

  // Act 2 · Tent cards, Hero card, Badges
  TR.card = [T.cardUp[0], T.cardUp[1]].map((t0) => tr([[t0, 0], [t0 + 0.26, 1, E.back], [T.cardsDown, 1], [T.cardsDown + 0.22, 0, E.in]]));
  TR.heroCard = tr([[T.heroCardUp, 0], [T.heroCardUp + 0.28, 1, E.back], [T.coverClose - 0.12, 1], [T.coverClose + 0.08, 0, E.in]]);
  TR.badgePop = T.badges.map((t0) => tr([[t0, 0], [t0 + 0.22, 1, E.back]]));

  // Act 5 spotlight
  TR.spot = tr([[T.spot[0], 0], [T.spot[1], 1]]);
}

function rise(pivot, v) {
  pivot.rotation.set(-HP * (1 - v), 0, 0);
  pivot.visible = v > 0.004;
}

// ================================================================= pose world at time t (held frame fr)
const _v = new THREE.Vector3();
function update(t, fr) {
  const a = TR.cover(t);
  let aT = a;
  if (within(t, T.tremble[0], T.tremble[1])) {
    const r = (t - T.tremble[0]) / (T.tremble[1] - T.tremble[0]);
    aT += Math.max(0, srnd(900, fr)) * 0.055 * r * r;
  }
  O.cover.position.set(0, PIV_Y, 0);
  O.cover.rotation.set(-aT * HP, 0, 0);
  jit(O.cover, 901, fr, a > 0.02 && a < 0.98 ? 0.004 : 0.0008, 0.002);
  O.block.visible = a < 0.45;
  const open = a > 0.55;

  // Act 2 · five colored capability pages stack then tuck inside closed book
  O.pages.forEach((m, i) => {
    const arr = T.badgeFly + i * T.flyStep + T.flyDur;
    m.visible = t >= arr && t < T.coverClose + 0.54;
    const u = clamp((t - arr) / 0.14, 0, 1);
    m.position.set(srnd(i, 41) * 0.04, lerp(0.62, 0.064 + i * 0.0017, E.in(u)), m.userData.z + srnd(i, 43) * 0.02);
    m.rotation.set(0, srnd(i, 47) * 0.02 * (1.4 - u), 0);
  });

  // Layer 1 · 1M backdrop scroll + roller + beam + ribbons
  const h = TR.scroll(t);
  O.scroll.visible = h > 0.002;
  O.scroll.scale.y = Math.max(0.002, h);
  O.ctxTex.repeat.set(1, Math.max(0.002, h));
  O.ctxTex.offset.set(0, 1 - Math.max(0.002, h));
  O.roller.visible = h > 0.002 && h < 0.999;
  O.roller.position.set(0, BD * (1 - h) + 0.02, 0.085);
  O.roller.rotation.x = (BD * h) / 0.072;
  O.beam.visible = h > 0.35 && t >= T.beam && a > 0.7;
  O.beam.rotation.z = Math.PI - 0.16 + 0.18 * Math.sin(Math.max(0, t - T.beam) * 1.4);
  O.beam.scale.x = 0.88 + 0.16 * Math.sin(Math.max(0, t - T.beam) * 2.4) + 0.06 * srnd(902, fr);
  rise(O.ribbonBack, TR.ribbonBack(t) * (open ? 1 : 0));
  rise(O.ribbonFront, TR.ribbonFront(t) * (open ? 1 : 0));

  // Layer 2 · Thinking dial + needle + 4 stepped origami bars
  const dv = TR.dial(t) * (open ? 1 : 0);
  rise(O.dialPivot, dv);
  O.dialPivot.position.set(-1.38, FLOOR_Y, 0.92);
  O.thinkNeedle.rotation.z = TR.needle(t) + srnd(904, fr) * 0.015 * VARS.jitter;
  jit(O.dialPivot, 905, fr, 0.0015);
  O.thinkBars.forEach((b, i) => {
    b.position.set(0.22 + i * 0.66, FLOOR_Y, 0.92);
    rise(b, TR.thinkBars[i](t) * (open ? 1 : 0));
    jit(b, 906 + i, fr, 0.0016);
  });

  // Layer 3 · 4-panel multimodal accordion + slats + mini props
  const accR = TR.accRise(t) * (open ? 1 : 0);
  O.acc.visible = t >= T.accRise && accR > 0.004;
  O.acc.rotation.x = -HP * (1 - accR);
  const ch = chain(TR.alpha(t));
  O.panels.forEach((p, i) => {
    p.hinge.position.set(ch.pts[i][0], 0, ch.pts[i][1]);
    p.hinge.rotation.set(0, ch.yaws[i], 0);
    jit(p.hinge, 910 + i, fr, 0.002, 0.004);
    let punch = 0;
    TR.hits.forEach((ht, k) => {
      if (k === i && t >= ht) punch = Math.max(punch, Math.exp(-(t - ht) / 0.12) * (t - ht < 0.4 ? 1 : 0));
    });
    p.body.position.z = 0.075 * punch;
    p.body.scale.setScalar(1 + 0.055 * punch);
    p.slats.forEach((s, k) => { s.rotation.y = TR.slat[i][k](t); });
    const ml = TR.modLabel[i](t);
    p.modLabel.visible = ml > 0.01;
    p.modLabel.scale.setScalar(Math.max(0.001, ml));
  });
  O.modProps.forEach((p, i) => {
    p.position.set(PANEL_CX[i], FLOOR_Y, 2.15 + (i % 2 ? -0.05 : 0.04));
    rise(p, TR.modProps[i](t) * (open ? 1 : 0));
    jit(p, 920 + i, fr, 0.0015);
  });

  // Layer 4 · Agent Tower + Subagents + Hopping Flag
  O.agentTower.position.set(-2.14, FLOOR_Y, 2.55);
  rise(O.agentTower, TR.agentTower(t) * (open ? 1 : 0));
  jit(O.agentTower, 930, fr, 0.0015);
  O.subagents.forEach((sa, i) => {
    sa.position.set(-0.98 + i * 0.88, FLOOR_Y, 2.66);
    const sv = TR.subagents[i](t) * (open ? 1 : 0);
    rise(sa, sv);
    // slight lively nod during orchestration
    if (sv > 0.8 && t >= T.play && t < T.labelsDown) {
      sa.rotation.z = Math.sin((t - T.play) * 6 + i * 1.4) * 0.035;
    }
    jit(sa, 931 + i, fr, 0.0015);
  });
  O.flag.visible = t >= T.play - 0.15 && t < TR.hitEnd + 0.3 && open;
  if (O.flag.visible) {
    let j = 0, since = 1;
    TR.hits.forEach((ht, k) => { if (t >= ht) { j = k; since = t - ht; } });
    const from = Math.max(0, j - 1), u = clamp(since / 0.14, 0, 1);
    const xa = PANEL_CX[from], xb = PANEL_CX[j];
    O.flag.position.set(lerp(xa, xb, E.out(u)) - 0.04, FLOOR_Y + PH + 0.24 + 0.2 * Math.sin(Math.PI * u), ACC_Z0 + 0.3);
    O.flag.rotation.set(0, 0, 0);
    jit(O.flag, 936, fr, 0.004);
  }

  // Layer 5 · Pareto Chart + Hanging Price Tag
  O.paretoCard.position.set(1.48, FLOOR_Y, 2.38);
  rise(O.paretoCard, TR.pareto(t) * (open ? 1 : 0));
  O.paretoCard.rotation.y = -0.06;
  jit(O.paretoCard, 937, fr, 0.0015);
  O.priceTag.position.set(2.38, FLOOR_Y, 2.52);
  rise(O.priceTag, TR.priceTag(t) * (open ? 1 : 0));
  O.priceTag.rotation.y = -0.18;
  jit(O.priceTag, 938, fr, 0.0015);

  // Pull-tabs + tags + checkmarks
  O.tabs.forEach((tb, i) => {
    const Ti = TR.tabs[i];
    const s = Ti.slide(t);
    tb.pivot.visible = s > -0.98;
    tb.pivot.position.set(TAB_X[i], Ti.y(t), TAB_Z);
    tb.pivot.rotation.set(0, Ti.yaw(t), 0);
    tb.slide.position.set(0, 0, s);
    tb.slide.rotation.set(0, 0, 0);
    const tilt = Ti.tilt(t);
    tb.tagPivot.visible = tilt > -HP + 0.02;
    tb.tagPivot.rotation.x = tilt;
    const c = Ti.check(t);
    tb.check.visible = c > 0.01;
    tb.check.scale.setScalar(Math.max(0.001, c));
    const pulling =
      within(t, T.pull[i] - 0.02, T.pull[i] + 0.28) ||
      within(t, T.poke + i * T.pokeStep, T.poke + i * T.pokeStep + 0.36);
    jit(tb.slide, 940 + i, fr, pulling ? 0.01 : 0.001, pulling ? 0.01 : 0.001);
  });

  // ----- Act 1: Cardboard Balance Scale (H light up, C heavy down, rocking dramatically)
  O.scaleGroup.position.set(SCALE_POS.x, 0, SCALE_POS.z);
  O.scaleGroup.rotation.set(0, 0.14, 0);
  jit(O.scaleGroup, 950, fr, 0.001);
  let beamAngle = -0.24; // right side (Carbon) naturally heavier/lower
  if (within(t, T.scaleRockStart, T.scaleRockEnd)) {
    const u = (t - T.scaleRockStart) / (T.scaleRockEnd - T.scaleRockStart);
    // dramatic rocking between light H and heavy C
    beamAngle = -0.28 * Math.cos(u * Math.PI * 3.5) * (1 - 0.25 * u) - 0.08;
  } else if (t >= T.scaleRockEnd) {
    beamAngle = -0.24;
  }
  O.scaleBeam.rotation.z = beamAngle;
  O.panH.rotation.z = -beamAngle;
  O.panC.rotation.z = -beamAngle;

  const np = TR.notePos(t);
  O.note.position.set(np[0], np[1], np[2]);
  O.note.rotation.set(0, 0.14, 0);
  jit(O.note, 953, fr, within(t, T.noteSlide, T.noteRest) ? 0.008 : 0.0008);

  O.dilemmaPage.visible = t >= T.dilemmaPageIn;
  const dp = TR.dilemmaPos(t);
  O.dilemmaPage.position.set(dp[0], dp[1], dp[2]);
  O.dilemmaPage.rotation.set(0, -0.06, 0);
  jit(O.dilemmaPage, 954, fr, within(t, T.dilemmaPageIn, T.dilemmaLand + 0.06) ? 0.008 : 0.0006);
  O.mark.visible = t >= T.stampHit + 0.02;

  O.stamp.visible = within(t, T.stampIn, T.stampOut + 0.36);
  const st = TR.stampPos(t);
  O.stamp.position.set(st[0], st[1], st[2]);
  O.stamp.scale.set(1, within(t, T.stampHit, T.stampHit + 0.1) ? 0.92 : 1, 1);
  O.stamp.rotation.set(0, -0.14, 0);
  jit(O.stamp, 955, fr, 0.008);

  // ----- Act 2: Tent cards (H & C), Hero Neon Card, 5 Badges, Tally
  [O.cardH, O.cardC].forEach((c, k) => {
    const v = TR.card[k](t);
    c.pivot.visible = v > 0.004;
    c.leaf.position.set(0, 0, 0);
    c.leaf.rotation.set(-HP * (1 - v) - 0.28 * v, 0, 0);
    jit(c.leaf, 960 + k, fr, 0.0015);
  });
  const hv = TR.heroCard(t);
  O.heroCard.position.set(0, 0.08, 1.42);
  rise(O.heroCard, hv);
  jit(O.heroCard, 963, fr, 0.002);

  O.badges.forEach((b, k) => {
    const fly0 = T.badgeFly + k * T.flyStep, arr = fly0 + T.flyDur;
    b.visible = t >= T.badges[k] && t < arr;
    if (!b.visible) return;
    const pop = TR.badgePop[k](t);
    const u = clamp((t - fly0) / T.flyDur, 0, 1), eu = E.inOut(u);
    const [hx, hy, hz] = b.userData.home;
    b.position.set(lerp(hx, 0, eu), lerp(hy, 0.85, eu) + 0.72 * Math.sin(Math.PI * u), lerp(hz, 1.5, eu));
    b.rotation.set(0, 0, b.userData.roll + u * 2.2);
    b.scale.setScalar(Math.max(0.001, pop * lerp(1, 0.3, eu)));
    jit(b, 965 + k, fr, 0.006);
  });
  const strokes = T.badges.filter((tb) => t >= tb + 0.1).length;
  O.tally.material.map = O.tallyTex[strokes];
  O.tally.visible = within(t, T.badges[0] + 0.08, T.cardsDown + 0.25);

  // ----- Act 5: The flood of generic gray sheets
  O.flood.forEach((f, i) => {
    const m = f.m;
    m.visible = t >= f.t0;
    if (!m.visible) return;
    if (t < f.tLand) {
      const u = (t - f.t0) / f.dur;
      m.position.set(
        lerp(f.fromSide, f.x, u),
        lerp(0.65, f.yRest, u) + f.peak * 4 * u * (1 - u),
        lerp(1.4 + srnd(i, 51) * 1.4, f.z, u)
      );
      m.rotation.set(f.spin[0] * (1 - u), lerp(0, f.yaw, u), f.spin[1] * (1 - u) * 0.6);
      jit(m, 1000 + i, fr, 0.02);
      return;
    }
    let x = f.x, y = f.yRest, z = f.z, rx = 0, rz = 0, yaw = f.yaw;
    if (f.onBook && t >= T.burst) {
      const u = clamp((t - T.burst - (i % 5) * 0.02) / 0.44, 0, 1);
      x = lerp(f.x, f.out[0], E.out(u));
      z = lerp(f.z, f.out[1], E.out(u));
      y = lerp(f.yRest, 0.005 + (T.spitCount + i) * 0.0022, u) + 0.95 * Math.sin(Math.PI * u);
      rx = Math.sin(Math.PI * u) * srnd(i, 57) * 2.2;
      rz = Math.sin(Math.PI * u) * srnd(i, 59) * 1.4;
      yaw = f.yaw + u * srnd(i, 61) * 2;
    }
    m.position.set(x, y, z);
    m.rotation.set(rx, yaw, rz);
    if (f.onBook && within(t, T.tremble[0], T.burst)) {
      const r = clamp((t - T.tremble[0]) / (T.tremble[1] - T.tremble[0]), 0, 1);
      m.position.y += Math.max(0, srnd(i, fr, 63)) * 0.022 * r;
      m.rotation.x += srnd(i, fr, 65) * 0.035 * r;
    }
    jit(m, 1000 + i, fr, t < T.burst + 0.45 && t > T.burst ? 0.015 : 0.0006);
  });

  // ----- camera + post-process uniforms
  let k = 1;
  while (k < SHOTS.length - 1 && t >= SHOTS[k].t) k++;
  const s0 = SHOTS[k - 1], s1 = SHOTS[k];
  const u = E.sine(clamp((t - s0.t) / Math.max(1e-6, s1.t - s0.t), 0, 1));
  const tgt = s0.tgt.map((v, i) => lerp(v, s1.tgt[i], u));
  const dist = lerp(s0.dist, s1.dist, u);
  const el = lerp(s0.elev, s1.elev, u) * DEG;
  const az = lerp(s0.azim, s1.azim, u) * DEG;
  camera.position.set(
    tgt[0] + dist * Math.cos(el) * Math.sin(az),
    tgt[1] + dist * Math.sin(el),
    tgt[2] + dist * Math.cos(el) * Math.cos(az)
  );
  camera.position.x += srnd(970, fr) * 0.006 * VARS.jitter;
  camera.position.y += srnd(971, fr) * 0.004 * VARS.jitter;
  camera.lookAt(tgt[0], tgt[1], tgt[2]);
  camera.updateMatrixWorld();

  // ----- Pose Diegetic 3D Tabletop Caption Strip physically on the foreground walnut desk
  let activeCue = -1;
  if (VARS.captions) {
    for (let i = 0; i < CUES.length; i++) {
      if (t >= CUES[i].start && t <= CUES[i].end) { activeCue = i; break; }
    }
  }
  O.captionRig.visible = activeCue >= 0;
  if (activeCue >= 0) {
    const c = CUES[activeCue];
    if (O.captionMat.map !== O.captionTex[activeCue]) {
      O.captionMat.map = O.captionTex[activeCue];
      O.captionMat.needsUpdate = true;
    }
    // Cast ray from bottom-center NDC (0, -0.855) directly onto the walnut tabletop plane (y = 0.028)
    O.captionRay.setFromCamera({ x: 0, y: -0.855 }, camera);
    if (O.captionRay.ray.intersectPlane(O.captionPlane, O.captionHit)) {
      const dHit = camera.position.distanceTo(O.captionHit);
      const visSpan = 2 * dHit * Math.tan(17 * DEG);
      const scaleW = visSpan * 0.92;
      O.captionRig.position.copy(O.captionHit);
      O.captionRig.rotation.set(0, az, 0);
      O.captionRig.scale.setScalar(scaleW);

      // Stop-motion physical flip-up from the walnut table on cue entry & quick fold on exit
      const inU = clamp((t - c.start) / 0.24, 0, 1);
      const outU = clamp((c.end - t) / 0.14, 0, 1);
      const pop = activeCue === 0 && t < 0.24 ? E.out(clamp((t + 0.08) / 0.24, 0, 1)) : Math.min(E.back(inU), E.out(outU));
      // When fully up, tilt back gently toward camera lens so it reads crisply while catching overhead light
      const restTilt = -(HP - el - 0.18);
      const tilt = lerp(-HP, restTilt, clamp(pop, 0, 1.06));
      O.captionPivot.position.set(0, 0, 0);
      O.captionPivot.rotation.set(tilt, 0, srnd(activeCue, 701) * 0.015);
      jit(O.captionPivot, 980, fr, 0.0018, 0.0028);
    }
  }

  const U = post.uniforms;
  U.focusDist.value = dist;
  U.focusRange.value = 6.2;
  U.maxBlur.value = 3.1;
  U.seed.value = fr % 113;
  U.boil.value = 0.55 * VARS.boil;
  U.grain.value = 0.032 * VARS.matter;
  U.flicker.value = 1 + srnd(972, fr) * 0.014 * VARS.flicker;
  O.key.intensity = O.keyBase * (1 + srnd(973, fr) * 0.02 * VARS.flicker);
  const spot = TR.spot(t);
  O.wallLight.intensity = 2.2 * (1 - spot * 0.55);
  O.lampGlow.intensity = 2.0 * (1 + srnd(974, fr) * 0.025 * VARS.flicker);
  U.exposure.value = 1.0;
  U.vignette.value = 0.54;
  U.warmth.value = 0.32;
  if (spot > 0) {
    _v.set(0, 1.15, 1.45).project(camera);
    U.spot.value.set((_v.x + 1) / 2, (_v.y + 1) / 2, spot);
  } else {
    U.spot.value.set(0.5, 0.5, 0);
  }
}

// ================================================================= seek -> render
let ready = false, lastFrame = -1;
function renderAt(time) {
  if (!ready) return;
  const { frame, t } = frameAt(Math.max(0, time));
  if (frame === lastFrame) return;
  lastFrame = frame;
  update(t, frame);
  post.render(scene, camera);
}

window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady["gemini-neon-book"] = build().then(() => {
  buildTracks();
  ready = true;
  lastFrame = -1;
  renderAt(window.__hfThreeTime || 0);
});
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
