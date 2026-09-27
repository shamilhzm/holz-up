import { create } from 'zustand'

/** Transient state shared between the 3D stations and the HUD (not saved). */
export interface Live {
  /** Blade centre relative to the pencil line in mm, + = waste side. */
  bladeOffset: number
  /** 0…1 through the board. */
  progress: number
  phase: 'align' | 'sawing' | 'falling'
  /** Last finished cut, for the result card. */
  lastCut: { key: string; err: number } | null
  /** Cut-job key of the part in hand during assembly. */
  heldKey: string | null
  /** Slot the held part would snap into. */
  hoverSlot: string | null
  clamping: boolean
  set: (p: Partial<Live>) => void
}

export const useLive = create<Live>()((set) => ({
  bladeOffset: 3,
  progress: 0,
  phase: 'align',
  lastCut: null,
  heldKey: null,
  hoverSlot: null,
  clamping: false,
  set: (p) => set(p),
}))
