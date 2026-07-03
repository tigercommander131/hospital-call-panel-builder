import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Hospital, Panel, Call, ViewName, callKey, uid } from '../data/types'
import { presetNBH } from '../data/presets'

const STORAGE_KEY = 'hcpb_hospital_v1'

/* strip legacy branding marks (merlon-IP text, NBH asset stickers) */
export function migrateHospital(h: Hospital): Hospital {
  return migrate(h)
}
function migrate(h: Hospital): Hospital {
  for (const pid of Object.keys(h.panels)) {
    const p = h.panels[pid]
    p.components = p.components.filter((c) => {
      if (c.type === 'brand') return false
      if (c.type === 'barcode' && c.text === 'NBH' && (c.code || '').startsWith('0230')) return false
      return true
    })
  }
  return h
}

function loadHospital(): Hospital {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const h = JSON.parse(raw)
      if (h && h.panels && h.wards && h.soundProfiles) return migrate(h)
    }
  } catch (e) {
    console.warn('load failed', e)
  }
  return presetNBH()
}

export interface Toast {
  id: string
  text: string
  detail?: string
  color?: string
}

interface ConfirmRequest {
  title: string
  detail?: string
  confirmLabel?: string
  destructive?: boolean
  resolve: (ok: boolean) => void
}

interface State {
  hospital: Hospital
  calls: Record<string, Call>
  view: ViewName
  roomId: string | null
  panelId: string | null
  soundId: string | null
  selection: string | null
  selBlock: number
  testMode: boolean
  muted: boolean
  saveTick: number
  toasts: Toast[]
  confirmReq: ConfirmRequest | null

  setView: (v: ViewName) => void
  set: (fn: (s: State) => void) => void
  updateHospital: (fn: (h: Hospital) => void) => void
  updatePanel: (panelId: string, fn: (p: Panel) => void) => void

  raiseCall: (roomId: string, panelId: string, compId: string, meta: Omit<Call, 'key' | 'roomId' | 'panelId' | 'compId' | 'startedAt'>) => void
  dismissCall: (key: string) => void
  cancelPanelCalls: (roomId: string, panelId: string) => boolean
  clearAllCalls: () => void

  toast: (text: string, detail?: string, color?: string) => void
  removeToast: (id: string) => void
  confirm: (title: string, detail?: string, confirmLabel?: string, destructive?: boolean) => Promise<boolean>
  answerConfirm: (ok: boolean) => void
}

export const useStore = create<State>()(
  immer((set, get) => ({
    hospital: loadHospital(),
    calls: {},
    view: 'simulate',
    roomId: null,
    panelId: null,
    soundId: null,
    selection: null,
    selBlock: -1,
    testMode: false,
    muted: false,
    saveTick: 0,
    toasts: [],
    confirmReq: null,

    setView: (v) => set((s) => { s.view = v }),
    set: (fn) => set(fn),

    updateHospital: (fn) => set((s) => { fn(s.hospital); s.saveTick++ }),
    updatePanel: (panelId, fn) =>
      set((s) => {
        const p = s.hospital.panels[panelId]
        if (p) { fn(p); s.saveTick++ }
      }),

    raiseCall: (roomId, panelId, compId, meta) => {
      const k = callKey(roomId, panelId, compId)
      if (get().calls[k]) return // latched already
      set((s) => {
        s.calls[k] = { key: k, roomId, panelId, compId, startedAt: Date.now(), ...meta }
      })
      if (!meta.latching) {
        setTimeout(() => get().dismissCall(k), 3000)
      }
    },
    dismissCall: (key) => set((s) => { delete s.calls[key] }),
    cancelPanelCalls: (roomId, panelId) => {
      const prefix = `${roomId}|${panelId}|`
      const keys = Object.keys(get().calls).filter((k) => k.startsWith(prefix))
      if (!keys.length) return false
      set((s) => { for (const k of keys) delete s.calls[k] })
      return true
    },
    clearAllCalls: () => set((s) => { s.calls = {} }),

    toast: (text, detail, color) => {
      const id = uid('t')
      set((s) => { s.toasts.push({ id, text, detail, color }) })
      setTimeout(() => get().removeToast(id), 3200)
    },
    removeToast: (id) => set((s) => { s.toasts = s.toasts.filter((t) => t.id !== id) }),

    confirm: (title, detail, confirmLabel, destructive) =>
      new Promise<boolean>((resolve) => {
        set((s) => { s.confirmReq = { title, detail, confirmLabel, destructive, resolve } })
      }),
    answerConfirm: (ok) => {
      const req = get().confirmReq
      set((s) => { s.confirmReq = null })
      req?.resolve(ok)
    },
  }))
)

/* ---- helpers ---- */
export function activeCallsSorted(calls: Record<string, Call>): Call[] {
  return Object.values(calls).sort(
    (a, b) => (a.priority - b.priority) || (a.startedAt - b.startedAt)
  )
}

export function firstRoomId(h: Hospital): string | null {
  for (const w of h.wards) if (w.rooms.length) return w.rooms[0].id
  return null
}

export function findRoom(h: Hospital, id: string | null) {
  if (!id) return null
  for (const w of h.wards) {
    for (const r of w.rooms) if (r.id === id) return { ward: w, room: r }
  }
  return null
}

/* ---- persistence (debounced autosave) ---- */
let saveTimer: ReturnType<typeof setTimeout> | undefined
let savedFlashTimer: ReturnType<typeof setTimeout> | undefined
export const savedFlash = { listeners: new Set<(on: boolean) => void>() }

useStore.subscribe((state, prev) => {
  if (state.saveTick === prev.saveTick) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(useStore.getState().hospital))
      savedFlash.listeners.forEach((fn) => fn(true))
      clearTimeout(savedFlashTimer)
      savedFlashTimer = setTimeout(() => savedFlash.listeners.forEach((fn) => fn(false)), 1400)
    } catch (e) {
      console.warn('save failed', e)
    }
  }, 350)
})
