/* Toasts + confirm modal — app-level overlays on real springs */
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../state/store'
import { Pill } from './controls'

const TOAST_SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

export function ToastHost() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="toast-host">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="toast"
            layout
            initial={{ opacity: 0, y: 16, scale: 0.94, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.18 } }}
            transition={TOAST_SPRING}
          >
            {t.color && <span className="toast-dot" style={{ background: t.color }} />}
            <span className="toast-text">{t.text}</span>
            {t.detail && <span className="toast-detail">{t.detail}</span>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function ConfirmModal() {
  const req = useStore((s) => s.confirmReq)
  const answer = useStore((s) => s.answerConfirm)
  return (
    <AnimatePresence>
      {req && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
          onClick={() => answer(false)}
        >
          <motion.div
            className="modal-card"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">{req.title}</div>
            {req.detail && <div className="modal-detail">{req.detail}</div>}
            <div className="modal-actions">
              <Pill kind="frost" onClick={() => answer(false)}>Cancel</Pill>
              <Pill kind={req.destructive ? 'danger' : 'dark'} onClick={() => answer(true)}>
                {req.confirmLabel || 'Continue'}
              </Pill>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
