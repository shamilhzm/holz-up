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

const sizes = (material: StockMaterial, en: string, de: string, t: number, list: number[][]) =>
  list.map(([L, W]) => panel(material, en, de, t, L, W))

export const SKUS: Sku[] = [
  ...sizes('pine18', 'Pine glued panel', 'Leimholz Kiefer', 18, [[2000, 600], [2000, 400], [2000, 300], [1200, 400], [800, 300], [800, 200]]),
  ...sizes('pine27', 'Pine glued panel', 'Leimholz Kiefer', 27, [[2000, 800], [2000, 600], [1200, 800], [1200, 300]]),
  ...sizes('beech18', 'Beech glued panel', 'Leimholz Buche', 18, [[2000, 600], [2000, 400], [1200, 400], [800, 200]]),
  ...sizes('beech20', 'Beech glued panel', 'Leimholz Buche', 20, [[2000, 800], [1600, 800], [1200, 600]]),
  ...sizes('beech27', 'Beech glued panel', 'Leimholz Buche', 27, [[2000, 800], [1600, 800], [1200, 600]]),
  ...sizes('ply6', 'Birch plywood', 'Birke-Sperrholz', 6, [[1220, 610], [610, 610]]),
  { id: 'beechRod12-1000', material: 'beechRod12', kind: 'rod', L: 1000, W: 12, t: 12, name: { en: 'Beech round rod Ø12, 1 m', de: 'Rundstab Buche Ø12, 1 m' } },
]
