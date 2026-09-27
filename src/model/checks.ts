import {
  actualLiftKg, C, cordEfficiency, DeskParams, geometry, liftCapacityKg, massKg, movingMassKg, MU, parts, targetLiftKg,
} from './desk'
import type { I18n } from './types'

export type Status = 'ok' | 'warn' | 'fail'

export interface Check {
  id: string
  status: Status
  title: I18n
  value: string
  /** Why it matters, in plain words. */
  why: string
  /** Glossary keys. */
  terms: string[]
}

export interface Physics {
  movingKg: number
  ballastKg: number
  totalKg: number
  targetLiftKg: number
  capacityLiftKg: number
  liftKg: number
  /** Friction amplification when the hand pushes at the front edge; Infinity = jams. */
  k: number
  handUpKg: number
  handDownKg: number
  handKg: number
  wobbleMm: number
  tipKgf: number
  detentSafety: number
}

/** Beech, shear along the grain, design value (conservative). */
const BEECH_SHEAR = 4 // N/mm²
const LEAN_LOAD = 1000 // N, someone leaning on the top
const NOTCH_H = 10

export function physics(p: DeskParams): Physics {
  const g = geometry(p)
  const all = parts(p)
  const movingKg = movingMassKg(p)
  const liftKg = actualLiftKg(p)
  const ballastKg = (liftKg * p.tackle)
  const fixedKg = all.filter((x) => x.group === 'fixed').reduce((s, x) => s + massKg(x), 0)
  const totalKg = fixedKg + movingKg + ballastKg

  // Drawer effect: a hand force F at the front edge (offset e from the column axis) tilts the
  // top; the guide answers with a couple over length L, whose friction adds 2μe/L·F.
  const mu = p.waxed ? MU.waxed : MU.dry
  const e = p.topDepth / 2
  const L = g.guideLength
  const r = L > 0 ? (2 * mu * e) / L : Infinity
  const k = r < 1 ? 1 / (1 - r) : Infinity

  const eta = cordEfficiency(p)
  const up = Math.max(0, movingKg - liftKg * eta)
  const down = Math.max(0, liftKg / eta - movingKg)
  const handUpKg = up * k
  const handDownKg = down * k

  const wobbleMm = L > 0 ? (p.clearance / L) * (g.maxHeight - g.wangeTop) : Infinity
  const tipKgf = (totalKg * (p.footLength / 2)) / g.maxHeight
  const toothArea = C.rack.w * (p.detentPitch - NOTCH_H)
  const detentSafety = (2 * toothArea * BEECH_SHEAR) / LEAN_LOAD

  return {
    movingKg, ballastKg, totalKg, targetLiftKg: targetLiftKg(p), capacityLiftKg: liftCapacityKg(p), liftKg,
    k, handUpKg, handDownKg, handKg: Math.max(handUpKg, handDownKg), wobbleMm, tipKgf, detentSafety,
  }
}

const f0 = (n: number) => (Number.isFinite(n) ? n.toFixed(0) : '∞')
const f1 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '∞')
const band = (v: number, ok: number, warn: number, higherIsBetter = false): Status =>
  higherIsBetter ? (v >= ok ? 'ok' : v >= warn ? 'warn' : 'fail') : v <= ok ? 'ok' : v <= warn ? 'warn' : 'fail'

