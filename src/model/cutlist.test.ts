import { describe, expect, it } from 'vitest'
import { DEFAULTS, parts } from './desk'
import { pieces, planCuts } from './cutlist'
import { SKUS } from './stock'
import { shoppingList } from './shopping'

describe('cut list', () => {
  const list = pieces(parts(DEFAULTS))
  const plan = planCuts(list, SKUS)

  it('places every piece', () => {
    expect(plan.unplaced).toEqual([])
    expect(plan.sheets.flatMap((s) => s.placed)).toHaveLength(list.length)
  })
  it('keeps pieces on their sheet, matching thickness, without overlaps', () => {
    for (const s of plan.sheets) {
      for (const p of s.placed) {
        expect(p.piece.material).toBe(s.sku.material)
        expect(p.x + p.piece.l).toBeLessThanOrEqual(s.sku.L)
        if (s.sku.kind === 'panel') expect(p.y + p.piece.w).toBeLessThanOrEqual(s.sku.W)
      }
      for (const a of s.placed) for (const b of s.placed) {
        if (a === b) continue
        const apart = a.x + a.piece.l + plan.kerf <= b.x || b.x + b.piece.l + plan.kerf <= a.x ||
          a.y + a.piece.w + plan.kerf <= b.y || b.y + b.piece.w + plan.kerf <= a.y
        expect(apart).toBe(true)
      }
    }
  })
  it('reports pieces that fit no stock size', () => {
    const huge = planCuts(pieces(parts({ ...DEFAULTS, topLength: 2600 })), SKUS)
    expect(huge.unplaced.map((p) => p.kind)).toContain('top')
  })
  it('shopping list covers wood, cord and ballast', () => {
    const items = shoppingList(DEFAULTS, plan)
    expect(items.filter((i) => i.section === 'wood').reduce((s, i) => s + i.qty, 0)).toBe(plan.sheets.length)
    expect(items.find((i) => i.id === 'cobbles')!.qty).toBeGreaterThan(10)
    expect(items.find((i) => i.id === 'cord')!.qty).toBeGreaterThan(4)
  })
})
