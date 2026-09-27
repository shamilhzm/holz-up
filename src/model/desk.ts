import type { I18n, Part, Vec3 } from './types'

/**
 * The Holz-Up desk: a Wangentisch whose top rides on two laminated columns.
 * Each column hangs on cords over pulleys to weight boxes hidden in the end panels
 * (sash-window / counterbalanced-Smith-machine principle); gravity pawls drop into a
 * beech detent rack every `detentPitch` mm. All dimensions in mm, masses in kg.
 *
 * Axes: x = width (left/right), y = up, z = depth (+z = front, where the user stands).
 */

export type Ballast = 'granite' | 'sand' | 'none'

export interface DeskParams {
  sitHeight: number
  standHeight: number
  topLength: number
  topDepth: number
  topThickness: 18 | 27
  wangeWidth: number
  wangeDepth: number
  /** Overhang of the top beyond each end panel. */
  wangeInset: number
  footLength: number
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
  topLength: 1200,
  topDepth: 750,
  topThickness: 27,
  wangeWidth: 220,
  wangeDepth: 580,
  wangeInset: 20,
  footLength: 720,
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
  /** Finger-safe gap between batten and end panel at the lowest position. */
  pinchGap: 25,
  batten: { w: 60, h: 27 },
  lamina: 18,
  laminae: 3,
  columnZ: 84,
  rack: { t: 18, w: 40 },
  footLayer: 27,
  footLayers: 2,
  stopPad: 10,
  pulleyD: 60,
  sheaveD: 50,
  cordMin: 20,
  floorGap: 5,
  railH: 80,
  handle: { l: 320, h: 18, d: 36 },
  pawl: { h: 50, d: 40 },
} as const

export const DENSITY = { pine: 520, beech: 720 } as const // kg/m³
/** Effective kg per litre of box volume: stacked cobbles with sand in the gaps / loose sand. */
export const BALLAST_DENSITY: Record<Ballast, number> = { granite: 2.4, sand: 1.6, none: 0 }

export interface Geometry {
  footTop: number
  wangeTop: number
  wangeH: number
  interiorBottom: number
  interiorTop: number
  interiorX: number
  channelZ: number
  /** |x| of the column / end-panel centre. */
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
  kneeSpace: number
}

export function geometry(p: DeskParams): Geometry {
  const footTop = C.footLayer * C.footLayers
  const battenBottomSit = p.sitHeight - p.topThickness - C.batten.h
  const wangeTop = battenBottomSit - C.pinchGap
  const interiorBottom = footTop + C.wall
  const interiorTop = wangeTop - C.wall
  const interiorX = p.wangeWidth - 2 * C.wall
  const channelZ = (p.wangeDepth - 2 * C.wall - C.columnZ - 2 * C.wall) / 2
  const xc = p.topLength / 2 - p.wangeInset - p.wangeWidth / 2
  const colBottomSit = interiorBottom + C.stopPad
  const colLen = p.sitHeight - p.topThickness - 5 - colBottomSit
  const n = Math.max(0, Math.round((p.standHeight - p.sitHeight) / p.detentPitch))
  const detents = Array.from({ length: n + 1 }, (_, i) => p.sitHeight + i * p.detentPitch)
  const travel = n * p.detentPitch
  const pulleyY = interiorTop - C.pulleyD / 2 - 5
  const weightTravel = travel / p.tackle
  const boxTopSit = pulleyY - C.pulleyD / 2 - C.cordMin - (p.tackle === 2 ? C.sheaveD : 0)
  const boxH = boxTopSit - (interiorBottom + C.floorGap) - weightTravel
  const box: Vec3 = [interiorX - 8, boxH, channelZ - 8]
  const w = C.wall
  const boxInnerL = Math.max(0, (box[0] - 2 * w) * (box[1] - w) * (box[2] - 2 * w)) / 1e6
  return {
    footTop,
    wangeTop,
    wangeH: wangeTop - footTop,
    interiorBottom,
    interiorTop,
    interiorX,
    channelZ,
    xc,
    colBottomSit,
    colLen,
    detents,
    travel,
    maxHeight: p.sitHeight + travel,
    guideLength: wangeTop - (colBottomSit + travel),
    pulleyY,
    weightTravel,
    box,
    boxTopSit,
    boxInnerL,
    kneeSpace: p.topLength - 2 * (p.wangeInset + p.wangeWidth),
  }
}

