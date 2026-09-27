import type { I18n, StockMaterial } from './types'

/**
 * Standard sizes a typical home-improvement store (Baumarkt) stocks. Sizes differ between
 * stores and regions, so the UI always says "check your store".
 */
export interface Sku {
  id: string
  material: StockMaterial
  name: I18n
  /** Length along the grain × width × thickness, mm. Rods: L × Ø. */
  L: number
  W: number
  t: number
  kind: 'panel' | 'rod'
}

const panel = (material: StockMaterial, en: string, de: string, t: number, L: number, W: number): Sku => ({
  id: `${material}-${L}x${W}`, material, kind: 'panel', t, L, W,
  name: { en: `${en} ${t} mm, ${L} × ${W}`, de: `${de} ${t} mm, ${L} × ${W}` },
})

export const SKUS: Sku[] = [
  ...[[2000, 600], [2000, 400], [2000, 300], [1200, 400], [800, 300], [800, 200]].map(([L, W]) =>
    panel('pine18', 'Pine glued panel', 'Leimholz Kiefer', 18, L, W)),
  ...[[2000, 800], [2000, 600], [1200, 800], [1200, 300]].map(([L, W]) =>
    panel('pine27', 'Pine glued panel', 'Leimholz Kiefer', 27, L, W)),
  ...[[2000, 300], [1000, 300], [800, 200]].map(([L, W]) =>
    panel('beech18', 'Beech glued panel', 'Leimholz Buche', 18, L, W)),
  { id: 'beechRod12-1000', material: 'beechRod12', kind: 'rod', L: 1000, W: 12, t: 12, name: { en: 'Beech round rod Ø12, 1 m', de: 'Rundstab Buche Ø12, 1 m' } },
]
