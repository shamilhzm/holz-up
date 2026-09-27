import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { DEFAULTS, type DeskParams } from '../model/desk'
import { suggestedHeights } from '../model/ergonomics'
import type { AssemblyStep } from '../model/types'
import { PLANED_ERROR } from '../game/build'

export interface BuildState {
  /** Params the build was started with; a design change afterwards needs a fresh start. */
  designKey: string | null
  bought: boolean
  /** Cut error in mm per cut-job key. */
  cuts: Record<string, number>
  placed: Record<string, true>
  glued: Partial<Record<AssemblyStep, true>>
  /** Granite cobbles loaded into the left and right weight box. */
  cobbles: [number, number]
  tuned: boolean
}

const EMPTY_BUILD: BuildState = { designKey: null, bought: false, cuts: {}, placed: {}, glued: {}, cobbles: [0, 0], tuned: false }

export interface AppState {
  station: number
  bodyHeight: number
  params: DeskParams
  /** Height the 3D view shows (mm). */
  height: number
  cutaway: boolean
  storeName: string
  prices: Record<string, number>
  done: Record<string, boolean>
  focusStep: string | null
  build: BuildState
  muted: boolean
  setStation: (i: number) => void
  setBodyHeight: (mm: number) => void
  setParam: <K extends keyof DeskParams>(k: K, v: DeskParams[K]) => void
  setHeight: (mm: number) => void
  setCutaway: (on: boolean) => void
  setStoreName: (s: string) => void
  setPrice: (id: string, eur: number | null) => void
  toggleDone: (id: string) => void
  setFocusStep: (id: string | null) => void
  buy: () => void
  recordCut: (key: string, errorMm: number) => void
  plane: (key: string) => void
  place: (partId: string) => void
  glue: (step: AssemblyStep) => void
  setCobbles: (side: 0 | 1, n: number) => void
  setTuned: (on: boolean) => void
  resetBuild: () => void
  setMuted: (m: boolean) => void
  load: (snapshot: Partial<AppState>) => void
}

/** localStorage can be missing or throw (private mode, previews): fail quietly. */
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}

export const designKey = (p: DeskParams) => JSON.stringify(p)

const initial = {
  station: 0,
  bodyHeight: 1750,
  params: DEFAULTS,
  height: DEFAULTS.sitHeight,
  cutaway: false,
  storeName: 'OBI',
  prices: {} as Record<string, number>,
  done: {} as Record<string, boolean>,
  focusStep: null as string | null,
  build: EMPTY_BUILD,
  muted: false,
}

export const PERSISTED = ['station', 'bodyHeight', 'params', 'storeName', 'prices', 'done', 'build', 'muted'] as const

export const useStore = create<AppState>()(
  persist(
    (set) => {
      const b = (fn: (b: BuildState) => Partial<BuildState>) => set((s) => ({ build: { ...s.build, ...fn(s.build) } }))
      return {
        ...initial,
        setStation: (station) => set({ station, focusStep: null }),
        setBodyHeight: (bodyHeight) =>
          set((s) => {
            const { sit, stand } = suggestedHeights(bodyHeight)
            return { bodyHeight, params: { ...s.params, sitHeight: sit, standHeight: stand }, height: sit }
          }),
        setParam: (k, v) =>
          set((s) => {
            const params = { ...s.params, [k]: v }
            return { params, height: Math.min(Math.max(s.height, params.sitHeight), params.standHeight + params.detentPitch) }
          }),
        setHeight: (height) => set({ height }),
        setCutaway: (cutaway) => set({ cutaway }),
        setStoreName: (storeName) => set({ storeName }),
        setPrice: (id, eur) =>
          set((s) => {
            const prices = { ...s.prices }
            if (eur === null || Number.isNaN(eur)) delete prices[id]
            else prices[id] = eur
            return { prices }
          }),
        toggleDone: (id) => set((s) => ({ done: { ...s.done, [id]: !s.done[id] } })),
        setFocusStep: (focusStep) => set({ focusStep }),
        buy: () => set((s) => ({ build: { ...EMPTY_BUILD, bought: true, designKey: designKey(s.params) } })),
        recordCut: (key, errorMm) => b((x) => ({ cuts: { ...x.cuts, [key]: errorMm } })),
        plane: (key) => b((x) => ({ cuts: { ...x.cuts, [key]: PLANED_ERROR } })),
        place: (id) => b((x) => ({ placed: { ...x.placed, [id]: true } })),
        glue: (step) => b((x) => ({ glued: { ...x.glued, [step]: true } })),
        setCobbles: (side, n) => b((x) => {
          const cobbles: [number, number] = [...x.cobbles]
          cobbles[side] = Math.max(0, n)
          return { cobbles, tuned: false }
        }),
        setTuned: (tuned) => b(() => ({ tuned })),
        resetBuild: () => set({ build: EMPTY_BUILD }),
        setMuted: (muted) => set({ muted }),
        load: (snap) => set((s) => ({ ...s, ...pick(snap), params: { ...DEFAULTS, ...snap.params }, build: { ...EMPTY_BUILD, ...snap.build } })),
      }
    },
    {
      name: 'holz-up',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => pick(s),
      // Older saves describe the previous design: keep preferences, start the design fresh.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return version < 2 ? { bodyHeight: p.bodyHeight, storeName: p.storeName, prices: p.prices } : p
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return { ...current, ...pick(p), params: { ...DEFAULTS, ...p.params }, build: { ...EMPTY_BUILD, ...p.build } }
      },
    },
  ),
)

function pick(s: Partial<AppState>): Partial<AppState> {
  const out: Record<string, unknown> = {}
  for (const k of PERSISTED) if (s[k] !== undefined) out[k] = s[k]
  return out as Partial<AppState>
}
