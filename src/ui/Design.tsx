import { geometry } from '../model/desk'
import { physics } from '../model/checks'
import { useStore } from '../state/store'
import { Range, Seg, Term } from './common'

export function Design() {
  const { params: p, setParam } = useStore()
  const g = geometry(p)
  const ph = physics(p)
  return (
    <>
      <p className="small">
        Moving mass <b>{ph.movingKg.toFixed(1)} kg</b> (incl. {p.loadKg} kg on the desk) · ballast <b>{ph.ballastKg.toFixed(0)} kg</b> · whole desk{' '}
        <b>{ph.totalKg.toFixed(0)} kg</b> · {g.detents.length} detents
      </p>

      <h3>Heights</h3>
      <Range label="Sitting height" value={p.sitHeight} min={620} max={800} step={5} onChange={(v) => setParam('sitHeight', v)} />
      <Range label="Standing height" value={p.standHeight} min={900} max={1250} step={5} onChange={(v) => setParam('standHeight', v)} />
      <Seg label={<>Detent spacing <Term k="detent" /></>} value={p.detentPitch} options={[[20, '20'], [25, '25'], [50, '50 mm']]} onChange={(v) => setParam('detentPitch', v)} />

      <h3>Top</h3>
      <Range label="Length" value={p.topLength} min={900} max={1800} step={10} onChange={(v) => setParam('topLength', v)} />
      <Range label="Depth" value={p.topDepth} min={550} max={900} step={10} onChange={(v) => setParam('topDepth', v)} />
      <Seg label={<>Thickness <Term k="leimholz" /></>} value={p.topThickness} options={[[18, '18'], [27, '27 mm']]} onChange={(v) => setParam('topThickness', v)} />

      <h3>End panels & feet</h3>
      <Range label={<>End panel width <Term k="wange" /></>} value={p.wangeWidth} min={150} max={320} step={5} onChange={(v) => setParam('wangeWidth', v)} />
      <Range label="End panel depth" value={p.wangeDepth} min={400} max={Math.max(400, p.topDepth - 40)} step={10} onChange={(v) => setParam('wangeDepth', v)} />
      <Range label="Foot length" value={p.footLength} min={300} max={900} step={10} onChange={(v) => setParam('footLength', v)} />

      <h3>Balance & sliding</h3>
      <Seg label={<>Ballast <Term k="counterweight" /></>} value={p.ballast} options={[['granite', 'Granite'], ['sand', 'Sand'], ['none', 'None']]} onChange={(v) => setParam('ballast', v)} />
      <Seg label={<>Cord <Term k="tackle" /></>} value={p.tackle} options={[[1, '1:1'], [2, '2:1']]} onChange={(v) => setParam('tackle', v)} />
      <Range label="Load on the desk" value={p.loadKg} min={0} max={25} unit="kg" onChange={(v) => setParam('loadKg', v)} />
      <Seg label={<>Guides <Term k="wax" /></>} value={p.waxed ? 'wax' : 'dry'} options={[['wax', 'Waxed'], ['dry', 'Dry']]} onChange={(v) => setParam('waxed', v === 'wax')} />
      <Range label={<>Guide play <Term k="clearance" /></>} value={p.clearance} min={0.1} max={2} step={0.1} onChange={(v) => setParam('clearance', v)} />
    </>
  )
}
