/* Simulate — the interactive panel player and multi-panel wall */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore, activeCallsSorted, findRoom, firstRoomId } from '../state/store'
import { PanelSVG } from '../components/PanelSVG'
import { Icon } from '../components/Icon'
import { clickTick } from '../engine/audio'
import { Panel } from '../data/types'
import { BARCODE_SEQ } from '../engine/geometry'

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function pressComponent(roomId: string, panel: Panel, compId: string) {
  const st = useStore.getState()
  const c = panel.components.find((k) => k.id === compId)
  if (!c || !c.behaviour) return
  const b = c.behaviour
  if (b.action === 'call') {
    clickTick(1800)
    const already = !!st.calls[`${roomId}|${panel.id}|${compId}`]
    st.raiseCall(roomId, panel.id, compId, {
      callLabel: b.callLabel || c.label || 'CALL',
      callColor: b.callColor || c.color || '#38b6ff',
      priority: b.priority || 3,
      sound: b.sound || null,
      latching: b.latching !== false,
    })
    if (!already && roomId !== 'TEST') {
      const loc = findRoom(st.hospital, roomId)
      st.toast(`${b.callLabel || c.label || 'CALL'} raised`, loc?.room.name, b.callColor || c.color)
    }
  } else if (b.action === 'cancel') {
    const removed = st.cancelPanelCalls(roomId, panel.id)
    clickTick(removed ? 900 : 500)
  }
}

function WallPanel({ roomId, panel, scale }: { roomId: string; panel: Panel; scale: number }) {
  const calls = useStore((s) => s.calls)
  const prefix = `${roomId}|${panel.id}|`
  const activeComps: Record<string, boolean> = {}
  let flashing = false
  let flashFast = false
  for (const k of Object.keys(calls)) {
    if (k.startsWith(prefix)) {
      const compId = k.slice(prefix.length)
      activeComps[compId] = true
      flashing = true
      if (calls[k].priority === 1) flashFast = true
    }
  }
  return (
    <div className="wall-panel">
      <PanelSVG
        panel={panel}
        scale={scale}
        interactive
        activeComps={activeComps}
        panelLive
        panelFlashing={flashing}
        flashFast={flashFast}
        onCompPointerDown={(compId) => pressComponent(roomId, panel, compId)}
      />
    </div>
  )
}

function AssetSticker({ prefix, code }: { prefix: string; code: string }) {
  const bars = useMemo(() => {
    const out: JSX.Element[] = []
    let x = 2, i = 0
    while (x < 82) {
      const w = BARCODE_SEQ[i % BARCODE_SEQ.length] * 1.35
      if (i % 2 === 0) out.push(<rect key={i} x={x} y={0} width={w} height={26} fill="#111" />)
      x += w; i++
    }
    return out
  }, [])
  return (
    <div className="asset-sticker">
      <div className="asset-title">{prefix}</div>
      <svg width="86" height="26" viewBox="0 0 86 26">{bars}</svg>
      <div className="asset-code">{code}</div>
    </div>
  )
}

function StationBoard() {
  const calls = useStore((s) => s.calls)
  const hospital = useStore((s) => s.hospital)
  const set = useStore((s) => s.set)
  const clearAll = useStore((s) => s.clearAllCalls)
  const list = activeCallsSorted(calls)
  const now = useNow(1000)

  return (
    <div className="station-card">
      <div className="side-title">
        Nurse Station <span className="live-dot" />
      </div>
      <div className="station-board">
        {list.length === 0 ? (
          <div className="station-idle">
            <span className="ok-dot" /> All quiet — no active calls
          </div>
        ) : (
          list.map((c) => {
            const loc = findRoom(hospital, c.roomId)
            return (
              <button
                key={c.key}
                className={`call-chip${c.priority === 1 ? ' p1' : ''}`}
                style={{ ['--chip' as any]: c.callColor }}
                onClick={() => set((s) => { s.roomId = c.roomId })}
              >
                <span className="chip-label">{c.callLabel}</span>
                <span className="chip-room">{loc?.room.name ?? '—'}</span>
                <span className="chip-time">{fmtElapsed(now - c.startedAt)}</span>
              </button>
            )
          })
        )}
      </div>
      <div className="side-actions">
        <button
          className="ghost-btn"
          onClick={() => {
            clearAll()
            clickTick(1400)
          }}
        >
          Silence all calls
        </button>
      </div>
    </div>
  )
}

