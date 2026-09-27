import { useMemo, useState } from 'react'
import { parts } from '../model/desk'
import { pieces, planCuts, wastePercent, type Sheet } from '../model/cutlist'
import { SKUS } from '../model/stock'
import { useStore } from '../state/store'
import { Drawings } from './Drawing'
import { Term } from './common'

type Tab = 'bom' | 'cut' | 'draw'

export function Documents() {
  const [tab, setTab] = useState<Tab>('bom')
  const params = useStore((s) => s.params)
  const all = useMemo(() => parts(params), [params])
  const plan = useMemo(() => planCuts(pieces(all), SKUS), [all])

  return (
    <>
      <div className="tabs no-print" role="tablist">
        {([['bom', 'Bill of materials · Stückliste'], ['cut', 'Cutting plan · Zuschnitt'], ['draw', 'Drawings · Zeichnungen']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`btn ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{label}</button>
        ))}
        <button className="btn" onClick={() => window.print()}>Print</button>
      </div>
      {tab === 'bom' && <Bom />}
      {tab === 'cut' && (
        <>
          <p className="small">
            {plan.sheets.length} boards · kerf {plan.kerf} mm <Term k="kerf" /> · arrows show the grain <Term k="grain" />. Many stores cut panels to size; bring this page.
          </p>
          {plan.unplaced.length > 0 && <p className="callout">Too big for any standard board: {plan.unplaced.map((p) => p.name.en).join(', ')}. Glue up from narrower boards.</p>}
          {plan.sheets.map((s, i) => <SheetView key={i} sheet={s} n={i + 1} />)}
        </>
      )}
      {tab === 'draw' && <Drawings params={params} />}
    </>
  )
}

function Bom() {
  const params = useStore((s) => s.params)
  const rows = useMemo(() => {
    const map = new Map<string, { name: { en: string; de: string }; qty: number; size: string; species: string; grain: string; stock?: string }>()
    for (const p of parts(params)) {
      if (p.kind === 'ballast') continue
      const dims = [...p.size].sort((a, b) => b - a).map((v) => Math.round(v))
      const key = `${p.kind}|${dims.join('x')}`
      const row = map.get(key) ?? { name: p.name, qty: 0, size: dims.join(' × '), species: p.species, grain: p.grain, stock: p.stock }
      row.qty++
      map.set(key, row)
    }
    return [...map.values()]
  }, [params])
  return (
    <table>
      <thead>
        <tr><th className="num">Pos</th><th>Part</th><th className="num">Qty</th><th>Size (mm)</th><th>Material</th></tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="num">{i + 1}</td>
            <td>{r.name.en}<div className="de small">{r.name.de}</div></td>
            <td className="num">{r.qty}</td>
            <td>{r.size}</td>
            <td>{r.species}{r.stock ? <div className="small muted">{r.stock.replace(/(\d+)/, ' $1 mm').replace('Rod', ' rod Ø')}</div> : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const SHORT: Record<string, string> = {
  'wange-side': 'Side', 'wange-end': 'End', cap: 'Cap', floor: 'Floor', divider: 'Divider', sleeve: 'Guide', rack: 'Rack', foot: 'Foot',
  pulley: 'Pulley', sheave: 'Sheave', axle: 'Axle', column: 'Column', batten: 'Batten', pawl: 'Pawl', top: 'Top', handle: 'Handle',
  rail: 'Rail', 'box-side': 'Box side', 'box-end': 'Box end', 'box-floor': 'Box floor',
}

function SheetView({ sheet, n }: { sheet: Sheet; n: number }) {
  const { L, W } = sheet.sku
  const rod = sheet.sku.kind === 'rod'
  const h = rod ? 60 : W
  return (
    <div className="sheet">
      <div className="small"><b>#{n}</b> {sheet.sku.name.en} <span className="muted">· {wastePercent(sheet).toFixed(0)} % offcut</span></div>
      <svg viewBox={`-10 -10 ${L + 20} ${h + 20}`} role="img" aria-label={`Cutting layout for ${sheet.sku.name.en}`}>
        <rect x={0} y={0} width={L} height={h} fill="#f3e2c3" stroke="#8a6a44" strokeWidth={3} />
        {sheet.placed.map((p, i) => {
          const w = rod ? 40 : p.piece.w
          const y = rod ? 10 : p.y
          const fs = Math.min(38, w * 0.4, p.piece.l / 6)
          return (
            <g key={i}>
              <rect x={p.x} y={y} width={p.piece.l} height={w} fill="#e2b87e" stroke="#6b4a2a" strokeWidth={2} />
              <text x={p.x + p.piece.l / 2} y={y + w / 2} fontSize={fs} textAnchor="middle" dominantBaseline="middle" fill="#3b2a1c">
                {SHORT[p.piece.kind] ?? p.piece.kind} {Math.round(p.piece.l)}×{Math.round(p.piece.w)}
              </text>
            </g>
          )
        })}
        {!rod && <path d={`M ${L - 150} ${h - 20} h 120 m -20 -10 l 20 10 l -20 10`} stroke="#8a6a44" strokeWidth={3} fill="none" />}
      </svg>
    </div>
  )
}
