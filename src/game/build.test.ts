import { describe, expect, it } from 'vitest'
import { DEFAULTS, parts } from '../model/desk'
import { cutError, cutJobs, fit, grade, KERF, STEPS } from './build'
import { progress } from './progress'
import type { BuildState } from '../state/store'

const empty: BuildState = { designKey: null, bought: true, cuts: {}, placed: {}, glued: {}, cobbles: [0, 0], tuned: false }

describe('cutting', () => {
  it('centring the blade on the line makes the part half a kerf short', () => {
    expect(cutError(0)).toBe(-KERF / 2)
    expect(cutError(KERF / 2)).toBe(0)
  })
  it('grades and fits by error', () => {
    expect(grade(0.3)).toBe('perfect')
    expect(grade(-1.8)).toBe('ok')
    expect(fit(-2)).toBe('gap')
    expect(fit(2)).toBe('long')
    expect(fit(1)).toBe('fits')
  })
  it('groups identical parts into one job each, in assembly order', () => {
    const all = parts(DEFAULTS)
    const jobs = cutJobs(all)
    expect(jobs.reduce((s, j) => s + j.qty, 0)).toBe(all.filter((p) => p.stock).length)
    const order = STEPS.map((s) => s.id)
    for (let i = 1; i < jobs.length; i++) expect(order.indexOf(jobs[i].step)).toBeGreaterThanOrEqual(order.indexOf(jobs[i - 1].step))
    expect(jobs.find((j) => j.kind === 'pulley')!.method).toBe('holesaw')
  })
})

describe('progress', () => {
  const all = parts(DEFAULTS)
  it('starts at the store, then cuts the first step', () => {
    expect(progress(all, { ...empty, bought: false }).mode).toBe('shop')
    const p = progress(all, empty)
    expect(p.mode).toBe('cut')
    expect(p.job!.step).toBe('plinth')
  })
  it('walks cut → assemble → glue → next step, with tuning in the weights step', () => {
    let b = { ...empty }
    const seen: string[] = []
    for (let guard = 0; guard < 400; guard++) {
      const p = progress(all, b)
      seen.push(`${STEPS[p.stepIndex]?.id ?? 'end'}:${p.mode}`)
      if (p.mode === 'done') break
      if (p.mode === 'cut') b = { ...b, cuts: { ...b.cuts, [p.job!.key]: 0 } }
      else if (p.mode === 'assemble') b = { ...b, placed: { ...b.placed, [p.remaining[0].id]: true } }
      else if (p.mode === 'tune') b = { ...b, tuned: true }
      else if (p.mode === 'glue') b = { ...b, glued: { ...b.glued, [STEPS[p.stepIndex].id]: true } }
    }
    expect(seen.at(-1)).toBe('end:done')
    expect(seen).toContain('weights:tune')
    expect(seen).toContain('carcass:glue')
    expect(seen).not.toContain('top:glue')
  })
})
