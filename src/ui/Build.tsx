import { BUILD_STEPS } from '../content/chapters'
import { useStore } from '../state/store'
import { Term } from './common'

export function Build() {
  const { done, toggleDone, focusStep, setFocusStep } = useStore()
  const n = BUILD_STEPS.filter((s) => done[s.id]).length
  return (
    <>
      <p className="small">{n} of {BUILD_STEPS.length} steps done · tap a step to light up its parts</p>
      <div className="meter" aria-hidden><i style={{ width: `${(100 * n) / BUILD_STEPS.length}%` }} /></div>
      <ol className="steps">
        {BUILD_STEPS.map((s, i) => (
          <li key={s.id} className="step" data-focus={focusStep === s.id}>
            <header onClick={() => setFocusStep(focusStep === s.id ? null : s.id)}>
              <input type="checkbox" checked={!!done[s.id]} onChange={() => toggleDone(s.id)} onClick={(e) => e.stopPropagation()} aria-label={`Done: ${s.title.en}`} />
              <div>
                <b>{i + 1}. {s.title.en}</b> <span className="de">· {s.title.de}</span>
                <div className="tags">{s.lernfelder.map((l) => <span className="tag" key={l}>{l}</span>)}</div>
              </div>
            </header>
            {focusStep === s.id && (
              <>
                <p>{s.text}</p>
                <p className="small"><b>Tools:</b> {s.tools.join(', ')}</p>
                {s.safety && <p className="safety">⚠ {s.safety}</p>}
                <div className="tags">{s.terms.map((t) => <Term key={t} k={t} />)}</div>
              </>
            )}
          </li>
        ))}
      </ol>
    </>
  )
}
