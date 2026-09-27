import { useMemo, useState } from 'react'
import { COBBLE_KG, geometry, parts } from '../model/desk'
import { physics, runChecks } from '../model/checks'
import { progress } from '../game/progress'
import { useStore } from '../state/store'
import { Term } from './common'

/** Most a person should push or lift with one hand. */
const MAX_HAND_KG = 12

export function SwitchTest() {
  const { params, height, setHeight, build } = useStore()
  const built = useMemo(() => progress(parts(params), build).mode === 'done', [params, build])
  const perBox = built ? ((build.cobbles[0] + build.cobbles[1]) / 2) * COBBLE_KG : undefined
  const [squeezed, setSqueezed] = useState(false)
  const [withBallast, setWithBallast] = useState(true)
  const [waxed, setWaxed] = useState(params.waxed)
  const [msg, setMsg] = useState('Locked in a detent.')

  const trial = { ...params, ballast: withBallast ? params.ballast : ('none' as const), waxed }
  const ph = physics(trial, withBallast ? perBox : 0)
  const g = geometry(params)
  // Same rule as the "No drawer jam" check: above 3× friction a real guide sticks.
  const jammed = !Number.isFinite(ph.k) || ph.k > 3
  const tooHeavyUp = ph.handUpKg > MAX_HAND_KG
  const tooHeavyDown = ph.handDownKg > MAX_HAND_KG
  const allOk = useMemo(() => runChecks(params).every((c) => c.status === 'ok'), [params])

  const release = () => {
    const nearest = g.detents.reduce((a, b) => (Math.abs(b - height) < Math.abs(a - height) ? b : a), g.detents[0])
    setHeight(nearest)
    setSqueezed(false)
    setMsg(`Click. Locked at ${nearest / 10} cm.`)
  }

  const move = (to: number) => {
    if (!squeezed) return setMsg('It is locked. Squeeze the handle first.')
    if (to === height) return setMsg(to >= g.maxHeight ? 'Already at the top detent.' : 'Already at the bottom.')
    if (jammed) return setMsg('It jams! The dry guide plus your off-centre push wedges the columns, like a stuck drawer.')
    if (to > height && tooHeavyUp) return setMsg(`Too heavy: about ${ph.handUpKg.toFixed(0)} kg with one hand. The weights are doing nothing.`)
    if (to < height && tooHeavyDown) return setMsg(`It fights you: about ${ph.handDownKg.toFixed(0)} kg to push down.`)
    setHeight(to)
    setMsg(to > height ? 'Gliding up…' : 'Gliding down…')
  }

  const force = Math.min(ph.handKg, 40)
  const color = force <= 5 ? 'var(--ok)' : force <= 10 ? 'var(--warn)' : 'var(--fail)'
  return (
    <>
      <p className="small muted">{built ? `Testing the desk you built (${build.cobbles[0]} + ${build.cobbles[1]} stones).` : 'Testing the design. Build it in the workshop to test your own work.'}</p>
      <h3>Switch test</h3>
      <div className="tools" style={{ flexWrap: 'wrap' }}>
        <button className={`btn ${squeezed ? 'on' : 'primary'}`} aria-pressed={squeezed} onClick={() => (squeezed ? release() : (setSqueezed(true), setMsg('Pawls lifted: move the top.')))}>
          {squeezed ? 'Let go of the handle' : 'Squeeze the handle'}
        </button>
        <button className="btn" onClick={() => move(Math.min(g.maxHeight, height + 25))}>▲ up</button>
        <button className="btn" onClick={() => move(Math.max(params.sitHeight, height - 25))}>▼ down</button>
      </div>
      <input type="range" min={params.sitHeight} max={g.maxHeight} value={height} onChange={(e) => move(Number(e.target.value))} aria-label="Move the top" style={{ width: '100%', accentColor: 'var(--wood)', marginTop: 10 }} />
      <p aria-live="polite" data-testid="switch-msg"><b>{msg}</b></p>

      <div className="field">
        <label>Hand force needed</label>
        <span className="val">{Number.isFinite(ph.handKg) ? `${ph.handKg.toFixed(1)} kg` : 'jammed'}</span>
      </div>
      <div className="meter"><i style={{ width: `${(100 * force) / 40}%`, background: color }} /></div>

      <h3>Try breaking it</h3>
      <div className="tools" style={{ flexWrap: 'wrap' }}>
        <button className={`btn ${withBallast ? 'on' : ''}`} aria-pressed={withBallast} onClick={() => setWithBallast(!withBallast)}>Cobblestones {withBallast ? 'in' : 'out'}</button>
        <button className={`btn ${waxed ? 'on' : ''}`} aria-pressed={waxed} onClick={() => setWaxed(!waxed)}>Guides {waxed ? 'waxed' : 'dry'}</button>
      </div>
      <p className="small">
        Without the <Term k="counterweight" /> you lift the whole top and everything on it. Without <Term k="wax" /> the push at the front edge makes the columns{' '}
        <Term k="jam" />. That one line of physics is why two-person pin designs feel so bad.
      </p>

      <h3>Sign-off · Abnahme</h3>
      <p>{allOk ? 'All checks pass with your design. Ready to build.' : 'Some checks are not green yet; go back to Design and adjust.'}</p>
      <p className="small muted">
        Reflect like in the Berichtsheft <Term k="berichtsheft" />: What did you change and why? Which check surprised you? What would you do differently on the real bench?
      </p>
    </>
  )
}
