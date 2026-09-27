import { useRef, useState } from 'react'
import { CHAPTERS } from '../content/chapters'
import { GLOSSARY } from '../content/glossary'
import { PERSISTED, useStore } from '../state/store'
import { CAN_DOWNLOAD } from '../target'

export function TopBar() {
  const { chapter, setChapter, load } = useStore()
  const dialog = useRef<HTMLDialogElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const s = useStore.getState()
    const data = Object.fromEntries(PERSISTED.map((k) => [k, s[k]]))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'holz-up', version: 1, ...data }, null, 2)], { type: 'application/json' }))
    a.download = 'holz-up-project.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const open = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      if (data.app !== 'holz-up') throw new Error('not a Holz-Up project')
      load(data)
      setError(null)
    } catch (e) {
      setError(`Could not open that file (${(e as Error).message}). Choose a file saved from Holz-Up.`)
    }
  }

  return (
    <header className="topbar">
      <div className="brand">Holz<span>-</span>Up</div>
      <nav className="stepper" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <button key={c.id} aria-current={i === chapter ? 'step' : undefined} onClick={() => setChapter(i)} title={`${c.phase.en} · ${c.phase.de}`}>
            <b>{i + 1}</b>{c.title.en}
          </button>
        ))}
      </nav>
      <div className="tools">
        <button className="btn" onClick={() => dialog.current?.showModal()}>Glossary</button>
        {CAN_DOWNLOAD && <button className="btn" onClick={save} title="Download your project as a file">Save</button>}
        <button className="btn" onClick={() => file.current?.click()} title="Open a saved project file">Open</button>
        <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && open(e.target.files[0])} />
      </div>
      {error && <p className="popover" role="alert" style={{ top: 70, right: 16 }} onClick={() => setError(null)}>{error}</p>}
      <dialog ref={dialog} className="popover" style={{ position: 'fixed', maxWidth: 560, maxHeight: '80vh', overflow: 'auto', color: 'var(--ink)' }} onClick={(e) => e.target === dialog.current && dialog.current.close()}>
        <h2>Glossary · Fachbegriffe</h2>
        <dl className="glossary-list">
          {Object.values(GLOSSARY).sort((a, b) => a.de.localeCompare(b.de)).map((t) => (
            <div key={t.de}>
              <dt>{t.de} <span className="muted">· {t.en}</span></dt>
              <dd>{t.explain}</dd>
            </div>
          ))}
        </dl>
        <button className="btn" onClick={() => dialog.current?.close()}>Close</button>
      </dialog>
    </header>
  )
}
