export type Vec3 = [number, number, number]
export type Axis = 'x' | 'y' | 'z'
export type Species = 'pine' | 'beech' | 'granite'
export type Group = 'fixed' | 'moving' | 'ballast'
export type StockMaterial = 'pine18' | 'pine27' | 'beech18' | 'beechRod12'

export interface I18n {
  en: string
  de: string
}

/** One physical piece of the desk. All sizes in mm; `pos` is the box centre at sitting height. */
export interface Part {
  id: string
  /** Groups identical pieces in the Stückliste. */
  kind: string
  name: I18n
  species: Species
  size: Vec3
  pos: Vec3
  /** Axis the fibres run along. */
  grain: Axis
  group: Group
  shape: 'box' | 'cylinder'
  /** Where it is cut from; undefined = not cut from stock (e.g. granite). */
  stock?: StockMaterial
  /** Hidden when the cutaway view is on. */
  skin?: boolean
  dowels?: number
}

export const AXIS_INDEX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 }
