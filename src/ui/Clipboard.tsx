import { forwardRef, useState } from 'react'
import { Documents } from './Documents'
import { Build } from './Build'

/** Paperwork you can pull out at any station: documents and the real-world checklist. */
export const Clipboard = forwardRef<HTMLDialogElement>(function Clipboard(_, ref) {
  const [tab, setTab] = useState<'docs' | 'real'>('docs')
  const close = () => (ref as React.RefObject<HTMLDialogElement>).current?.close()
  return (
    <dialog ref={ref} className="clipboard" onClick={(e) => e.target === e.currentTarget && close()}>
      <header>
        <h2>Clipboard <span className="de">· Unterlagen</span></h2>
        <div className="tabs">
          <button className={`btn ${tab === 'docs' ? 'on' : ''}`} onClick={() => setTab('docs')}>Plans & lists</button>
          <button className={`btn ${tab === 'real' ? 'on' : ''}`} onClick={() => setTab('real')}>Building it for real</button>
          <button className="btn" onClick={close}>Close</button>
        </div>
      </header>
      {tab === 'docs' ? <Documents /> : <Build />}
    </dialog>
  )
})
