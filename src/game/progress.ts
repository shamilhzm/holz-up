import type { Part } from '../model/types'
import type { BuildState } from '../state/store'
import { cutJobs, fit, STEPS, type CutJob } from './build'

export type Mode = 'shop' | 'cut' | 'assemble' | 'tune' | 'glue' | 'done'

export interface Progress {
  mode: Mode
  stepIndex: number
  job?: CutJob
  /** Parts of the current step still to be placed. */
  remaining: Part[]
  jobs: CutJob[]
  jobOf: (partId: string) => CutJob | undefined
}

/** Parts the player places by hand (the ballast is loaded in the tuning step instead). */
export const placeable = (p: Part) => p.kind !== 'ballast'

export function progress(all: Part[], build: BuildState): Progress {
  const jobs = cutJobs(all)
  const byPart = new Map(jobs.flatMap((j) => j.partIds.map((id) => [id, j] as const)))
  const jobOf = (id: string) => byPart.get(id)
  const base = { jobs, jobOf }
  if (!build.bought) return { ...base, mode: 'shop', stepIndex: 0, remaining: [] }
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i]
    const job = jobs.find((j) => j.step === step.id && build.cuts[j.key] === undefined)
    if (job) return { ...base, mode: 'cut', stepIndex: i, job, remaining: [] }
    const remaining = all.filter((p) => p.step === step.id && placeable(p) && !build.placed[p.id])
    if (remaining.length) return { ...base, mode: 'assemble', stepIndex: i, remaining }
    if (step.id === 'weights' && !build.tuned) return { ...base, mode: 'tune', stepIndex: i, remaining }
    if (step.glue && !build.glued[step.id]) return { ...base, mode: 'glue', stepIndex: i, remaining }
  }
  return { ...base, mode: 'done', stepIndex: STEPS.length, remaining: [] }
}

/** How a part will sit given how accurately it was cut. */
export function partFit(build: BuildState, job: CutJob | undefined) {
  const err = job ? build.cuts[job.key] ?? 0 : 0
  return { err, fit: fit(err) }
}
