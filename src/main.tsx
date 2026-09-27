import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { useStore } from './state/store'

// Test hook: `?debug` exposes the store for automated playthroughs.
if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { holz: useStore })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
