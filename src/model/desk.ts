import type { I18n, Part, Species, StockMaterial, Vec3 } from './types'

/**
 * The Holz-Up desk: a floating top between two drawer pedestals. The back half of each
 * pedestal hides a laminated column in a waxed guide and a weight box of granite cobbles on
 * a cord over a pulley (sash-window / counterbalanced-Smith-machine principle). Gravity pawls
 * drop into a beech detent rack every `detentPitch` mm. The front half holds drawers.
 * All dimensions in mm, masses in kg.
 *
 * Axes: x = width (left/right), y = up, z = depth (+z = front, where the user stands).
 */

export type Ballast = 'granite' | 'sand' | 'none'
export type BodySpecies = Exclude<Species, 'granite'>

export interface DeskParams {
  sitHeight: number
  standHeight: number
  topLength: number
  topDepth: number
  topThickness: 18 | 20 | 27
  pedestalWidth: number
  pedestalDepth: number
  /** Overhang of the top beyond each pedestal. */
  pedestalInset: number
  drawers: number
  /** Wood for everything you see: pedestal shells, drawer fronts, top. */
  species: BodySpecies
  detentPitch: number
  ballast: Ballast
  /** 1 = weight hangs directly on the cord, 2 = 2:1 block and tackle (half travel, double weight). */
  tackle: 1 | 2
  /** What sits on the desk (laptop, monitor, lamp …). */
  loadKg: number
  waxed: boolean
  /** Total play of a column in its guide. */
  clearance: number
}

export const DEFAULTS: DeskParams = {
  sitHeight: 720,
  standHeight: 1065,
  topLength: 1400,
  topDepth: 700,
  topThickness: 20,
  pedestalWidth: 340,
  pedestalDepth: 600,
  pedestalInset: 10,
  drawers: 3,
  species: 'beech',
  detentPitch: 25,
  ballast: 'granite',
  tackle: 2,
  loadKg: 8,
  waxed: true,
  clearance: 0.4,
}

/** Fixed construction constants. */
export const C = {
  wall: 18,
  /** Finger-safe gap between batten and pedestal at the lowest position. */
  pinchGap: 25,
  batten: { w: 60, h: 27 },
  lamina: 18,
  laminae: 3,
  columnZ: 84,
  rack: { t: 18, w: 40 },
  plinth: { h: 60, t: 27, inset: 25 },
  stopPad: 10,
  pulleyD: 60,
  sheaveD: 50,
  cordMin: 20,
  floorGap: 5,
  drawerGap: 3,
  runner: 18,
  ply: 6,
  handle: { l: 320, h: 18, d: 36 },
  pawl: { h: 50, d: 40 },
} as const

export const DENSITY: Record<BodySpecies, number> = { pine: 520, beech: 720 } // kg/m³
/** Effective kg per litre of box volume: stacked cobbles with sand in the gaps / loose sand. */
export const BALLAST_DENSITY: Record<Ballast, number> = { granite: 2.4, sand: 1.6, none: 0 }
export const COBBLE_KG = 2.2

export interface Geometry {
  footTop: number
  pedTop: number
  pedH: number
  interiorBottom: number
  interiorTop: number
  interiorX: number
  /** Depth of the weight compartment behind the column. */
  weightZ: number
  /** Depth of the drawer compartment in front of the column. */
  drawerZ: number
  /** |x| of the column / pedestal centre. */
  xc: number
  colBottomSit: number
  colLen: number
  detents: number[]
  travel: number
  maxHeight: number
  /** Length of column still inside its guide at the highest detent. */
  guideLength: number
  pulleyY: number
  weightTravel: number
  box: Vec3
  boxTopSit: number
  /** Litres available for ballast inside one weight box. */
  boxInnerL: number
  drawerH: number
  kneeSpace: number
}

