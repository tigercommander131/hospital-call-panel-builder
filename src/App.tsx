import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore, savedFlash, activeCallsSorted } from './state/store'
import { ViewName } from './data/types'
import { Icon } from './components/Icon'
import { ToastHost, ConfirmModal } from './components/Overlays'
import SimulateView, { toggleWallFullscreen } from './views/SimulateView'
import DesignerView from './views/DesignerView'
import SoundStudioView from './views/SoundStudioView'
import HospitalView from './views/HospitalView'

export const isKiosk = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('kiosk')

const TABS: { id: ViewName; label: string }[] = [
  { id: 'simulate', label: 'Simulate' },
  { id: 'builder', label: 'Designer' },
  { id: 'sounds', label: 'Sound Studio' },
  { id: 'hospital', label: 'Hospital' },
]

const VIEW_SPRING = { type: 'spring' as const, stiffness: 340, damping: 34, mass: 0.9 }

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
  const kiosk = isKiosk()

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

  /* kiosk: chrome-less wall for mounted tablets — ?kiosk in the URL */
  if (kiosk) {
    return (
      <>
        <div id="emergencyVignette" />
        <SimulateView kiosk />
        <ToastHost />
        <ConfirmModal />
      </>
    )
  }

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
              {view === t.id && (
                <motion.span
                  layoutId="tab-underline"
                  className="tab-underline"
                  transition={{ type: 'spring', stiffness: 480, damping: 40 }}
                />
              )}
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            style={{ height: '100%' }}
            initial={{ opacity: 0, y: 12, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.14, ease: 'easeIn' } }}
            transition={VIEW_SPRING}
          >
            {view === 'simulate' && <SimulateView />}
            {view === 'builder' && <DesignerView />}
            {view === 'sounds' && <SoundStudioView />}
            {view === 'hospital' && <HospitalView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <ToastHost />
      <ConfirmModal />
    </>
  )
}
