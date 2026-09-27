import { useEffect, useMemo, useState } from 'react'
import { COBBLE_KG, ballastPerBoxKg, parts } from '../model/desk'
import { physics } from '../model/checks'
import { cutError, fit, grade, GRADE_TEXT, KERF, STEPS, type CutJob } from '../game/build'
import { progress, type Progress } from '../game/progress'
import { useLive } from '../game/live'
import { knock } from '../game/audio'
import { designKey, useStore } from '../state/store'
import { Term } from './common'

const f1 = (n: number) => (n > 0 ? '+' : '') + n.toFixed(1)

export function Workshop() {
  const params = useStore((s) => s.params)
  const build = useStore((s) => s.build)
  const { setStation, buy } = useStore()
  const all = useMemo(() => parts(params), [params])
  const prog = useMemo(() => progress(all, build), [all, build])

  if (!build.bought) {
    return (
      <div className="callout">
        <p>Your bench is empty. Buy the wood first.</p>
        <button className="btn primary" onClick={() => setStation(1)}>Go to the DIY store</button>
      </div>
    )
  }
  const stale = build.designKey !== designKey(params)
  return (
    <>
      {stale && (
        <div className="callout">
          <p>You changed the design after buying the wood. The parts no longer match.</p>
          <button className="btn" onClick={buy}>Start a fresh build with the new design</button>
        </div>
      )}
      <div hidden data-mode={prog.mode} data-next={nextAction(prog)} />
      <StepTrack prog={prog} />
      {prog.mode === 'cut' && prog.job && <CutHud job={prog.job} prog={prog} />}
      {prog.mode === 'assemble' && <Tray prog={prog} />}
      {prog.mode === 'tune' && <Tune />}
      {prog.mode === 'glue' && <Glue prog={prog} />}
      {prog.mode === 'done' && <Done prog={prog} />}
    </>
  )
}

/** What the player does next, exposed for automated playthroughs. */
function nextAction(prog: Progress): string {
  if (prog.mode === 'cut') return `cut|${prog.job?.key}`
  if (prog.mode === 'assemble') return `place|${prog.remaining[0]?.id}`
  if (prog.mode === 'tune') return 'tune|'
  if (prog.mode === 'glue') return `glue|${STEPS[prog.stepIndex].id}`
  return ''
}

function StepTrack({ prog }: { prog: Progress }) {
  const step = STEPS[prog.stepIndex]
  return (
    <>
      <ol className="track" aria-label="Assembly steps">
        {STEPS.map((s, i) => (
          <li key={s.id} data-state={i < prog.stepIndex ? 'done' : i === prog.stepIndex ? 'now' : 'later'} title={`${s.title.en} · ${s.title.de}`}>{i + 1}</li>
        ))}
      </ol>
      {step && (
        <>
          <h3 style={{ marginTop: 6 }}>
            Step {prog.stepIndex + 1}: {step.title.en} <span className="de">· {step.title.de}</span>
          </h3>
          <p className="small muted">{step.tip}</p>
        </>
      )}
    </>
  )
}

/** Magnified view of blade vs pencil line. */
function Loupe({ offset }: { offset: number }) {
  const px = 18
  const W = 300
  const cx = W / 2
  const x = (mm: number) => cx + mm * px
  const err = cutError(offset)
  return (
    <svg viewBox={`0 0 ${W} 86`} className="loupe" role="img" aria-label={`Blade ${f1(offset)} mm from the line`}>
      <rect x={0} y={18} width={x(0)} height={40} fill="#e8c898" />
      <rect x={x(0)} y={18} width={W - x(0)} height={40} fill="#f1dfbd" />
      {Array.from({ length: 17 }, (_, i) => i - 8).map((mm) => (
        <line key={mm} x1={x(mm)} x2={x(mm)} y1={58} y2={mm % 5 === 0 ? 70 : 64} stroke="currentColor" strokeWidth={1} />
      ))}
      <rect x={x(0.5 - KERF / 2)} y={16} width={KERF * px} height={44} fill="none" stroke="var(--ok)" strokeDasharray="3 3" strokeWidth={1.5} />
      <line x1={x(0)} x2={x(0)} y1={18} y2={58} stroke="#2d2721" strokeWidth={2} />
      <rect x={x(Math.max(-8, Math.min(8, offset)) - KERF / 2)} y={12} width={KERF * px} height={52} fill="#3a4450" opacity={0.85} />
      <text x={6} y={12} fontSize={11} fill="currentColor">part</text>
      <text x={W - 6} y={12} fontSize={11} fill="currentColor" textAnchor="end">waste</text>
      <text x={cx} y={84} fontSize={11} fill="currentColor" textAnchor="middle">
        blade {f1(offset)} mm · part {f1(err)} mm
      </text>
    </svg>
  )
}

