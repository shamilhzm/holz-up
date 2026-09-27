import { useMemo } from 'react'
import { parts } from '../model/desk'
import { pieces, planCuts } from '../model/cutlist'
import { SKUS } from '../model/stock'
import { shoppingList, type ShopItem } from '../model/shopping'
import { useStore } from '../state/store'
import { Term } from './common'
import { CAN_PRINT } from '../target'

const SECTIONS: [ShopItem['section'], string, string][] = [
  ['wood', 'Wood', 'Holz'],
  ['hardware', 'Joinery & cord', 'Verbindungsmittel & Seil'],
  ['finish', 'Finish', 'Oberfläche'],
  ['ballast', 'Ballast (garden aisle)', 'Ballast (Gartenabteilung)'],
]
const eur = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })

export function Material() {
  const { params, storeName, setStoreName, prices, setPrice, build, buy, setStation } = useStore()
  const items = useMemo(() => shoppingList(params, planCuts(pieces(parts(params)), SKUS)), [params])
  const priced = items.filter((i) => prices[i.id] !== undefined)
  const total = priced.reduce((s, i) => s + i.qty * prices[i.id], 0)

  return (
    <>
      <div className="field no-print">
        <label htmlFor="store">Your local DIY store</label>
        <input id="store" className="btn" style={{ width: 160 }} value={storeName} onChange={(e) => setStoreName(e.target.value)} />
      </div>
      <div className="buy">
        {build.bought ? (
          <>
            <span>✓ Wood bought and stacked to acclimatise.</span>
            <button className="btn primary" onClick={() => setStation(2)}>To the workshop</button>
          </>
        ) : (
          <button className="btn primary" onClick={buy}>Buy everything and carry it home</button>
        )}
      </div>
      <h3>Shopping list for {storeName || 'your store'}</h3>
      <table>
        <thead>
          <tr><th>Item</th><th className="num">Qty</th><th className="num">€ / unit</th><th className="num">€</th></tr>
        </thead>
        {SECTIONS.map(([sec, en, de]) => {
          const rows = items.filter((i) => i.section === sec)
          if (!rows.length) return null
          return (
            <tbody key={sec}>
              <tr><th colSpan={4}>{en} <span className="de">· {de}</span></th></tr>
              {rows.map((i) => (
                <tr key={i.id} data-item={i.id}>
                  <td>
                    {i.name.en}
                    <div className="de small">{i.name.de}{i.note ? ` · ${i.note.en}` : ''}</div>
                  </td>
                  <td className="num">{i.qty} {i.unit.en}</td>
                  <td className="num">
                    <input type="number" min={0} step={0.01} inputMode="decimal" aria-label={`Price of ${i.name.en}`} value={prices[i.id] ?? ''} onChange={(e) => setPrice(i.id, e.target.value === '' ? null : Number(e.target.value))} />
                  </td>
                  <td className="num">{prices[i.id] !== undefined ? eur(i.qty * prices[i.id]) : '—'}</td>
                </tr>
              ))}
            </tbody>
          )
        })}
        <tfoot>
          <tr>
            <th colSpan={3}>Total ({priced.length} of {items.length} priced)</th>
            <th className="num" data-testid="total">{eur(total)}</th>
          </tr>
        </tfoot>
      </table>
      {CAN_PRINT && <button className="btn no-print" style={{ marginTop: 10 }} onClick={() => window.print()}>Print list</button>}

      <h3>Why these woods</h3>
      <p>
        <Term k="kiefer" /> for the body: cheap, light, easy to work, and it glows honey-coloured with age. <Term k="buche" /> for everything that moves or
        wears: pulleys, pawls, detent racks, handle. It is harder and smoother.
      </p>
      <div className="callout small">
        Let new boards rest flat in the room for 1–2 weeks before cutting (<Term k="moisture" />). New pine is pale and darkens in daylight within months; leave the parts in a sunny spot for a few days before oiling if you want an even tone.
      </div>
    </>
  )
}
