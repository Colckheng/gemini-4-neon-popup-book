// handmade.js — the five GLOBAL HANDMAKE stop-motion dimensions tuned for 1080x1080 square framing:
// TIME (held-frame cadence), SPACE (seeded per-frame jitter), FORM (edge boil),
// MATTER (paper grain + DOF), LIGHT (exposure flicker + circular spotlight + tone map).
import * as THREE from "three";

// ---------- deterministic randomness ----------
export function h32(n) {
  n |= 0;
  n ^= n >>> 16; n = Math.imul(n, 0x7feb352d);
  n ^= n >>> 15; n = Math.imul(n, 0x846ca68b);
  n ^= n >>> 16;
  return n >>> 0;
}
export function rnd(...keys) {
  let h = 0x9e3779b1;
  for (const k of keys) h = h32(h ^ Math.imul((k | 0) + 0x632be5ab, 0x85ebca6b));
  return h / 4294967296;
}
export const srnd = (...keys) => rnd(...keys) * 2 - 1;

export function stream(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- TIME: irregular hand-held stop-motion cadence on a 24-unit second ----------
const CADENCES = {
  6: [4, 4, 5, 3, 4, 4],
  8: [3, 3, 4, 2, 3, 4, 3, 2],
  12: [2, 2, 3, 1, 2, 2, 2, 3, 1, 2, 2, 2],
  24: new Array(24).fill(1),
};
export function makeClock(fps) {
  const holds = CADENCES[fps] || CADENCES[12];
  const u = 1 / 24;
  return function frameAt(t) {
    const cycle = Math.floor(t);
    const rem = t - cycle;
    let acc = 0;
    for (let i = 0; i < holds.length; i++) {
      const end = (acc + holds[i]) * u;
      if (rem < end - 1e-9) return { frame: cycle * holds.length + i, t: cycle + acc * u };
      acc += holds[i];
    }
    return { frame: cycle * holds.length + holds.length - 1, t: cycle + (acc - holds[holds.length - 1]) * u };
  };
}

// ---------- post pass (1:1 square aspect aware) ----------
const POISSON = [
  [0.0, 0.0], [0.527, -0.085], [-0.04, 0.536], [-0.67, -0.179], [-0.419, -0.616], [0.44, -0.639],
  [-0.757, 0.349], [0.574, 0.685], [0.976, 0.143], [-0.2, -0.975], [0.302, 0.954], [-0.974, -0.195],
  [0.786, -0.588], [-0.566, 0.822], [0.137, -0.39], [-0.307, 0.231],
];

export function createPost(renderer, W, H) {
  const depthTexture = new THREE.DepthTexture(W, H);
  depthTexture.type = THREE.UnsignedIntType;
  const rt = new THREE.WebGLRenderTarget(W, H, {
    samples: 4,
    type: THREE.HalfFloatType,
    depthTexture,
    depthBuffer: true,
  });
  const aspect = W / H;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: rt.texture },
      tDepth: { value: depthTexture },
      resolution: { value: new THREE.Vector2(W, H) },
      aspect: { value: aspect },
      cameraNear: { value: 0.5 },
      cameraFar: { value: 90 },
      focusDist: { value: 12 },
      focusRange: { value: 6 },
      maxBlur: { value: 3.0 },
      seed: { value: 0 },
      boil: { value: 0.55 },
      grain: { value: 0.032 },
      flicker: { value: 1 },
      exposure: { value: 1 },
      vignette: { value: 0.58 },
      warmth: { value: 0.3 },
      spot: { value: new THREE.Vector3(0.5, 0.5, 0) },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 resolution;
      uniform float aspect, cameraNear, cameraFar, focusDist, focusRange, maxBlur;
      uniform float seed, boil, grain, flicker, exposure, vignette, warmth;
      uniform vec3 spot;
      varying vec2 vUv;
      const vec2 P[16] = vec2[16](${POISSON.map((p) => `vec2(${p[0].toFixed(3)},${p[1].toFixed(3)})`).join(",")});
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
      }
      float lin(float z){ float n = z*2.0-1.0; return (2.0*cameraNear*cameraFar)/(cameraFar+cameraNear-n*(cameraFar-cameraNear)); }
      vec3 neutral(vec3 c){
        const float s = 0.8 - 0.04, d = 0.15;
        float x = min(c.r, min(c.g, c.b));
        float off = x < 0.08 ? x - 6.25*x*x : 0.04; c -= off;
        float pk = max(c.r, max(c.g, c.b));
        if (pk < s) return c;
        float d2 = 1.0 - s; float np = 1.0 - d2*d2/(pk + d2 - s); c *= np/pk;
        float g = 1.0 - 1.0/(d*(pk - np) + 1.0); return mix(c, np*vec3(1.0), g);
      }
      vec3 toSRGB(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
      void main(){
        vec2 uv = vUv;
        vec2 freq = vec2(5.5 * aspect, 5.5);
        vec2 dn = vec2(vnoise(uv * freq + seed * 3.17), vnoise(uv * freq + seed * 5.71 + 17.0)) - 0.5;
        uv += dn * 2.0 * boil / resolution;
        float z = lin(texture(tDepth, uv).x);
        float coc = clamp(abs(z - focusDist) / focusRange, 0.0, 1.0);
        coc = coc * coc * maxBlur;
        vec3 col = vec3(0.0);
        float rot = hash(gl_FragCoord.xy) * 6.2831;
        mat2 R = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
        for (int i = 0; i < 16; i++) col += texture(tColor, uv + R * P[i] * coc / resolution).rgb;
        col /= 16.0;
        col *= exposure * flicker;
        col = neutral(col);
        col = toSRGB(col);
        col *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), warmth);
        vec2 q = vUv - 0.5;
        q.x *= mix(1.0, 1.25, clamp(aspect - 1.0, 0.0, 1.0));
        col *= 1.0 - vignette * dot(q, q) * 1.6;
        if (spot.z > 0.0) {
          vec2 s = (vUv - spot.xy) * vec2(aspect, 1.0);
          float m = smoothstep(0.68, 0.16, length(s));
          col *= mix(1.0, mix(0.50, 1.08, m), spot.z);
        }
        col += (hash(vUv * resolution + seed * 13.7) - 0.5) * grain;
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    uniforms: mat.uniforms,
    render(worldScene, worldCam) {
      renderer.setRenderTarget(rt);
      renderer.render(worldScene, worldCam);
      renderer.setRenderTarget(null);
      mat.uniforms.cameraNear.value = worldCam.near;
      mat.uniforms.cameraFar.value = worldCam.far;
      renderer.render(postScene, cam);
    },
  };
}