function CutHud({ job, prog }: { job: CutJob; prog: Progress }) {
  const { bladeOffset, progress: p, phase, lastCut } = useLive()
  const recordCut = useStore((s) => s.recordCut)
  const [result, setResult] = useState<{ key: string; err: number } | null>(null)
  useEffect(() => {
    if (lastCut) setResult(lastCut)
  }, [lastCut])
  // Only show the stamp for cuts in the step you are working on.
  const lastJob = result ? prog.jobs.find((j) => j.key === result.key && j.step === job.step) : undefined
  const rest = prog.jobs.filter((j) => j.step === job.step && useStore.getState().build.cuts[j.key] === undefined)
  const hole = job.method === 'holesaw'

  const service = () => {
    // Store panel saws are accurate to about a millimetre.
    for (const j of rest) recordCut(j.key, Math.round((Math.random() * 1.6 - 0.8) * 10) / 10)
    knock(180, 0.4)
  }

  return (
    <section aria-label="Saw">
      {result && lastJob && (
        <div className={`stamp ${grade(result.err)}`} data-testid="cut-result">
          <b>{GRADE_TEXT[grade(result.err)].en}</b> <span className="de">· {GRADE_TEXT[grade(result.err)].de}</span>
          <span> {lastJob.name.en} {f1(result.err)} mm</span>
          {fit(result.err) !== 'fits' && <div className="small">{fit(result.err) === 'gap' ? 'Too short: it will leave a gap.' : 'Too long: you will plane it to fit.'}</div>}
        </div>
      )}
      <div className="job">
        <div className="eyebrow">Now cutting</div>
        <div className="big">{job.name.en}</div>
        <div className="de">{job.name.de}</div>
        <p>
          <b>{job.l} mm</b> long · {job.w} × {job.t} mm {job.species} · <b>×{job.qty}</b>
        </p>
        {job.qty > 1 && (
          <p className="small muted">
            Cut one, then the <Term k="stopblock" /> repeats it {job.qty - 1}× at the same length.
          </p>
        )}
      </div>
      {hole ? (
        <p>Hold the mouse button on the board: the hole saw cuts a {job.l} mm disc.</p>
      ) : (
        <>
          <Loupe offset={bladeOffset} />
          <ol className="small how">
            <li className={phase === 'align' ? 'now' : ''}>Move the mouse up/down to set the blade (↑/↓ = 0.1 mm). Aim half a <Term k="kerf" /> onto the <b>waste side</b>, inside the green box.</li>
            <li className={phase === 'sawing' ? 'now' : ''}>Hold the button and stroke left–right. Keep strokes level: the first ones steer the cut.</li>
          </ol>
        </>
      )}
      <div className="meter" aria-label="Cut progress"><i style={{ width: `${p * 100}%`, background: 'var(--wood)' }} /></div>
      <p className="small muted" style={{ marginTop: 14 }}>
        {rest.length} part type{rest.length === 1 ? '' : 's'} left in this step.{' '}
        <button className="linkish" onClick={service}>Let the store's panel saw cut them</button>
      </p>
    </section>
  )
}

