import { geometry } from '../model/desk'
import { useStore } from '../state/store'
import { Range, Term } from './common'

export function Brief() {
  const { bodyHeight, params, setBodyHeight, setHeight } = useStore()
  const g = geometry(params)
  return (
    <>
      <h3>Your heights</h3>
      <Range label="Your body height" value={bodyHeight / 10} min={145} max={205} unit="cm" onChange={(cm) => setBodyHeight(cm * 10)} />
      <p>
        Sitting <b>{params.sitHeight / 10} cm</b> · standing <b>{params.standHeight / 10} cm</b>{' '}
        <span className="muted">(you can fine-tune both in the design chapter)</span>
      </p>
      <div className="tools">
        <button className="btn" onClick={() => setHeight(params.sitHeight)}>Show sitting</button>
        <button className="btn" onClick={() => setHeight(g.maxHeight)}>Show standing</button>
      </div>
      <p className="small muted">
        Rules of thumb: seated work surface ≈ 0.41 × body height; standing ≈ elbow height minus 4 cm. Check with books under your laptop: forearms level, shoulders loose.
      </p>

      <h3>The design brief</h3>
      <ul>
        <li>About 120 × 75 cm, solid wood, soft edges, no metal hardware.</li>
        <li>Sit ↔ stand, <b>one person, one hand</b>, without clearing the desk.</li>
        <li>Everything buyable at a local DIY store.</li>
      </ul>

      <h3>The idea: a wooden Smith machine</h3>
      <p>
        Pins-in-sleeves designs need two people to lift the top dead level; tilt it and the legs jam like a drawer. So instead, the top rides on two columns inside solid{' '}
        <Term k="wange" />s, balanced by cobblestones on cords, the way a <Term k="sash" /> or a gym cable stack is balanced. Squeeze the handle, glide, let go and a{' '}
        <Term k="pawl" /> drops into the next <Term k="detent" />.
      </p>
      <div className="callout small">
        From gym benches it borrows the slightly hooked notches (load pulls the catch deeper, so it cannot release under load) and a height scale engraved on the columns.
      </div>
    </>
  )
}