export default function SimulateView() {
  const hospital = useStore((s) => s.hospital)
  const roomId = useStore((s) => s.roomId)
  const calls = useStore((s) => s.calls)
  const set = useStore((s) => s.set)
  const wallRef = useRef<HTMLDivElement>(null)
  const [wallH, setWallH] = useState(600)

  const ctx = findRoom(hospital, roomId) ?? findRoom(hospital, firstRoomId(hospital))
  useEffect(() => {
    if (!roomId && ctx) set((s) => { s.roomId = ctx.room.id })
  }, [roomId, ctx, set])

  useEffect(() => {
    const el = wallRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWallH(el.clientHeight || 600))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const panels = (ctx?.room.panelIds ?? []).map((pid) => hospital.panels[pid]).filter(Boolean)
  const maxUnits = panels.length ? Math.max(...panels.map((p) => p.h)) : 138
  const scale = Math.max(2, Math.min((wallH * 0.52) / maxUnits, 4.6))
  const plateStyle = hospital.wall?.plate === 'steel' ? 'steel' : 'bare'

  const callsByRoom: Record<string, { n: number; color: string }> = {}
  for (const c of activeCallsSorted(calls)) {
    const cur = callsByRoom[c.roomId]
    if (cur) cur.n++
    else callsByRoom[c.roomId] = { n: 1, color: c.callColor }
  }

  return (
    <div className="sim-layout view-enter">
      <aside className="sim-side card">
        <div className="side-title">Rooms</div>
        <div className="room-tree">
          {hospital.wards.map((w) => (
            <div key={w.id}>
              <div className="ward-name">{w.name}</div>
              {w.rooms.map((r) => {
                const badge = callsByRoom[r.id]
                return (
                  <button
                    key={r.id}
                    className={`room-item${ctx?.room.id === r.id ? ' active' : ''}${badge ? ' calling' : ''}`}
                    onClick={() => set((s) => { s.roomId = r.id })}
                  >
                    <span>{r.name}</span>
                    {badge && (
                      <span className="room-badge" style={{ background: badge.color }}>{badge.n}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <StationBoard />
      </aside>

      <section className="sim-wall-wrap">
        <div className="wall-header">
          <div>
            <div className="wall-crumb">
              {hospital.name}
              {ctx && <span> › </span>}
              {ctx?.ward.name}
            </div>
            <h2 className="wall-title">{ctx?.room.name ?? 'No room selected'}</h2>
          </div>
        </div>
        <div id="wall" ref={wallRef} className="wall" style={{ background: hospital.wall?.color || '#c9dde2' }}>
          <div className="wall-shade" />
          <div className={`wall-plate ${plateStyle}`}>
            {panels.length === 0 && <div className="empty-note">This room has no panels yet — assign some in the Hospital tab.</div>}
            {panels.map((p, i) => (
              <div key={`${p.id}_${i}`} style={{ display: 'contents' }}>
                <WallPanel roomId={ctx!.room.id} panel={p} scale={scale} />
                {i === 0 && panels.length > 1 && plateStyle === 'steel' && (
                  <AssetSticker prefix={hospital.assetPrefix || 'NBH'} code={`0230${60 + ((ctx!.room.name.length) % 9)}`} />
                )}
              </div>
            ))}
          </div>
          <div className="wall-skirting" />
        </div>
      </section>
    </div>
  )
}

export function toggleWallFullscreen() {
  const wall = document.getElementById('wall')
  if (!wall) return
  if (document.fullscreenElement) document.exitFullscreen()
  else wall.requestFullscreen?.()
}