export function geometry(p: DeskParams): Geometry {
  const W = C.wall
  const footTop = C.plinth.h
  const pedTop = p.sitHeight - p.topThickness - C.batten.h - C.pinchGap
  const interiorBottom = footTop + W
  const interiorTop = pedTop - W
  const interiorX = p.pedestalWidth - 2 * W
  const half = C.columnZ / 2
  const weightZ = p.pedestalDepth / 2 - W - half - W
  const drawerZ = p.pedestalDepth / 2 - half - W
  const xc = p.topLength / 2 - p.pedestalInset - p.pedestalWidth / 2
  const colBottomSit = interiorBottom + C.stopPad
  const colLen = p.sitHeight - p.topThickness - 5 - colBottomSit
  const n = Math.max(0, Math.round((p.standHeight - p.sitHeight) / p.detentPitch))
  const detents = Array.from({ length: n + 1 }, (_, i) => p.sitHeight + i * p.detentPitch)
  const travel = n * p.detentPitch
  const pulleyY = interiorTop - C.pulleyD / 2 - 5
  const weightTravel = travel / p.tackle
  const boxTopSit = pulleyY - C.pulleyD / 2 - C.cordMin - (p.tackle === 2 ? C.sheaveD : 0)
  const boxH = boxTopSit - (interiorBottom + C.floorGap) - weightTravel
  const box: Vec3 = [interiorX - 8, boxH, weightZ - 8]
  const boxInnerL = Math.max(0, (box[0] - 2 * W) * (box[1] - W) * (box[2] - 2 * W)) / 1e6
  return {
    footTop,
    pedTop,
    pedH: pedTop - footTop,
    interiorBottom,
    interiorTop,
    interiorX,
    weightZ,
    drawerZ,
    xc,
    colBottomSit,
    colLen,
    detents,
    travel,
    maxHeight: p.sitHeight + travel,
    guideLength: pedTop - (colBottomSit + travel),
    pulleyY,
    weightTravel,
    box,
    boxTopSit,
    boxInnerL,
    drawerH: (interiorTop - interiorBottom - (p.drawers + 1) * C.drawerGap) / Math.max(1, p.drawers),
    kneeSpace: p.topLength - 2 * (p.pedestalInset + p.pedestalWidth),
  }
}

const N = (en: string, de: string): I18n => ({ en, de })

/** Visible boards use the chosen species; hidden structure is always pine. */
function visibleStock(p: DeskParams, t: 18 | 20 | 27): StockMaterial {
  if (p.species === 'pine') return t === 18 ? 'pine18' : 'pine27'
  return t === 18 ? 'beech18' : t === 20 ? 'beech20' : 'beech27'
}

