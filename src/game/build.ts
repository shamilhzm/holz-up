import { AXIS_INDEX, type AssemblyStep, type I18n, type Part, type Species, type StockMaterial } from '../model/types'

/** Assembly order: each step first cuts its parts, then glues them in. */
export const STEPS: { id: AssemblyStep; title: I18n; glue: boolean; tip: string }[] = [
  { id: 'plinth', title: { en: 'Plinth & floor rail', de: 'Sockel & Bodentraverse' }, glue: true, tip: 'The plinth lifts the pedestals off the floor; the rear rail ties both sides together so the desk cannot rack.' },
  { id: 'carcass', title: { en: 'Pedestal boxes', de: 'Korpusse' }, glue: true, tip: 'Sides, floor, back and the two dividers that form the column guide. Glue the guide walls around a spacer: the column plus 0.4 mm.' },
  { id: 'weights', title: { en: 'Pulleys & counterweights', de: 'Rollen & Gegengewicht' }, glue: false, tip: 'The weight box hangs behind the column. Load cobbles until the top floats, like balancing a sash window.' },
  { id: 'columns', title: { en: 'Laminated columns', de: 'Säulen lamellieren' }, glue: true, tip: 'Three strips per column, growth rings alternating, so they pull against each other and stay straight.' },
  { id: 'cap', title: { en: 'Pedestal tops', de: 'Korpus-Deckel' }, glue: true, tip: 'The finger joints show end grain on both faces. That is the detail people will touch.' },
  { id: 'drawers', title: { en: 'Drawers', de: 'Schubkästen' }, glue: true, tip: 'Leave 3 mm around each drawer front so it never binds when the wood swells in summer.' },
  { id: 'top', title: { en: 'Top & release handle', de: 'Platte & Griff' }, glue: false, tip: 'Glue the battens only in the middle so the top can move with the seasons.' },
]

/** One kind of piece to cut; identical copies are cut with a stop block. */
export interface CutJob {
  key: string
  kind: string
  name: I18n
  step: AssemblyStep
  species: Exclude<Species, 'granite'>
  stock: StockMaterial
  /** Length to cut (along the grain), width, thickness in mm. */
  l: number
  w: number
  t: number
  qty: number
  method: 'saw' | 'holesaw'
  partIds: string[]
}

export function cutJobs(all: Part[]): CutJob[] {
  const map = new Map<string, CutJob>()
  for (const p of all) {
    if (!p.stock || p.species === 'granite') continue
    const g = AXIS_INDEX[p.grain]
    const l = Math.round(p.size[g])
    const [a, b] = p.size.filter((_, i) => i !== g).map(Math.round)
    const key = `${p.kind}:${l}`
    const job = map.get(key) ?? {
      key, kind: p.kind, name: p.name, step: p.step, species: p.species, stock: p.stock,
      l, w: Math.max(a, b), t: Math.min(a, b), qty: 0,
      method: p.shape === 'cylinder' && p.stock !== 'beechRod12' ? 'holesaw' : 'saw', partIds: [],
    }
    job.qty++
    job.partIds.push(p.id)
    map.set(key, job)
  }
  const order = STEPS.map((s) => s.id)
  return [...map.values()].sort((a, b) => order.indexOf(a.step) - order.indexOf(b.step))
}

/** Kerf of a Japanese pull saw. */
export const KERF = 1

/**
 * Error of the finished part in mm (+ = too long) when the blade centre sits `offset` mm from
 * the pencil line, measured towards the waste. The kerf eats half its width from the part,
 * so the right place for the blade is half a kerf on the waste side.
 */
export function cutError(offset: number): number {
  return offset - KERF / 2
}

export type Grade = 'perfect' | 'good' | 'ok' | 'poor'
export function grade(err: number): Grade {
  const a = Math.abs(err)
  return a <= 0.5 ? 'perfect' : a <= 1 ? 'good' : a <= 2 ? 'ok' : 'poor'
}

export const GRADE_TEXT: Record<Grade, I18n> = {
  perfect: { en: 'Spot on', de: 'Meisterhaft' },
  good: { en: 'Good', de: 'Gut' },
  ok: { en: 'Usable', de: 'Brauchbar' },
  poor: { en: 'Off the line', de: 'Daneben' },
}

/** Beyond ±1.5 mm a part leaves a visible gap or will not fit until it is planed. */
export function fit(err: number): 'fits' | 'gap' | 'long' {
  return err < -1.5 ? 'gap' : err > 1.5 ? 'long' : 'fits'
}

/** Kerf after planing a too-long part down: close to perfect, a hair long. */
export const PLANED_ERROR = 0.2
