import { describe, expect, it } from 'vitest'
import { actualLiftKg, DEFAULTS, geometry, liftCapacityKg, movingMassKg, offsetAt, parts } from './desk'
import { physics, runChecks } from './checks'
import { suggestedHeights } from './ergonomics'

const status = (p = DEFAULTS) => Object.fromEntries(runChecks(p).map((c) => [c.id, c.status]))

describe('ergonomics', () => {
  it('suggests ~72 / ~106 cm for a 175 cm person', () => {
    expect(suggestedHeights(1750)).toEqual({ sit: 720, stand: 1065 })
  })
})

describe('geometry', () => {
  const g = geometry(DEFAULTS)
  it('detents run from sitting height in 25 mm steps to within half a step of standing height', () => {
    expect(g.detents[0]).toBe(720)
    expect(g.detents[1] - g.detents[0]).toBe(25)
    expect(Math.abs(g.maxHeight - DEFAULTS.standHeight)).toBeLessThanOrEqual(12.5)
  })
  it('leaves a finger-safe gap between batten and end panel at sitting height', () => {
    const batten = parts(DEFAULTS).find((x) => x.id === 'batten-L')!
    expect(batten.pos[1] - batten.size[1] / 2 - g.pedTop).toBe(25)
  })
  it('keeps the column inside its guide at the top detent', () => {
    expect(g.guideLength).toBeGreaterThan(150)
  })
  it('weight boxes never hit the pedestal floor', () => {
    expect(g.boxTopSit - g.box[1] - g.weightTravel).toBeGreaterThanOrEqual(g.interiorBottom)
  })
})

describe('parts', () => {
  const all = parts(DEFAULTS)
  it('have unique ids and positive sizes', () => {
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length)
    for (const x of all) expect(Math.min(...x.size)).toBeGreaterThan(0)
  })
  it('moving parts rise with the top, ballast sinks by travel / tackle', () => {
    const top = all.find((x) => x.id === 'top')!
    const box = all.find((x) => x.kind === 'box-floor')!
    expect(offsetAt(DEFAULTS, top, 1070)[1]).toBe(350)
    expect(offsetAt(DEFAULTS, box, 1070)[1]).toBe(-175)
  })
})

describe('balance and checks', () => {
  it('default design passes every check', () => {
    expect(Object.values(status()).every((s) => s === 'ok')).toBe(true)
  })
  it('ballast balances the moving mass', () => {
    const ph = physics(DEFAULTS)
    expect(liftCapacityKg(DEFAULTS)).toBeGreaterThanOrEqual(ph.targetLiftKg)
    expect(actualLiftKg(DEFAULTS)).toBeCloseTo(ph.targetLiftKg, 5)
    expect(ph.handKg).toBeLessThan(5)
  })
  it('without ballast one person cannot lift it comfortably', () => {
    const p = { ...DEFAULTS, ballast: 'none' as const }
    expect(status(p).effort).toBe('fail')
    expect(physics(p).handKg).toBeGreaterThan(movingMassKg(p))
  })
  it('dry guides make the top jam like a drawer', () => {
    expect(status({ ...DEFAULTS, waxed: false }).jam).toBe('fail')
  })
  it('a very deep top jams even when waxed', () => {
    expect(physics({ ...DEFAULTS, topDepth: 2000 }).k).toBe(Infinity)
  })
  it('sand is too light for the end panels', () => {
    expect(status({ ...DEFAULTS, ballast: 'sand' }).ballast).toBe('warn')
  })
  it('wide pedestals steal knee space', () => {
    expect(status({ ...DEFAULTS, pedestalWidth: 450 }).knee).toBe('fail')
  })
  it('shallow pedestals make it tippy', () => {
    expect(physics({ ...DEFAULTS, pedestalDepth: 400 }).tipKgf).toBeLessThan(physics(DEFAULTS).tipKgf)
  })
  it('a thick beech top outgrows the ballast', () => {
    expect(status({ ...DEFAULTS, topThickness: 27 }).effort).not.toBe('ok')
  })
  it('every part belongs to an assembly step', () => {
    for (const x of parts(DEFAULTS)) expect(x.step).toBeTruthy()
  })
  it('player-loaded ballast changes the hand force', () => {
    expect(physics(DEFAULTS, 0).handKg).toBeGreaterThan(20)
  })
})
