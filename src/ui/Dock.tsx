import { geometry } from '../model/desk'
import { useStore } from '../state/store'

/** Height slider + cutaway toggle under the 3D view. */
export function Dock() {
  const { params, height, cutaway, setHeight, setCutaway } = useStore()
  const g = geometry(params)
  const nearest = g.detents.reduce((a, b) => (Math.abs(b - height) < Math.abs(a - height) ? b : a), g.detents[0])
  return (
    <div className="dock">
      <button className="btn" onClick={() => setHeight(params.sitHeight)}>Sit</button>
      <input type="range" min={params.sitHeight} max={g.maxHeight} step={1} value={height} onChange={(e) => setHeight(Number(e.target.value))} aria-label="Desk height" />
      <button className="btn" onClick={() => setHeight(g.maxHeight)}>Stand</button>
      <span className="h" data-testid="height">{(height / 10).toFixed(1)} cm</span>
      <span className="small muted">detent {nearest / 10} cm</span>
      <button className={`btn ${cutaway ? 'on' : ''}`} aria-pressed={cutaway} onClick={() => setCutaway(!cutaway)}>Cutaway</button>
    </div>
  )
}