/** Every piece except the ballast fill, positioned at sitting height. */
function baseParts(p: DeskParams): Part[] {
  const g = geometry(p)
  const out: Part[] = []
  const add = (part: Omit<Part, 'shape'> & { shape?: Part['shape'] }) => out.push({ shape: 'box', ...part })
  const W = C.wall
  const iy = (g.interiorBottom + g.interiorTop) / 2
  const ih = g.interiorTop - g.interiorBottom
  const sp = p.species
  const half = C.columnZ / 2

  for (const s of [-1, 1] as const) {
    const side = s < 0 ? 'L' : 'R'
    const xc = s * g.xc
    const py = g.footTop + g.pedH / 2
    const wz = -(half + W + g.weightZ / 2)

    // Plinth
    for (const k of [-1, 1] as const) {
      add({ id: `plinth-${k}-${side}`, kind: 'plinth', name: N('Plinth runner', 'Sockelleiste'), species: 'pine', size: [C.plinth.t, C.plinth.h, p.pedestalDepth - 2 * C.plinth.inset], pos: [xc + k * (p.pedestalWidth / 2 - C.plinth.inset - C.plinth.t / 2), C.plinth.h / 2, 0], grain: 'z', group: 'fixed', stock: 'pine27', step: 'plinth' })
    }

    // Carcass: sides (finger-jointed into the cap), floor, back, dividers
    add({ id: `side-out-${side}`, kind: 'side', name: N('Pedestal side', 'Korpus-Seite'), species: sp, size: [W, g.pedH, p.pedestalDepth], pos: [xc + s * (p.pedestalWidth / 2 - W / 2), py, 0], grain: 'y', group: 'fixed', stock: visibleStock(p, 18), skin: true, step: 'carcass' })
    add({ id: `side-in-${side}`, kind: 'side', name: N('Pedestal side', 'Korpus-Seite'), species: sp, size: [W, g.pedH, p.pedestalDepth], pos: [xc - s * (p.pedestalWidth / 2 - W / 2), py, 0], grain: 'y', group: 'fixed', stock: visibleStock(p, 18), step: 'carcass' })
    add({ id: `floor-${side}`, kind: 'floor', name: N('Pedestal floor', 'Korpus-Boden'), species: 'pine', size: [g.interiorX, W, p.pedestalDepth], pos: [xc, g.footTop + W / 2, 0], grain: 'x', group: 'fixed', stock: 'pine18', dowels: 6, step: 'carcass' })
    add({ id: `back-${side}`, kind: 'back', name: N('Pedestal back', 'Korpus-Rückwand'), species: 'pine', size: [g.interiorX, ih, W], pos: [xc, iy, -(p.pedestalDepth / 2 - W / 2)], grain: 'y', group: 'fixed', stock: 'pine18', dowels: 6, step: 'carcass' })
    for (const f of [-1, 1] as const) {
      add({ id: `divider-${f > 0 ? 'front' : 'back'}-${side}`, kind: 'divider', name: N('Guide divider', 'Trennwand (Führung)'), species: 'pine', size: [g.interiorX, ih, W], pos: [xc, iy, f * (half + W / 2)], grain: 'y', group: 'fixed', stock: 'pine18', dowels: 4, step: 'carcass' })
    }

    // Column guide: two guide walls + beech detent rack on the desk-centre side
    const colHalf = (C.lamina * C.laminae) / 2
    add({ id: `rack-${side}`, kind: 'rack', name: N('Detent rack', 'Rastleiste'), species: 'beech', size: [C.rack.t, ih, C.rack.w], pos: [xc - s * (colHalf + C.rack.t / 2 + 0.2), iy, 0], grain: 'y', group: 'fixed', stock: 'beech18', step: 'carcass' })
    add({ id: `guide-a-${side}`, kind: 'guide', name: N('Guide wall', 'Führungswand'), species: 'pine', size: [W, ih, C.columnZ], pos: [xc - s * (colHalf + C.rack.t + W / 2 + 0.2), iy, 0], grain: 'y', group: 'fixed', stock: 'pine18', dowels: 4, step: 'carcass' })
    add({ id: `guide-b-${side}`, kind: 'guide', name: N('Guide wall', 'Führungswand'), species: 'pine', size: [W, ih, C.columnZ], pos: [xc + s * (colHalf + W / 2 + 0.2), iy, 0], grain: 'y', group: 'fixed', stock: 'pine18', dowels: 4, step: 'carcass' })

    // Drawer runners on both inner sides, one pair per drawer
    for (let d = 0; d < p.drawers; d++) {
      const y = g.interiorBottom + C.drawerGap + d * (g.drawerH + C.drawerGap) - C.runner / 2 + 1
      for (const k of [-1, 1] as const) {
        if (d === 0) continue // bottom drawer runs on the floor
        add({ id: `runner-${d}-${k}-${side}`, kind: 'runner', name: N('Drawer runner', 'Laufleiste'), species: 'pine', size: [C.runner, C.runner, g.drawerZ - 20], pos: [xc + k * (g.interiorX / 2 - C.runner / 2), y, half + W + (g.drawerZ - 20) / 2], grain: 'z', group: 'fixed', stock: 'pine18', step: 'carcass' })
      }
    }

    // Pulley over the rear divider, weight box behind it
    add({ id: `pulley-${side}`, kind: 'pulley', name: N('Pulley', 'Umlenkrolle'), species: 'beech', size: [W, C.pulleyD, C.pulleyD], pos: [xc, g.pulleyY, -(half + W / 2)], grain: 'z', shape: 'cylinder', group: 'fixed', stock: 'beech18', step: 'weights' })
    add({ id: `axle-${side}`, kind: 'axle', name: N('Pulley axle Ø12', 'Rollenachse Ø12'), species: 'beech', size: [p.pedestalWidth, 12, 12], pos: [xc, g.pulleyY, -(half + W / 2)], grain: 'x', shape: 'cylinder', group: 'fixed', stock: 'beechRod12', step: 'weights' })
    const [bx, bh, bz] = g.box
    const by = g.boxTopSit - bh / 2
    add({ id: `box-x0-${side}`, kind: 'box-side', name: N('Weight box side', 'Gewichtskasten-Seite'), species: 'pine', size: [W, bh, bz], pos: [xc - bx / 2 + W / 2, by, wz], grain: 'y', group: 'ballast', stock: 'pine18', step: 'weights' })
    add({ id: `box-x1-${side}`, kind: 'box-side', name: N('Weight box side', 'Gewichtskasten-Seite'), species: 'pine', size: [W, bh, bz], pos: [xc + bx / 2 - W / 2, by, wz], grain: 'y', group: 'ballast', stock: 'pine18', step: 'weights' })
    add({ id: `box-z0-${side}`, kind: 'box-end', name: N('Weight box end', 'Gewichtskasten-Stirn'), species: 'pine', size: [bx - 2 * W, bh, W], pos: [xc, by, wz - bz / 2 + W / 2], grain: 'y', group: 'ballast', stock: 'pine18', step: 'weights' })
    add({ id: `box-z1-${side}`, kind: 'box-end', name: N('Weight box end', 'Gewichtskasten-Stirn'), species: 'pine', size: [bx - 2 * W, bh, W], pos: [xc, by, wz + bz / 2 - W / 2], grain: 'y', group: 'ballast', stock: 'pine18', step: 'weights' })
    add({ id: `box-floor-${side}`, kind: 'box-floor', name: N('Weight box floor', 'Gewichtskasten-Boden'), species: 'pine', size: [bx - 2 * W, W, bz - 2 * W], pos: [xc, by - bh / 2 + W / 2, wz], grain: 'x', group: 'ballast', stock: 'pine18', step: 'weights' })
    if (p.tackle === 2) {
      add({ id: `sheave-${side}`, kind: 'sheave', name: N('Running sheave', 'Lose Rolle'), species: 'beech', size: [W, C.sheaveD, C.sheaveD], pos: [xc, g.boxTopSit + C.sheaveD / 2, wz], grain: 'z', shape: 'cylinder', group: 'ballast', stock: 'beech18', step: 'weights' })
    }

    // Moving: laminated column, pawl, top batten
    for (let l = 0; l < C.laminae; l++) {
      add({ id: `col-${l}-${side}`, kind: 'column', name: N('Column lamina', 'Säulen-Lamelle'), species: 'pine', size: [C.lamina, g.colLen, C.columnZ], pos: [xc + (l - 1) * C.lamina, g.colBottomSit + g.colLen / 2, 0], grain: 'y', group: 'moving', stock: 'pine18', step: 'columns' })
    }
    add({ id: `pawl-${side}`, kind: 'pawl', name: N('Gravity pawl', 'Sperrklinke'), species: 'beech', size: [C.rack.t, C.pawl.h, C.pawl.d], pos: [xc - s * (colHalf + 2), g.colBottomSit + 70, 0], grain: 'y', group: 'moving', stock: 'beech18', step: 'columns' })
    add({ id: `batten-${side}`, kind: 'batten', name: N('Top batten', 'Gratleiste'), species: 'pine', size: [C.batten.w, C.batten.h, p.topDepth - 120], pos: [xc, p.sitHeight - p.topThickness - C.batten.h / 2, 0], grain: 'z', group: 'moving', stock: 'pine27', dowels: 2, step: 'top' })

    // Cap, finger-jointed to the sides
    add({ id: `cap-${side}`, kind: 'cap', name: N('Pedestal top', 'Korpus-Deckel'), species: sp, size: [p.pedestalWidth, W, p.pedestalDepth], pos: [xc, g.pedTop - W / 2, 0], grain: 'x', group: 'fixed', stock: visibleStock(p, 18), step: 'cap' })

    // Drawers
    const dw = g.interiorX - 2 * C.drawerGap
    const dd = g.drawerZ - 10
    for (let d = 0; d < p.drawers; d++) {
      const y0 = g.interiorBottom + C.drawerGap + d * (g.drawerH + C.drawerGap)
      const bodyH = g.drawerH - 25
      const zf = p.pedestalDepth / 2 - W / 2
      const id = `${d}-${side}`
      add({ id: `dfront-${id}`, kind: 'drawer-front', name: N('Drawer front', 'Schubkasten-Front'), species: sp, size: [dw, g.drawerH, W], pos: [xc, y0 + g.drawerH / 2, zf], grain: 'x', group: 'fixed', stock: visibleStock(p, 18), dowels: 4, step: 'drawers' })
      for (const k of [-1, 1] as const) {
        add({ id: `dside-${k}-${id}`, kind: 'drawer-side', name: N('Drawer side', 'Schubkasten-Seite'), species: 'pine', size: [W, bodyH, dd - W], pos: [xc + k * (dw / 2 - W / 2), y0 + bodyH / 2, zf - W / 2 - (dd - W) / 2], grain: 'z', group: 'fixed', stock: 'pine18', step: 'drawers' })
      }
      add({ id: `dback-${id}`, kind: 'drawer-back', name: N('Drawer back', 'Schubkasten-Rückwand'), species: 'pine', size: [dw - 2 * W, bodyH, W], pos: [xc, y0 + bodyH / 2, zf - dd + W / 2], grain: 'x', group: 'fixed', stock: 'pine18', dowels: 4, step: 'drawers' })
      add({ id: `dbottom-${id}`, kind: 'drawer-bottom', name: N('Drawer bottom, plywood', 'Schubkasten-Boden, Sperrholz'), species: 'pine', size: [dw - 2 * W, C.ply, dd - 2 * W], pos: [xc, y0 + C.ply / 2 + 8, zf - dd / 2], grain: 'z', group: 'fixed', stock: 'ply6', step: 'drawers' })
    }
  }

  // Top, release handle, rear floor rail tying the pedestals together
  add({ id: 'top', kind: 'top', name: N('Desk top', 'Tischplatte'), species: sp, size: [p.topLength, p.topThickness, p.topDepth], pos: [0, p.sitHeight - p.topThickness / 2, 0], grain: 'x', group: 'moving', stock: visibleStock(p, p.topThickness), step: 'top' })
  add({ id: 'handle', kind: 'handle', name: N('Release handle', 'Entriegelungsgriff'), species: 'beech', size: [C.handle.l, C.handle.h, C.handle.d], pos: [0, p.sitHeight - p.topThickness - C.handle.h / 2 - 12, p.topDepth / 2 - 50], grain: 'x', group: 'moving', stock: 'beech18', step: 'top' })
  add({ id: 'rail', kind: 'rail', name: N('Rear floor rail', 'Bodentraverse'), species: 'pine', size: [g.kneeSpace + 40, C.plinth.h, C.plinth.t], pos: [0, C.plinth.h / 2, -(p.pedestalDepth / 2 - 60)], grain: 'x', group: 'fixed', stock: 'pine27', dowels: 4, step: 'plinth' })
  return out
}

