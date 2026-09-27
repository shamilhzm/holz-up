import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { DEFAULTS, type DeskParams } from '../model/desk'
import { suggestedHeights } from '../model/ergonomics'

export interface AppState {
  chapter: number
  bodyHeight: number
  params: DeskParams
  /** Height the 3D view shows (mm). */
  height: number
  cutaway: boolean
  storeName: string
  prices: Record<string, number>
  done: Record<string, boolean>
  focusStep: string | null
  setChapter: (i: number) => void
  setBodyHeight: (mm: number) => void
  setParam: <K extends keyof DeskParams>(k: K, v: DeskParams[K]) => void
  setHeight: (mm: number) => void
  setCutaway: (on: boolean) => void
  setStoreName: (s: string) => void
  setPrice: (id: string, eur: number | null) => void
  toggleDone: (id: string) => void
  setFocusStep: (id: string | null) => void
  load: (snapshot: Partial<AppState>) => void
  reset: () => void
}

/** localStorage can be missing or throw (private mode, previews): fail quietly. */
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}

const initial = {
  chapter: 0,
  bodyHeight: 1750,
  params: DEFAULTS,
  height: DEFAULTS.sitHeight,
  cutaway: false,
  storeName: 'OBI',
  prices: {} as Record<string, number>,
  done: {} as Record<string, boolean>,
  focusStep: null as string | null,
}

export const PERSISTED = ['chapter', 'bodyHeight', 'params', 'storeName', 'prices', 'done'] as const

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initial,
      setChapter: (chapter) => set({ chapter, focusStep: null }),
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
      load: (snap) => set((s) => ({ ...s, ...pick(snap), params: { ...DEFAULTS, ...snap.params } })),
      reset: () => set({ ...initial }),
    }),
    {
      name: 'holz-up',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => pick(s),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return { ...current, ...pick(p), params: { ...DEFAULTS, ...p.params } }
      },
    },
  ),
)

function pick(s: Partial<AppState>): Partial<AppState> {
  const out: Record<string, unknown> = {}
  for (const k of PERSISTED) if (s[k] !== undefined) out[k] = s[k]
  return out as Partial<AppState>
}
