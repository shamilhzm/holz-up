import { CHAPTERS } from './content/chapters'
import { useStore } from './state/store'
import { Scene } from './scene/Scene'
import { TopBar } from './ui/TopBar'
import { Mentor } from './ui/common'
import { ChecksCard } from './ui/Checks'
import { Dock } from './ui/Dock'
import { Brief } from './ui/Brief'
import { Design } from './ui/Design'
import { Material } from './ui/Material'
import { Documents } from './ui/Documents'
import { Build } from './ui/Build'
import { SwitchTest } from './ui/SwitchTest'

const BODY = { brief: Brief, design: Design, material: Material, documents: Documents, build: Build, test: SwitchTest }

export default function App() {
  const { chapter, setChapter, params } = useStore()
  const c = CHAPTERS[chapter] ?? CHAPTERS[0]
  const Body = BODY[c.id]
  const wide = c.id === 'documents' || c.id === 'material'
  return (
    <div className="app">
      <TopBar />
      <div className="stage"><Scene /></div>
      <aside className={`panel ${wide ? 'wide' : ''}`} data-chapter={c.id}>
        <div className="eyebrow">Chapter {chapter + 1} · {c.phase.en} · <span className="de">{c.phase.de}</span></div>
        <h2>{c.title.en} <span className="de">· {c.title.de}</span></h2>
        <div className="tags">{c.lernfelder.map((l) => <span key={l} className="tag" title="Lernfeld of the Tischler vocational curriculum">{l}</span>)}</div>
        <Mentor>{c.mentor}</Mentor>
        <Body />
        <div className="panel-footer">
          <button className="btn" disabled={chapter === 0} onClick={() => setChapter(chapter - 1)}>← Back</button>
          <button className="btn primary" disabled={chapter === CHAPTERS.length - 1} onClick={() => setChapter(chapter + 1)}>Next →</button>
        </div>
      </aside>
      {!wide && <ChecksCard params={params} />}
      {c.id !== 'test' && <Dock />}
    </div>
  )
}
