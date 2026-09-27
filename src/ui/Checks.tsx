import { useMemo } from 'react'
import { runChecks } from '../model/checks'
import type { DeskParams } from '../model/desk'
import { Term } from './common'

export function ChecksCard({ params }: { params: DeskParams }) {
  const checks = useMemo(() => runChecks(params), [params])
  const bad = checks.filter((c) => c.status !== 'ok').length
  return (
    <section className="checks" aria-label="Engineering checks">
      <div className="eyebrow">Engineering checks · Prüfungen</div>
      <h3 style={{ marginTop: 4 }}>{bad === 0 ? 'Everything holds up.' : `${bad} thing${bad > 1 ? 's' : ''} to look at`}</h3>
      {checks.map((c) => (
        <details className="check" key={c.id} data-check={c.id} data-status={c.status}>
          <summary>
            <span className={`dot ${c.status}`} aria-label={c.status} />
            <span>
              {c.title.en} <span className="de">· {c.title.de}</span>
              <span className="v">{c.value}</span>
            </span>
          </summary>
          <div className="why">
            {c.why}
            <div className="tags">{c.terms.map((t) => <Term key={t} k={t} />)}</div>
          </div>
        </details>
      ))}
      <p className="small muted">Thresholds are workshop rules of thumb, not a certified calculation.</p>
    </section>
  )
}
