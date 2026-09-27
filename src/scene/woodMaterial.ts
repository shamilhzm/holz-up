import * as THREE from 'three'
import type { Axis, Species } from '../model/types'

/**
 * Procedural solid-wood material. The colour is computed from object-space position in mm,
 * with growth rings around a pith line that runs along the part's grain axis. Faces along the
 * grain show flat-sawn arcs, end grain shows rings, and pine gets a few knots.
 */

type WoodSpecies = Exclude<Species, 'granite'> | 'oak'

const PALETTE: Record<WoodSpecies, { early: string; late: string; knot: string; ring: number; knots: boolean }> = {
  pine: { early: '#efd7a8', late: '#c98d4c', knot: '#6a3f1d', ring: 4.5, knots: true },
  beech: { early: '#e4b890', late: '#c98e66', knot: '#8a5a3a', ring: 2.2, knots: false },
  oak: { early: '#c9a57a', late: '#9b7248', knot: '#5a3a1e', ring: 3.0, knots: false },
}

const GLSL = /* glsl */ `
uniform vec3 uEarly;
uniform vec3 uLate;
uniform vec3 uKnot;
uniform float uRing;
uniform float uAxis;
uniform vec2 uPith;
uniform float uSeed;
uniform float uOil;
uniform vec4 uKnots[3];
varying vec3 vWoodPos;

float wHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float wNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wHash(i), wHash(i + vec3(1,0,0)), f.x), mix(wHash(i + vec3(0,1,0)), wHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(wHash(i + vec3(0,0,1)), wHash(i + vec3(1,0,1)), f.x), mix(wHash(i + vec3(0,1,1)), wHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float wFbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * wNoise(p); p *= 2.03; a *= 0.5; } return s; }

vec3 woodColor(vec3 p) {
  // Grain frame: q.z runs along the fibres, q.xy is the cross-section.
  vec3 q = uAxis < 0.5 ? p.yzx : (uAxis < 1.5 ? p.zxy : p.xyz);
  vec2 c = q.xy - uPith;
  float r = length(c) + wFbm(vec3(q.xy * 0.015, q.z * 0.0025 + uSeed)) * 9.0;
  float knot = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 K = uKnots[i];
    if (K.w < 0.5) continue;
    vec3 D = normalize(vec3(cos(K.y), sin(K.y), 0.3));
    vec3 v = q - vec3(uPith, K.x);
    float t = dot(v, D);
    if (t <= 0.0) continue;
    float d = length(v - t * D);
    float rk = K.z * (2.0 + t * 0.03);
    knot = max(knot, 1.0 - smoothstep(rk * 0.7, rk, d));
    r += 16.0 * exp(-d * d / (rk * rk * 7.0));
  }
  float ring = fract(r / uRing);
  float late = smoothstep(0.55, 0.88, ring) * (1.0 - smoothstep(0.9, 1.0, ring));
  // Fade ring contrast where rings get smaller than a pixel (avoids shimmer).
  float fw = fwidth(r) / uRing;
  late = mix(0.3, late, 1.0 - smoothstep(0.2, 0.7, fw));
  vec3 col = mix(uEarly, uLate, late);
  col *= 0.9 + 0.14 * wNoise(vec3(q.xy * 0.9, q.z * 0.015 + uSeed));
  col = mix(col, uKnot, knot * 0.85);
  col = mix(col, pow(col, vec3(1.18)) * 0.93, uOil);
  return col;
}
`

function rand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

export interface WoodOptions {
  species: WoodSpecies
  grain: Axis
  /** Part size in mm (x, y, z). */
  size: [number, number, number]
  seed: number
  oiled?: boolean
}

export function makeWoodMaterial(o: WoodOptions): THREE.MeshStandardMaterial {
  const pal = PALETTE[o.species]
  const r = rand(o.seed)
  // Cross-section extents in the grain frame (see swizzle in GLSL).
  const [sx, sy, sz] = o.size
  const [a, b, len] = o.grain === 'x' ? [sy, sz, sx] : o.grain === 'y' ? [sz, sx, sy] : [sx, sy, sz]
  // Pith sits outside the board on its thin side → flat-sawn arches on the wide faces.
  const off = 60 + r() * 260
  const pith: [number, number] = a >= b ? [(r() - 0.5) * a * 0.6, -(b / 2 + off)] : [-(a / 2 + off), (r() - 0.5) * b * 0.6]
  const knots = Array.from({ length: 3 }, (_, i) => {
    const active = pal.knots && len > 300 && r() < 0.55 - i * 0.15
    const angle = Math.atan2(-pith[1], -pith[0]) + (r() - 0.5) * 0.5
    return new THREE.Vector4((r() - 0.5) * len * 0.9, angle, 0.8 + r() * 0.8, active ? 1 : 0)
  })

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: o.oiled ? 0.55 : 0.72, metalness: 0 })
  const uniforms = {
    uEarly: { value: new THREE.Color(pal.early) },
    uLate: { value: new THREE.Color(pal.late) },
    uKnot: { value: new THREE.Color(pal.knot) },
    uRing: { value: pal.ring * (0.8 + r() * 0.5) },
    uAxis: { value: o.grain === 'x' ? 0 : o.grain === 'y' ? 1 : 2 },
    uPith: { value: new THREE.Vector2(...pith) },
    uSeed: { value: r() * 50 },
    uOil: { value: o.oiled ? 1 : 0 },
    uKnots: { value: knots },
  }
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWoodPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWoodPos = position * 1000.0;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= woodColor(vWoodPos);')
  }
  mat.customProgramCacheKey = () => 'holz-wood'
  return mat
}
