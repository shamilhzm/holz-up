import { useState, type ReactNode } from 'react'
import { GLOSSARY } from '../content/glossary'
import { MENTOR } from '../content/chapters'

/** Bilingual trade-term chip; click for the explanation. */
export function Term({ k }: { k: string }) {
  const t = GLOSSARY[k]
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  if (!t) return null
  return (
    <>
      <button
        className="term"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setPos(pos ? null : { x: Math.max(8, Math.min(r.left, window.innerWidth - 316)), y: r.bottom + 6 })
        }}
        onBlur={() => setPos(null)}
      >
        {t.en} · <em>{t.de}</em>
      </button>
      {pos && (
        <div className="popover" style={{ left: pos.x, top: pos.y }} role="tooltip">
          <b>{t.de}</b> ({t.en}): {t.explain}
        </div>
      )}
    </>
  )
}

export function Mentor({ children }: { children: ReactNode }) {
  return (
    <div className="mentor">
      <div className="face" aria-hidden>L</div>
      <div>
        <div className="who">{MENTOR}</div>
        <p>{children}</p>
      </div>
    </div>
  )
}

export function Range(props: {
  label: ReactNode
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}) {
  const { label, value, min, max, step = 1, unit = 'mm', onChange } = props
  return (
    <div className="field">
      <label>{label}</label>
      <output>{value} {unit}</output>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={typeof label === 'string' ? label : undefined} />
    </div>
  )
}

export function Seg<T extends string | number>(props: { label: ReactNode; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <label>{props.label}</label>
      <div className="seg">
        {props.options.map(([v, text]) => (
          <button key={String(v)} aria-pressed={v === props.value} onClick={() => props.onChange(v)}>{text}</button>
        ))}
      </div>
    </div>
  )
}