function Tray({ prog }: { prog: Progress }) {
  const build = useStore((s) => s.build)
  const { place, plane } = useStore()
  const heldKey = useLive((s) => s.heldKey)
  const hoverSlot = useLive((s) => s.hoverSlot)
  const kinds = useMemo(() => {
    const map = new Map<string, { job: CutJob; ids: string[] }>()
    for (const p of prog.remaining) {
      const job = prog.jobOf(p.id)!
      const e = map.get(job.key) ?? { job, ids: [] }
      e.ids.push(p.id)
      map.set(job.key, e)
    }
    return [...map.values()]
  }, [prog])
  return (
    <section aria-label="Parts tray">
      <p className="small" aria-live="polite">
        {heldKey ? (hoverSlot ? <b data-testid="snap">Release to place it.</b> : 'Move it onto a glowing spot…') : 'Drag each part onto its glowing spot. It snaps when it is close.'}
      </p>
      <div className="tray">
        {kinds.map(({ job, ids }) => {
          const err = build.cuts[job.key] ?? 0
          const f = fit(err)
          const placedOne = job.partIds.some((id) => build.placed[id])
          return (
            <div key={job.key} className={`card ${heldKey === job.key ? 'held' : ''}`} data-kind={job.kind}>
              <button
                className="grab"
                disabled={f === 'long'}
                onPointerDown={(e) => {
                  e.preventDefault()
                  ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
                  useLive.getState().set({ heldKey: job.key })
                }}
                aria-label={`Pick up ${job.name.en}`}
              >
                <b>{job.name.en}</b>
                <span className="de small">{job.name.de}</span>
                <span className="small">×{ids.length} left · {f1(err)} mm</span>
              </button>
              {f === 'long' && <button className="btn" onClick={() => { plane(job.key); knock(500, 0.3) }}>Plane it to fit</button>}
              {f === 'gap' && <span className="small warn">Short: a gap will show</span>}
              {placedOne && ids.length > 0 && f !== 'long' && (
                <button className="linkish small" onClick={() => { ids.forEach(place); knock(260, 0.5) }}>Place the other {ids.length}</button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Glue({ prog }: { prog: Progress }) {
  const glue = useStore((s) => s.glue)
  const clamping = useLive((s) => s.clamping)
  const step = STEPS[prog.stepIndex]
  const start = () => {
    useLive.getState().set({ clamping: true })
    knock(120, 0.4)
    setTimeout(() => {
      useLive.getState().set({ clamping: false })
      glue(step.id)
      knock(300, 0.3)
    }, 1600)
  }
  return (
    <section>
      <p>All parts sit. Spread glue on the joints, then clamp until a thin bead squeezes out.</p>
      <button className="btn primary" onClick={start} disabled={clamping}>{clamping ? 'Glue is setting… (20 min in real life)' : 'Glue & clamp'}</button>
      <p className="small muted">Wipe squeeze-out after about 20 minutes, while it is rubbery. Wet glue smeared into the grain shows up later as a pale patch under the oil.</p>
    </section>
  )
}

function Tune() {
  const params = useStore((s) => s.params)
  const cobbles = useStore((s) => s.build.cobbles)
  const { setCobbles, setTuned } = useStore()
  const perBox = ((cobbles[0] + cobbles[1]) / 2) * COBBLE_KG
  const ph = physics(params, perBox)
  const ideal = Math.round(ballastPerBoxKg(params) / COBBLE_KG)
  const even = Math.abs(cobbles[0] - cobbles[1]) <= 1
  const ok = ph.handKg <= 5 && even
  const heavy = ph.handUpKg > ph.handDownKg
  return (
    <section aria-label="Balance">
      <p>
        Load granite cobbles (~{COBBLE_KG} kg each) into the weight boxes until the top floats. <Term k="counterweight" />
      </p>
      {(['Left', 'Right'] as const).map((label, i) => (
        <div className="field" key={label}>
          <label>{label} box</label>
          <div className="seg">
            <button onClick={() => { setCobbles(i as 0 | 1, cobbles[i] - 1); knock(180, 0.4) }} aria-label={`Remove a cobble ${label}`}>−</button>
            <button aria-pressed="false" style={{ minWidth: 70 }} data-testid={`cobbles-${i}`}>{cobbles[i]} stones</button>
            <button onClick={() => { setCobbles(i as 0 | 1, cobbles[i] + 1); knock(180, 0.5) }} aria-label={`Add a cobble ${label}`}>+</button>
          </div>
        </div>
      ))}
      <div className="field">
        <label>Hand force to move the top</label>
        <span className="val" data-testid="tune-force">{ph.handKg.toFixed(1)} kg</span>
      </div>
      <div className="meter"><i style={{ width: `${Math.min(100, (ph.handKg / 30) * 100)}%`, background: ph.handKg <= 5 ? 'var(--ok)' : ph.handKg <= 10 ? 'var(--warn)' : 'var(--fail)' }} /></div>
      <p className="small">
        {!even ? 'Keep both sides within one stone of each other, or the top racks.' : ph.handKg <= 5 ? 'It floats. One hand is enough.' : heavy ? 'The top still sinks: add stones.' : 'The stones win: the top wants to rise. Take some out.'}
      </p>
      <button className="btn primary" disabled={!ok} onClick={() => setTuned(true)}>It floats: done</button>
      <p className="small muted">Around {ideal} stones per box should do it. Real stones vary: weigh a few.</p>
    </section>
  )
}

function Done({ prog }: { prog: Progress }) {
  const build = useStore((s) => s.build)
  const setStation = useStore((s) => s.setStation)
  const errs = prog.jobs.map((j) => build.cuts[j.key] ?? 0)
  const grades = errs.map(grade)
  const count = (g: string) => grades.filter((x) => x === g).length
  const mean = errs.reduce((s, e) => s + Math.abs(e), 0) / Math.max(1, errs.length)
  return (
    <section>
      <div className="stamp perfect">
        <b>The desk stands.</b> <span className="de">· Der Tisch steht.</span>
      </div>
      <p>
        {prog.jobs.length} part types cut, average {mean.toFixed(1)} mm off. {count('perfect')} spot on, {count('good')} good, {count('ok')} usable, {count('poor')} off the line.
      </p>
      <button className="btn primary" onClick={() => setStation(3)}>On to the acceptance test</button>
    </section>
  )
}
