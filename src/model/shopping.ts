import { ballastPerBoxKg, C, COBBLE_KG, DeskParams, geometry, parts } from './desk'
import type { CutPlan } from './cutlist'
import type { I18n } from './types'

export interface ShopItem {
  id: string
  section: 'wood' | 'hardware' | 'finish' | 'ballast'
  name: I18n
  qty: number
  unit: I18n
  note?: I18n
}

const pcs = { en: 'pcs', de: 'Stk.' }
const OIL_M2_PER_L = 20
const OILED = new Set(['side', 'cap', 'top', 'drawer-front', 'plinth', 'rail', 'batten', 'column', 'handle'])

export function shoppingList(p: DeskParams, plan: CutPlan): ShopItem[] {
  const g = geometry(p)
  const all = parts(p)
  const items: ShopItem[] = []

  const bySku = new Map<string, { name: I18n; n: number }>()
  for (const s of plan.sheets) {
    const e = bySku.get(s.sku.id) ?? { name: s.sku.name, n: 0 }
    e.n++
    bySku.set(s.sku.id, e)
  }
  for (const [id, e] of bySku) items.push({ id, section: 'wood', name: e.name, qty: e.n, unit: pcs, note: { en: 'standard size — check your store', de: 'Standardmaß — im Markt prüfen' } })

  const dowels = all.reduce((s, x) => s + (x.dowels ?? 0), 0)
  items.push({ id: 'dowels', section: 'hardware', name: { en: 'Fluted beech dowels Ø8 × 40', de: 'Riffeldübel Buche Ø8 × 40' }, qty: Math.ceil(dowels * 1.1), unit: pcs })
  items.push({ id: 'glue', section: 'hardware', name: { en: 'Wood glue D3', de: 'Holzleim D3' }, qty: 1, unit: { en: 'bottle 750 g', de: 'Flasche 750 g' } })

  const cordPerLift = (g.pulleyY - g.colBottomSit) + (Math.PI * C.pulleyD) / 2 + (g.pulleyY - g.boxTopSit) * p.tackle + 200
  const releaseCord = p.topDepth / 2 + g.colLen
  const cordM = Math.ceil(((2 * cordPerLift + 2 * releaseCord) * 1.15) / 1000)
  items.push({ id: 'cord', section: 'hardware', name: { en: 'Linen or hemp cord Ø6 mm', de: 'Leinen- oder Hanfschnur Ø6 mm' }, qty: cordM, unit: { en: 'm', de: 'm' } })
  items.push({ id: 'wax', section: 'finish', name: { en: 'Paraffin / candle wax for the guides', de: 'Paraffin / Kerzenwachs für die Führungen' }, qty: 1, unit: pcs })

  const areaM2 = all.filter((x) => OILED.has(x.kind)).reduce((s, x) => {
    const [a, b, c] = x.size
    return s + (2 * (a * b + b * c + a * c)) / 1e6
  }, 0)
  const oilL = Math.ceil(((areaM2 * 2) / OIL_M2_PER_L) * 4) / 4
  items.push({ id: 'oil', section: 'finish', name: { en: 'Hardwax oil, clear', de: 'Hartwachsöl farblos' }, qty: oilL, unit: { en: 'L', de: 'L' }, note: { en: `${areaM2.toFixed(1)} m², 2 coats`, de: `${areaM2.toFixed(1)} m², 2 Anstriche` } })
  for (const grit of [80, 120, 180]) {
    items.push({ id: `sand-${grit}`, section: 'finish', name: { en: `Sandpaper grit ${grit}`, de: `Schleifpapier Körnung ${grit}` }, qty: 5, unit: { en: 'sheets', de: 'Bogen' } })
  }

  const ballastKg = 2 * ballastPerBoxKg(p)
  if (p.ballast === 'granite') {
    items.push({ id: 'cobbles', section: 'ballast', name: { en: 'Granite paving cobbles 8/10', de: 'Granitpflaster 8/10' }, qty: Math.ceil(ballastKg / COBBLE_KG), unit: pcs, note: { en: `≈ ${ballastKg.toFixed(0)} kg — weigh a few, then add or remove to tune`, de: `≈ ${ballastKg.toFixed(0)} kg — ein paar wiegen, dann zum Austarieren ergänzen` } })
    items.push({ id: 'tune-sand', section: 'ballast', name: { en: 'Play sand, small bag (fine tuning)', de: 'Spielsand, kleiner Sack (Feinabgleich)' }, qty: 1, unit: pcs })
  } else if (p.ballast === 'sand') {
    items.push({ id: 'sand', section: 'ballast', name: { en: 'Play sand 25 kg', de: 'Spielsand 25 kg' }, qty: Math.ceil(ballastKg / 25), unit: { en: 'bags', de: 'Sack' } })
  }
  return items
}
