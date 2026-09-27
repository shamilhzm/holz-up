import { AXIS_INDEX, type I18n, type Part, type StockMaterial } from './types'
import type { Sku } from './stock'

/** A board to cut: length l runs along the grain. */
export interface Piece {
  partId: string
  kind: string
  name: I18n
  material: StockMaterial
  l: number
  w: number
  t: number
}

export interface Placed {
  piece: Piece
  /** Position on the sheet: x along its length, y across its width. */
  x: number
  y: number
}

export interface Sheet {
  sku: Sku
  placed: Placed[]
  strips: { y: number; w: number; used: number }[]
}

export interface CutPlan {
  kerf: number
  sheets: Sheet[]
  unplaced: Piece[]
}

export function pieces(all: Part[]): Piece[] {
  return all.flatMap((p) => {
    if (!p.stock) return []
    const g = AXIS_INDEX[p.grain]
    const l = p.size[g]
    const [a, b] = p.size.filter((_, i) => i !== g)
    const base = { partId: p.id, kind: p.kind, name: p.name, material: p.stock }
    if (p.stock === 'beechRod12') return [{ ...base, l, w: 12, t: 12 }]
    // Discs (pulleys) are cut from a square blank.
    if (p.shape === 'cylinder') return [{ ...base, l: Math.max(a, b, l), w: Math.max(a, b, l), t: Math.min(a, b, l) }]
    return [{ ...base, l, w: Math.max(a, b), t: Math.min(a, b) }]
  })
}

/**
 * Guillotine shelf packing: rip strips across the sheet width, crosscut pieces along each strip.
 * Big pieces first; new sheets use the smallest stock size that fits.
 */
export function planCuts(list: Piece[], skus: Sku[], kerf = 4): CutPlan {
  const sheets: Sheet[] = []
  const unplaced: Piece[] = []
  const sorted = [...list].sort((a, b) => b.w - a.w || b.l - a.l)

  sorted.forEach((piece, i) => {
    const fits = (s: Sku) => s.material === piece.material && piece.l <= s.L && piece.w <= s.W
    if (!skus.some(fits)) {
      unplaced.push(piece)
      return
    }
    if (tryPlace(piece, sheets.filter((s) => fits(s.sku)), kerf)) return
    // Open the smallest stock size that could hold everything of this material still to come,
    // else the largest one: buy a few big panels rather than many offcut-sized ones.
    const rest = sorted.slice(i).filter((p) => p.material === piece.material).reduce((s, p) => s + (p.l + kerf) * (p.w + kerf), 0)
    const options = skus.filter(fits).sort((a, b) => a.L * a.W - b.L * b.W)
    const sku = options.find((s) => s.L * s.W >= rest) ?? options[options.length - 1]
    const sheet: Sheet = { sku, placed: [], strips: [] }
    sheets.push(sheet)
    tryPlace(piece, [sheet], kerf)
  })
  return { kerf, sheets, unplaced }
}

function tryPlace(piece: Piece, sheets: Sheet[], kerf: number): boolean {
  for (const sheet of sheets) {
    const { L, W } = sheet.sku
    const rod = sheet.sku.kind === 'rod'
    for (const strip of sheet.strips) {
      const x = strip.used === 0 ? 0 : strip.used + kerf
      if ((rod || strip.w >= piece.w) && x + piece.l <= L) {
        sheet.placed.push({ piece, x, y: strip.y })
        strip.used = x + piece.l
        return true
      }
    }
    const last = sheet.strips.at(-1)
    const y = last ? last.y + last.w + kerf : 0
    if (!rod ? y + piece.w <= W : sheet.strips.length === 0) {
      sheet.strips.push({ y, w: piece.w, used: piece.l })
      sheet.placed.push({ piece, x: 0, y })
      return true
    }
  }
  return false
}

export function wastePercent(sheet: Sheet): number {
  const used = sheet.placed.reduce((s, p) => s + p.piece.l * p.piece.w, 0)
  return 100 * (1 - used / (sheet.sku.L * sheet.sku.W))
}