/** Every piece of the desk, positioned at sitting height. */
export function parts(p: DeskParams): Part[] {
  const out = baseParts(p)
  if (p.ballast === 'none') return out
  const g = geometry(p)
  const [bx, bh, bz] = g.box
  const W = C.wall
  const fillH = Math.max(0, Math.min(1, ballastPerBoxKg(p) / BALLAST_DENSITY[p.ballast] / g.boxInnerL)) * (bh - W)
  for (const b of out.filter((x) => x.kind === 'box-floor')) {
    const [x, y, z] = b.pos
    out.push({ id: b.id.replace('box-floor', 'ballast'), kind: 'ballast', name: p.ballast === 'granite' ? N('Granite cobbles', 'Granitpflaster') : N('Sand', 'Sand'), species: 'granite', size: [bx - 2 * W - 2, fillH, bz - 2 * W - 2], pos: [x, y + W / 2 + fillH / 2, z], grain: 'y', group: 'ballast', shape: 'box', step: 'weights' })
  }
  return out
}

/** Offset of a part at desk height `h` (moving parts rise, ballast sinks by travel/tackle). */
export function offsetAt(p: DeskParams, part: Part, h: number): Vec3 {
  const d = h - p.sitHeight
  if (part.group === 'moving') return [0, d, 0]
  if (part.group === 'ballast') return [0, -d / p.tackle, 0]
  return [0, 0, 0]
}

