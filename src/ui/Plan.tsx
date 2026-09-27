import { geometry } from '../model/desk'
import { physics } from '../model/checks'
import { useStore } from '../state/store'
import { Range, Seg, Term } from './common'

/** Drafting table: body height → heights, then shape the desk. */
export function Plan() {
  const { bodyHeight, params: p, setBodyHeight, setParam, setHeight } = useStore()
  const g = geometry(p)
  const ph = physics(p)
  return (
    <>
      <Range label="Your body height" value={bodyHeight / 10} min={145} max={205} unit="cm" onChange={(cm) => setBodyHeight(cm * 10)} />
      <p className="small">
        Sitting <b>{p.sitHeight / 10} cm</b> · standing <b>{g.maxHeight / 10} cm</b> in {g.detents.length} detents.{' '}
        <button className="linkish" onClick={() => setHeight(p.sitHeight)}>Show sitting</button> ·{' '}
        <button className="linkish" onClick={() => setHeight(g.maxHeight)}>Show standing</button>
      </p>
      <p className="small muted">
        Moving mass {ph.movingKg.toFixed(0)} kg (incl. {p.loadKg} kg on the desk) · hidden ballast {ph.ballastKg.toFixed(0)} kg · desk {ph.totalKg.toFixed(0)} kg
      </p>

      <details open>
        <summary><h3 style={{ display: 'inline' }}>Heights & top</h3></summary>
        <Range label="Sitting height" value={p.sitHeight} min={620} max={800} step={5} onChange={(v) => setParam('sitHeight', v)} />
        <Range label="Standing height" value={p.standHeight} min={900} max={1250} step={5} onChange={(v) => setParam('standHeight', v)} />
        <Range label="Top length" value={p.topLength} min={1100} max={1800} step={10} onChange={(v) => setParam('topLength', v)} />
        <Range label="Top depth" value={p.topDepth} min={600} max={850} step={10} onChange={(v) => setParam('topDepth', v)} />
        <Seg label="Top thickness" value={p.topThickness} options={[[18, '18'], [20, '20'], [27, '27 mm']]} onChange={(v) => setParam('topThickness', v)} />
        <Seg label={<>Wood you see <Term k="buche" /></>} value={p.species} options={[['beech', 'Beech'], ['pine', 'Pine']]} onChange={(v) => setParam('species', v)} />
      </details>
      <details>
        <summary><h3 style={{ display: 'inline' }}>Pedestals & drawers</h3></summary>
        <Range label={<>Pedestal width <Term k="pedestal" /></>} value={p.pedestalWidth} min={260} max={460} step={10} onChange={(v) => setParam('pedestalWidth', v)} />
        <Range label="Pedestal depth" value={p.pedestalDepth} min={420} max={Math.min(600, p.topDepth)} step={10} onChange={(v) => setParam('pedestalDepth', v)} />
        <Seg label="Drawers per pedestal" value={p.drawers} options={[[2, '2'], [3, '3'], [4, '4']]} onChange={(v) => setParam('drawers', v)} />
      </details>
      <details>
        <summary><h3 style={{ display: 'inline' }}>Balance & sliding</h3></summary>
        <Seg label={<>Ballast <Term k="counterweight" /></>} value={p.ballast} options={[['granite', 'Granite'], ['sand', 'Sand'], ['none', 'None']]} onChange={(v) => setParam('ballast', v)} />
        <Seg label={<>Cord <Term k="tackle" /></>} value={p.tackle} options={[[1, '1:1'], [2, '2:1']]} onChange={(v) => setParam('tackle', v)} />
        <Range label="Load on the desk" value={p.loadKg} min={0} max={25} unit="kg" onChange={(v) => setParam('loadKg', v)} />
        <Seg label={<>Guides <Term k="wax" /></>} value={p.waxed ? 'wax' : 'dry'} options={[['wax', 'Waxed'], ['dry', 'Dry']]} onChange={(v) => setParam('waxed', v === 'wax')} />
        <Seg label={<>Detent spacing <Term k="detent" /></>} value={p.detentPitch} options={[[20, '20'], [25, '25'], [50, '50 mm']]} onChange={(v) => setParam('detentPitch', v)} />
      </details>
    </>
  )
}