const N = (en: string, de: string): I18n => ({ en, de })

/** Every piece except the ballast fill, positioned at sitting height. */
function baseParts(p: DeskParams): Part[] {
  const g = geometry(p)
  const out: Part[] = []
  const add = (part: Omit<Part, 'shape'> & { shape?: Part['shape'] }) =>
    out.push({ shape: 'box', ...part })
  const W = C.wall
  const iy = (g.interiorBottom + g.interiorTop) / 2
  const ih = g.interiorTop - g.interiorBottom

  for (const s of [-1, 1] as const) {
    const side = s < 0 ? 'L' : 'R'
    const xc = s * g.xc
    const outer = s * (g.xc + p.wangeWidth / 2 - W / 2)
    const inner = s * (g.xc - p.wangeWidth / 2 + W / 2)
    const wy = g.footTop + g.wangeH / 2

    // End panel (Wange) box
    add({ id: `wange-out-${side}`, kind: 'wange-side', name: N('End panel side', 'Wangen-Seite'), species: 'pine', size: [W, g.wangeH, p.wangeDepth], pos: [outer, wy, 0], grain: 'y', group: 'fixed', stock: 'pine18', skin: true })
    add({ id: `wange-in-${side}`, kind: 'wange-side', name: N('End panel side', 'Wangen-Seite'), species: 'pine', size: [W, g.wangeH, p.wangeDepth], pos: [inner, wy, 0], grain: 'y', group: 'fixed', stock: 'pine18' })
    for (const f of [-1, 1] as const) {
      add({ id: `wange-${f > 0 ? 'front' : 'back'}-${side}`, kind: 'wange-end', name: N('End panel front/back', 'Wangen-Stirnbrett'), species: 'pine', size: [g.interiorX, g.wangeH, W], pos: [xc, wy, f * (p.wangeDepth / 2 - W / 2)], grain: 'y', group: 'fixed', stock: 'pine18', dowels: 6, skin: f > 0 })
      add({ id: `divider-${f > 0 ? 'front' : 'back'}-${side}`, kind: 'divider', name: N('Guide divider', 'Trennwand (Führung)'), species: 'pine', size: [g.interiorX, ih, W], pos: [xc, iy, f * (C.columnZ / 2 + W / 2)], grain: 'y', group: 'fixed', stock: 'pine18', dowels: 4 })
    }
    add({ id: `cap-${side}`, kind: 'cap', name: N('End panel cap', 'Wangen-Deckel'), species: 'pine', size: [p.wangeWidth, W, p.wangeDepth], pos: [xc, g.wangeTop - W / 2, 0], grain: 'z', group: 'fixed', stock: 'pine18', dowels: 4 })
    add({ id: `floor-${side}`, kind: 'floor', name: N('End panel floor', 'Wangen-Boden'), species: 'pine', size: [g.interiorX, W, p.wangeDepth - 2 * W], pos: [xc, g.footTop + W / 2, 0], grain: 'z', group: 'fixed', stock: 'pine18', dowels: 4 })

    // Column sleeve: two guide walls + beech detent rack on the inner (desk-centre) side
    const colHalf = (C.lamina * C.laminae) / 2
    const rackX = xc - s * (colHalf + C.rack.t / 2 + 0.2)
    const wallNear = xc - s * (colHalf + C.rack.t + W / 2 + 0.2)
    const wallFar = xc + s * (colHalf + W / 2 + 0.2)
    add({ id: `rack-${side}`, kind: 'rack', name: N('Detent rack', 'Rastleiste'), species: 'beech', size: [C.rack.t, ih, C.rack.w], pos: [rackX, iy, 0], grain: 'y', group: 'fixed', stock: 'beech18' })
    for (const [k, x] of [['a', wallNear], ['b', wallFar]] as const) {
      add({ id: `sleeve-${k}-${side}`, kind: 'sleeve', name: N('Guide wall', 'Führungswand'), species: 'pine', size: [W, ih, C.columnZ], pos: [x, iy, 0], grain: 'y', group: 'fixed', stock: 'pine18', dowels: 4 })
    }

    // Foot runner, two glued layers
    for (let l = 0; l < C.footLayers; l++) {
      add({ id: `foot-${l}-${side}`, kind: 'foot', name: N('Foot runner layer', 'Kufe (Lage)'), species: 'pine', size: [p.wangeWidth - 40, C.footLayer, p.footLength], pos: [xc, C.footLayer * (l + 0.5), 0], grain: 'z', group: 'fixed', stock: 'pine27' })
    }

    // Pulleys over each divider, beech axles
    for (const f of [-1, 1] as const) {
      const z = f * (C.columnZ / 2 + W / 2)
      add({ id: `pulley-${f}-${side}`, kind: 'pulley', name: N('Pulley', 'Umlenkrolle'), species: 'beech', size: [W, C.pulleyD, C.pulleyD], pos: [xc, g.pulleyY, z], grain: 'z', shape: 'cylinder', group: 'fixed', stock: 'beech18' })
      add({ id: `axle-${f}-${side}`, kind: 'axle', name: N('Pulley axle Ø12', 'Rollenachse Ø12'), species: 'beech', size: [p.wangeWidth, 12, 12], pos: [xc, g.pulleyY, z], grain: 'x', shape: 'cylinder', group: 'fixed', stock: 'beechRod12' })
    }

    // Moving: laminated column, batten, pawl
    for (let l = 0; l < C.laminae; l++) {
      add({ id: `col-${l}-${side}`, kind: 'column', name: N('Column lamina', 'Säulen-Lamelle'), species: 'pine', size: [C.lamina, g.colLen, C.columnZ], pos: [xc + (l - 1) * C.lamina, g.colBottomSit + g.colLen / 2, 0], grain: 'y', group: 'moving', stock: 'pine18' })
    }
    add({ id: `batten-${side}`, kind: 'batten', name: N('Top batten', 'Gratleiste'), species: 'pine', size: [C.batten.w, C.batten.h, p.topDepth - 120], pos: [xc, p.sitHeight - p.topThickness - C.batten.h / 2, 0], grain: 'z', group: 'moving', stock: 'pine27', dowels: 2 })
    add({ id: `pawl-${side}`, kind: 'pawl', name: N('Gravity pawl', 'Sperrklinke'), species: 'beech', size: [C.rack.t, C.pawl.h, C.pawl.d], pos: [xc - s * (colHalf + 2), g.colBottomSit + 70, 0], grain: 'y', group: 'moving', stock: 'beech18' })

    // Ballast: one weight box per channel (front and back)
    for (const f of [-1, 1] as const) {
      const z = f * (C.columnZ / 2 + W + g.channelZ / 2)
      const [bx, bh, bz] = g.box
      const by = g.boxTopSit - bh / 2
      const id = `${f > 0 ? 'f' : 'b'}-${side}`
      add({ id: `box-x0-${id}`, kind: 'box-side', name: N('Weight box side', 'Gewichtskasten-Seite'), species: 'pine', size: [W, bh, bz], pos: [xc - bx / 2 + W / 2, by, z], grain: 'y', group: 'ballast', stock: 'pine18' })
      add({ id: `box-x1-${id}`, kind: 'box-side', name: N('Weight box side', 'Gewichtskasten-Seite'), species: 'pine', size: [W, bh, bz], pos: [xc + bx / 2 - W / 2, by, z], grain: 'y', group: 'ballast', stock: 'pine18' })
      add({ id: `box-z0-${id}`, kind: 'box-end', name: N('Weight box end', 'Gewichtskasten-Stirn'), species: 'pine', size: [bx - 2 * W, bh, W], pos: [xc, by, z - bz / 2 + W / 2], grain: 'y', group: 'ballast', stock: 'pine18' })
      add({ id: `box-z1-${id}`, kind: 'box-end', name: N('Weight box end', 'Gewichtskasten-Stirn'), species: 'pine', size: [bx - 2 * W, bh, W], pos: [xc, by, z + bz / 2 - W / 2], grain: 'y', group: 'ballast', stock: 'pine18' })
      add({ id: `box-floor-${id}`, kind: 'box-floor', name: N('Weight box floor', 'Gewichtskasten-Boden'), species: 'pine', size: [bx - 2 * W, W, bz - 2 * W], pos: [xc, by - bh / 2 + W / 2, z], grain: 'z', group: 'ballast', stock: 'pine18' })
      if (p.tackle === 2) {
        add({ id: `sheave-${id}`, kind: 'sheave', name: N('Running sheave', 'Lose Rolle'), species: 'beech', size: [W, C.sheaveD, C.sheaveD], pos: [xc, g.boxTopSit + C.sheaveD / 2, z], grain: 'z', shape: 'cylinder', group: 'ballast', stock: 'beech18' })
      }
    }
  }

  // Top, handle, rear foot rail (spans between the inner end panel faces)
  add({ id: 'top', kind: 'top', name: N('Desk top', 'Tischplatte'), species: 'pine', size: [p.topLength, p.topThickness, p.topDepth], pos: [0, p.sitHeight - p.topThickness / 2, 0], grain: 'x', group: 'moving', stock: 'pine27' })
  add({ id: 'handle', kind: 'handle', name: N('Release handle', 'Entriegelungsgriff'), species: 'beech', size: [C.handle.l, C.handle.h, C.handle.d], pos: [0, p.sitHeight - p.topThickness - C.handle.h / 2 - 12, p.topDepth / 2 - 50], grain: 'x', group: 'moving', stock: 'beech18' })
  const railLen = g.kneeSpace + 40
  for (let l = 0; l < 2; l++) {
    add({ id: `rail-${l}`, kind: 'rail', name: N('Rear foot rail layer', 'Fußtraverse (Lage)'), species: 'pine', size: [railLen, C.railH, C.wall], pos: [0, g.footTop + 60 + C.railH / 2, -(p.wangeDepth / 2 - 70) + (l - 0.5) * C.wall], grain: 'x', group: 'fixed', stock: 'pine18', dowels: 4 })
  }
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
    out.push({ id: b.id.replace('box-floor', 'ballast'), kind: 'ballast', name: p.ballast === 'granite' ? N('Granite cobbles', 'Granitpflaster') : N('Sand', 'Sand'), species: 'granite', size: [bx - 2 * W - 2, fillH, bz - 2 * W - 2], pos: [x, y + W / 2 + fillH / 2, z], grain: 'y', group: 'ballast', shape: 'box' })
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

export function cordEfficiency(p: DeskParams): number {
  return SHEAVE_EFF ** p.tackle
}

/** Lift (kgf at the columns) the ballast should provide: equal effort up and down. */
export function targetLiftKg(p: DeskParams): number {
  const eta = cordEfficiency(p)
  return (2 * movingMassKg(p)) / (eta + 1 / eta)
}

function boxWoodKg(p: DeskParams): number {
  return baseParts(p).filter((x) => x.group === 'ballast').reduce((s, x) => s + massKg(x), 0) / 4
}

/** Most lift the four weight boxes can give when full. */
export function liftCapacityKg(p: DeskParams): number {
  const g = geometry(p)
  const perBox = boxWoodKg(p) + g.boxInnerL * BALLAST_DENSITY[p.ballast]
  return (4 * perBox) / p.tackle
}

/** Ballast to put in each box so the top floats (capped by what fits). */
export function ballastPerBoxKg(p: DeskParams): number {
  if (p.ballast === 'none') return 0
  const g = geometry(p)
  const wanted = (targetLiftKg(p) * p.tackle) / 4 - boxWoodKg(p)
  return Math.max(0, Math.min(wanted, g.boxInnerL * BALLAST_DENSITY[p.ballast]))
}

export function actualLiftKg(p: DeskParams): number {
  return (4 * (boxWoodKg(p) + ballastPerBoxKg(p))) / p.tackle
}