export function volumeL(part: Part): number {
  const [x, y, z] = part.size
  const v = x * y * z
  return (part.shape === 'cylinder' ? v * (Math.PI / 4) : v) / 1e6
}

export function massKg(part: Part): number {
  if (part.species === 'granite') return 0 // ballast mass is tracked separately
  return volumeL(part) * (DENSITY[part.species] / 1000)
}

/** Mass the user moves: top, battens, columns, pawls, handle, plus the load on the desk. */
export function movingMassKg(p: DeskParams): number {
  return baseParts(p).filter((x) => x.group === 'moving').reduce((s, x) => s + massKg(x), 0) + p.loadKg
}

/** Pulley efficiency per sheave (wood on a waxed wooden axle). */
export const SHEAVE_EFF = 0.95
export const MU = { waxed: 0.12, dry: 0.25 } as const
const BOXES = 2

export function cordEfficiency(p: DeskParams): number {
  return SHEAVE_EFF ** p.tackle
}

/** Lift (kgf at the columns) the ballast should provide: equal effort up and down. */
export function targetLiftKg(p: DeskParams): number {
  const eta = cordEfficiency(p)
  return (2 * movingMassKg(p)) / (eta + 1 / eta)
}

function boxWoodKg(p: DeskParams): number {
  return baseParts(p).filter((x) => x.group === 'ballast').reduce((s, x) => s + massKg(x), 0) / BOXES
}

/** Most lift the weight boxes can give when full. */
export function liftCapacityKg(p: DeskParams): number {
  const g = geometry(p)
  return (BOXES * (boxWoodKg(p) + g.boxInnerL * BALLAST_DENSITY[p.ballast])) / p.tackle
}

/** Ballast to put in each box so the top floats (capped by what fits). */
export function ballastPerBoxKg(p: DeskParams): number {
  if (p.ballast === 'none') return 0
  const g = geometry(p)
  const wanted = (targetLiftKg(p) * p.tackle) / BOXES - boxWoodKg(p)
  return Math.max(0, Math.min(wanted, g.boxInnerL * BALLAST_DENSITY[p.ballast]))
}

export function actualLiftKg(p: DeskParams, ballastPerBox = ballastPerBoxKg(p)): number {
  return (BOXES * (boxWoodKg(p) + ballastPerBox)) / p.tackle
}