export function runChecks(p: DeskParams): Check[] {
  const g = geometry(p)
  const ph = physics(p)
  const reachOk = g.detents.length > 1 && Math.abs(g.maxHeight - p.standHeight) <= p.detentPitch / 2 && g.box[1] >= 80 && g.guideLength > 0
  return [
    {
      id: 'reach',
      status: reachOk ? 'ok' : 'fail',
      title: { en: 'Reaches both heights', de: 'Sitz- und Stehhöhe erreichbar' },
      value: `${g.detents[0]}–${g.maxHeight} mm · ${g.detents.length} detents`,
      why: 'The column must still be guided at the top detent and the weight boxes need room to travel inside the end panels.',
      terms: ['detent', 'wange'],
    },
    {
      id: 'jam',
      status: Number.isFinite(ph.k) ? band(ph.k, 2, 3) : 'fail',
      title: { en: 'No drawer jam', de: 'Kein Verkanten' },
      value: Number.isFinite(ph.k) ? `friction × ${f1(ph.k)} · guide ${f0(g.guideLength)} mm` : `jams · guide ${f0(g.guideLength)} mm`,
      why: 'You push at the front edge, off-centre from the columns, so the top wants to tilt. The guide pushes back and that creates friction, exactly like a drawer pulled at one corner. The guided length must beat 2 × friction × offset; wax lowers the friction.',
      terms: ['jam', 'guide', 'wax'],
    },
    {
      id: 'effort',
      status: band(ph.handKg, 5, 10),
      title: { en: 'One hand is enough', de: 'Einhändig verstellbar' },
      value: `≈ ${f1(ph.handKg)} kg to move (up ${f1(ph.handUpKg)} / down ${f1(ph.handDownKg)})`,
      why: 'The hidden weights carry the top and your things, like a sash window. What remains is pulley loss and imbalance, multiplied by the drawer-effect friction.',
      terms: ['counterweight', 'tackle', 'pulley'],
    },
    {
      id: 'ballast',
      status: p.ballast === 'none' ? 'fail' : ph.capacityLiftKg >= ph.targetLiftKg ? 'ok' : 'warn',
      title: { en: 'Weights fit in the end panels', de: 'Gegengewicht passt in die Wangen' },
      value: `${f1(ph.liftKg)} of ${f1(ph.targetLiftKg)} kg balanced · ${f0(ph.ballastKg)} kg ballast`,
      why: `Each end panel hides two boxes that travel ${f0(g.weightTravel)} mm. With a 2:1 tackle they move half as far but must be twice as heavy.`,
      terms: ['counterweight', 'tackle'],
    },
    {
      id: 'tip',
      status: band(ph.tipKgf, 15, 8, true),
      title: { en: 'Stable at standing height', de: 'Kippsicher in Stehhöhe' },
      value: `tips at ≈ ${f0(ph.tipKgf)} kg push on the top edge · desk ${f0(ph.totalKg)} kg`,
      why: 'Higher desks tip more easily. Long foot runners and the low ballast keep it planted.',
      terms: ['tip'],
    },
    {
      id: 'wobble',
      status: band(ph.wobbleMm, 1, 2.5),
      title: { en: 'Little wobble', de: 'Wenig Spiel' },
      value: `≈ ${f1(ph.wobbleMm)} mm at the top edge`,
      why: 'Play in the guide is amplified by the length of column sticking out. Longer guides and tighter (waxed) fits help.',
      terms: ['guide', 'clearance'],
    },
    {
      id: 'knee',
      status: band(g.kneeSpace, 700, 600, true),
      title: { en: 'Knee space', de: 'Beinraum' },
      value: `${f0(g.kneeSpace)} mm between the end panels`,
      why: 'Clear width for your legs when sitting (guideline ≥ 700 mm).',
      terms: ['knee'],
    },
    {
      id: 'detent',
      status: band(ph.detentSafety, 3, 1.5, true),
      title: { en: 'Detent holds a lean', de: 'Raste hält Abstützen aus' },
      value: `safety × ${f1(ph.detentSafety)} for 100 kg leaning`,
      why: 'The beech rack teeth must not shear off when someone leans on the desk. The notches are slightly hooked so the load pulls the pawl deeper.',
      terms: ['detent', 'pawl'],
    },
    {
      id: 'pinch',
      status: 'ok',
      title: { en: 'No finger trap', de: 'Keine Quetschstelle' },
      value: `${C.pinchGap} mm gap at the lowest position`,
      why: 'Gaps between 8 and 25 mm trap fingers. The lowest detent leaves a finger-safe gap.',
      terms: ['pinch'],
    },
  ]
}
