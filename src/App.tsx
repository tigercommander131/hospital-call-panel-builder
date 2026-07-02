import { useEffect, useState } from 'react'
import { useStore, savedFlash, activeCallsSorted } from './state/store'
import { ViewName } from './data/types'
import { Icon } from './components/Icon'
import { ToastHost, ConfirmModal } from './components/Overlays'
import SimulateView, { toggleWallFullscreen } from './views/SimulateView'
import DesignerView from './views/DesignerView'
import SoundStudioView from './views/SoundStudioView'
import HospitalView from './views/HospitalView'

const TABS: { id: ViewName; label: string }[] = [
  { id: 'simulate', label: 'Simulate' },
  { id: 'builder', label: 'Designer' },
  { id: 'sounds', label: 'Sound Studio' },
  { id: 'hospital', label: 'Hospital' },
]

function SavedWhisper() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const fn = (v: boolean) => setOn(v)
    savedFlash.listeners.add(fn)
    return () => { savedFlash.listeners.delete(fn) }
  }, [])
  return <span className={`saved-whisper${on ? ' flash' : ''}`}>Saved</span>
}

export default function App() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const muted = useStore((s) => s.muted)
  const set = useStore((s) => s.set)
  const calls = useStore((s) => s.calls)

  const emergencyLive = activeCallsSorted(calls)[0]?.priority === 1

  useEffect(() => {
    document.body.classList.toggle('emergency-live', emergencyLive)
  }, [emergencyLive])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f') return
      const tag = (document.activeElement?.tagName || '').toUpperCase()
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (useStore.getState().view === 'simulate') toggleWallFullscreen()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div id="emergencyVignette" />
      <header id="topbar">
        <div className="brand">
          <svg viewBox="0 0 100 100" width="22" height="22" aria-hidden="true">
            <rect x="4" y="4" width="92" height="92" rx="26" fill="#1d1d1f" />
            <circle cx="50" cy="50" r="28" fill="#f5f5f7" />
            <circle cx="50" cy="41" r="6.5" fill="#1d1d1f" />
            <path d="M50 49 L59 68 L41 68 Z" fill="#1d1d1f" />
          </svg>
          <h1>Call Panel Builder</h1>
        </div>

        <nav id="mainTabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab${view === t.id ? ' active' : ''}`}
              onClick={() => setView(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          <SavedWhisper />
          <button
            className={`icon-btn${muted ? ' muted' : ''}`}
            title="Mute / unmute alarms"
            onClick={() => set((s) => { s.muted = !s.muted })}
          >
            <Icon name={muted ? 'volumeOff' : 'volumeOn'} size={17} />
          </button>
          <button
            className="cta-pill"
            title="Fullscreen wall (F)"
            onClick={() => {
              if (useStore.getState().view !== 'simulate') setView('simulate')
              setTimeout(toggleWallFullscreen, 60)
            }}
          >
            <Icon name="expand" size={14} />
            Fullscreen
          </button>
        </div>
      </header>

      <main id="view">
        {view === 'simulate' && <SimulateView />}
        {view === 'builder' && <DesignerView />}
        {view === 'sounds' && <SoundStudioView />}
        {view === 'hospital' && <HospitalView />}
      </main>

      <ToastHost />
      <ConfirmModal />
    </>
  )
}
