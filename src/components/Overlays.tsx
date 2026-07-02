/* Toasts + confirm modal — app-level overlays */
import { useStore } from '../state/store'
import { Pill } from './controls'

export function ToastHost() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.color && <span className="toast-dot" style={{ background: t.color }} />}
          <span className="toast-text">{t.text}</span>
          {t.detail && <span className="toast-detail">{t.detail}</span>}
        </div>
      ))}
    </div>
  )
}

export function ConfirmModal() {
  const req = useStore((s) => s.confirmReq)
  const answer = useStore((s) => s.answerConfirm)
  if (!req) return null
  return (
    <div className="modal-backdrop" onClick={() => answer(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{req.title}</div>
        {req.detail && <div className="modal-detail">{req.detail}</div>}
        <div className="modal-actions">
          <Pill kind="frost" onClick={() => answer(false)}>Cancel</Pill>
          <Pill kind={req.destructive ? 'danger' : 'dark'} onClick={() => answer(true)}>
            {req.confirmLabel || 'Continue'}
          </Pill>
        </div>
      </div>
    </div>
  )
}
