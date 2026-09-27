import { CHAPTERS } from './content/chapters'
import { useStore } from './state/store'
import { Scene } from './scene/Scene'
import { TopBar } from './ui/TopBar'
import { Mentor } from './ui/common'
import { ChecksCard } from './ui/Checks'
import { Dock } from './ui/Dock'
import { Plan } from './ui/Plan'
import { Material } from './ui/Material'
import { Workshop } from './ui/Workshop'
import { SwitchTest } from './ui/SwitchTest'

const BODY = { plan: Plan, shop: Material, workshop: Workshop, test: SwitchTest }

export default function App() {
  const { station, setStation, params } = useStore()
  const c = CHAPTERS[station] ?? CHAPTERS[0]
  const Body = BODY[c.id]
  return (
    <div className="app">
      <TopBar />
      <div className="stage"><Scene /></div>
      <aside className={`panel ${c.id === 'shop' ? 'wide' : ''}`} data-chapter={c.id}>
        <div className="eyebrow">Station {station + 1} · {c.phase.en} · <span className="de">{c.phase.de}</span></div>
        <h2>{c.title.en} <span className="de">· {c.title.de}</span></h2>
        <div className="tags">{c.lernfelder.map((l) => <span key={l} className="tag" title="Lernfeld of the Tischler vocational curriculum">{l}</span>)}</div>
        <Mentor>{c.mentor}</Mentor>
        <Body />
        <div className="panel-footer">
          <button className="btn" disabled={station === 0} onClick={() => setStation(station - 1)}>← Back</button>
          <button className="btn primary" disabled={station === CHAPTERS.length - 1} onClick={() => setStation(station + 1)}>Next →</button>
        </div>
      </aside>
      {(c.id === 'plan' || c.id === 'test') && <ChecksCard params={params} />}
      {c.id === 'plan' && <Dock />}
    </div>
  )
}
