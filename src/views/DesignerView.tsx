/* Designer — drag-and-drop panel builder */
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { Panel, PanelComponent, uid } from '../data/types'
import { BUTTON_LIBRARY, comp, behaviourCall, makeNursePanelNBH } from '../data/presets'
import { PanelSVG } from '../components/PanelSVG'
import { Pill, Switch, Segmented, Field, SliderField, SelectField, ColorRow, SideTitle } from '../components/controls'
import { pressComponent } from './SimulateView'

const SWATCHES = ['#e01b24', '#199a53', '#f2d500', '#8c2fc7', '#1668dd', '#ff7f27', '#f0efec', '#63676c', '#38b6ff', '#ffffff']
const FACE_SWATCHES = ['#5b5f64', '#4a4e53', '#e9e6df', '#f4f2ee', '#2f3236', '#dfe3e6', '#ffffff']
const TEXT_SWATCHES = ['#ffffff', '#111111', '#c81e2b', '#199a53']

/* ---- single-panel undo history ---- */
const history: string[] = []
const HISTORY_MAX = 60
function snapshot(panel: Panel) {
  history.push(JSON.stringify(panel))
  if (history.length > HISTORY_MAX) history.shift()
}

export default function DesignerView() {
  const hospital = useStore((s) => s.hospital)
  const panelId = useStore((s) => s.panelId)
  const selection = useStore((s) => s.selection)
  const testMode = useStore((s) => s.testMode)
  const calls = useStore((s) => s.calls)
  const set = useStore((s) => s.set)
  const updateHospital = useStore((s) => s.updateHospital)
  const updatePanel = useStore((s) => s.updatePanel)
  const confirm = useStore((s) => s.confirm)
  const toast = useStore((s) => s.toast)

  const panelIds = Object.keys(hospital.panels)
  const panel: Panel | undefined = hospital.panels[panelId ?? ''] ?? hospital.panels[panelIds[0]]
  useEffect(() => {
    if (panel && panelId !== panel.id) set((s) => { s.panelId = panel.id })
  }, [panel, panelId, set])

  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 })
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setCanvasSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* drag state lives in a ref so re-renders can't orphan a gesture */
  const drag = useRef<{ compId: string; dx: number; dy: number; moved: boolean; snap: string } | null>(null)

  if (!panel) {
    return <div className="empty-note">No panels yet — create one below.</div>
  }

  const scale = Math.max(2, Math.min(
    (canvasSize.w - 80) / (panel.w + 30),
    (canvasSize.h - 60) / (panel.h + 40),
    5
  ) || 3)

  const mutate = (fn: (p: Panel) => void, withSnapshot = true) => {
    if (withSnapshot) snapshot(panel)
    updatePanel(panel.id, fn)
  }

  const selComp = selection ? panel.components.find((c) => c.id === selection) : undefined

  /* ---- canvas pointer handling ---- */
  const svgPoint = (e: React.PointerEvent | PointerEvent) => {
    const svg = canvasRef.current?.querySelector('svg')
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const vb = (svg as SVGSVGElement).viewBox.baseVal
    return {
      x: vb.x + ((e.clientX - rect.left) / rect.width) * vb.width,
      y: vb.y + ((e.clientY - rect.top) / rect.height) * vb.height,
    }
  }

  const onCompPointerDown = (compId: string, e: React.PointerEvent) => {
    if (testMode) {
      pressComponent('TEST', panel, compId)
      return
    }
    set((s) => { s.selection = compId })
    const c = panel.components.find((k) => k.id === compId)
    if (!c || c.x == null || ['wedge', 'flap', 'auxstrip', 'brand'].includes(c.type)) return
    const pt = svgPoint(e)
    if (!pt) return
    drag.current = { compId, dx: c.x - pt.x, dy: c.y - pt.y, moved: false, snap: JSON.stringify(panel) }
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const st = useStore.getState()
      if (st.view !== 'builder' || st.testMode) return
      const p = st.hospital.panels[st.panelId ?? '']
      if (!p) return
      const pt = svgPoint(e)
      if (!pt) return
      let nx = Math.round((pt.x + d.dx) * 2) / 2
      let ny = Math.round((pt.y + d.dy) * 2) / 2
      nx = Math.max(-14, Math.min(p.w + 14, nx))
      ny = Math.max(-16, Math.min(p.h + 8, ny))
      const c = p.components.find((k) => k.id === d.compId)
      if (c && (c.x !== nx || c.y !== ny)) {
        d.moved = true
        st.updatePanel(p.id, (pp) => {
          const cc = pp.components.find((k) => k.id === d.compId)
          if (cc) { cc.x = nx; cc.y = ny }
        })
      }
    }
    const onUp = () => {
      const d = drag.current
      if (d?.moved) {
        history.push(d.snap)
        if (history.length > HISTORY_MAX) history.shift()
      }
      drag.current = null
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [])

  /* ---- keyboard: nudge, delete, undo ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState()
      if (st.view !== 'builder' || st.testMode) return
      const tag = (document.activeElement?.tagName || '').toUpperCase()
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        return
      }
      const p = st.hospital.panels[st.panelId ?? '']
      if (!p || !st.selection) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
        return
      }
      const d = e.shiftKey ? 5 : 1
      const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
      const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
      if (dx || dy) {
        e.preventDefault()
        st.updatePanel(p.id, (pp) => {
          const c = pp.components.find((k) => k.id === st.selection)
          if (c && c.x != null) { c.x += dx; c.y += dy }
        })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const undo = () => {
    const st = useStore.getState()
    const p = st.hospital.panels[st.panelId ?? '']
    if (!p || !history.length) return
    const prev = JSON.parse(history.pop()!)
    st.updateHospital((h) => { h.panels[p.id] = prev })
  }

  const deleteSelected = () => {
    const st = useStore.getState()
    if (!st.selection) return
    const p = st.hospital.panels[st.panelId ?? '']
    if (!p) return
    snapshot(p)
    st.updatePanel(p.id, (pp) => {
      pp.components = pp.components.filter((c) => c.id !== st.selection)
    })
    st.set((s) => { s.selection = null })
  }

  const reorder = (dir: 1 | -1) => {
    if (!selComp) return
    mutate((p) => {
      const i = p.components.findIndex((c) => c.id === selComp.id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= p.components.length) return
      ;[p.components[i], p.components[j]] = [p.components[j], p.components[i]]
    })
  }

  const duplicateSelected = () => {
    if (!selComp) return
    const copy: PanelComponent = JSON.parse(JSON.stringify(selComp))
    copy.id = uid('c')
    if (copy.x != null) { copy.x += 8; copy.y += 8 }
    mutate((p) => { p.components.push(copy) })
    set((s) => { s.selection = copy.id })
  }

  const addLibraryButton = (i: number) => {
    const lib = BUTTON_LIBRARY[i]
    const c = comp('circle', {
      x: panel.w / 2, y: panel.w / 2, r: 18,
      label: lib.name.toUpperCase(), color: lib.color, textColor: lib.text, icon: lib.icon as any,
      behaviour: behaviourCall(lib.name.toUpperCase(), lib.color, lib.priority, lib.sound),
    })
    mutate((p) => { p.components.push(c) })
    set((s) => { s.selection = c.id })
  }

  const addShape = (type: string) => {
    const mid = { x: panel.w / 2, y: panel.w / 2 }
    let c: PanelComponent | undefined
    switch (type) {
      case 'circle': c = comp('circle', { ...mid, r: 20, label: 'CALL', color: '#199a53', textColor: '#fff', icon: 'person', behaviour: behaviourCall('CALL', '#199a53', 3, 'snd_nurse') }); break
      case 'oval': c = comp('circle', { ...mid, r: 16, shape: 'oval', label: 'CALL', color: '#9bc53d', textColor: '#111', icon: 'person', behaviour: behaviourCall('CALL', '#9bc53d', 3, 'snd_nurse') }); break
      case 'triangle': c = comp('circle', { ...mid, r: 20, shape: 'triangle', label: 'CALL', color: '#86c67c', textColor: '#111', icon: 'person', behaviour: behaviourCall('CALL', '#86c67c', 3, 'snd_nurse') }); break
      case 'rect': c = comp('rect', { ...mid, w: 32, h: 36, label: 'CALL', color: '#ff7f27', textColor: '#fff', icon: 'none', behaviour: behaviourCall('CALL', '#ff7f27', 3, 'snd_nhs') }); break
      case 'wedge': {
        const used = panel.components.filter((k) => k.type === 'wedge').map((k) => k.corner)
        const corner = (['tl', 'tr', 'bl', 'br'] as const).find((k) => !used.includes(k)) || 'tl'
        c = comp('wedge', { corner, label: 'ASSIST', color: '#f2d500', textColor: '#111', leg: 0.46, behaviour: behaviourCall('STAFF ASSIST', '#f2d500', 2, 'snd_assist') })
        break
      }
      case 'led': c = comp('led', { x: mid.x, y: mid.y - 26, angle: 0, color: '#38b6ff' }); break
      case 'label': c = comp('label', { x: mid.x, y: 12, text: 'LABEL', size: 5, color: '#efefec', bold: true }); break
      case 'barcode': c = comp('barcode', { x: mid.x, y: -9, w: 34, text: hospital.assetPrefix || 'NBH', code: `0230${Math.floor(10 + Math.random() * 89)}` }); break
      case 'speaker': c = comp('speaker', { x: mid.x, y: panel.h - 18, r: 8 }); break
      case 'screw': c = comp('screw', { x: 10, y: 10 }); break
      case 'auxstrip': c = comp('auxstrip', { x: 0, y: panel.w + 4 }); break
      case 'flap': c = comp('flap', { x: 0, y: panel.w + 4, h: Math.max(16, panel.h - panel.w - 8) }); break
    }
    if (c) {
      mutate((p) => { p.components.push(c!) })
      set((s) => { s.selection = c!.id })
    }
  }

  /* ---- test-mode call state for this panel ---- */
  const activeComps: Record<string, boolean> = {}
  let flashing = false, flashFast = false
  if (testMode) {
    const prefix = `TEST|${panel.id}|`
    for (const k of Object.keys(calls)) {
      if (k.startsWith(prefix)) {
        activeComps[k.slice(prefix.length)] = true
        flashing = true
        if (calls[k].priority === 1) flashFast = true
      }
    }
  }

  return (
    <div className="builder-layout view-enter">
      {/* ---- palette ---- */}
      <aside className="build-palette card">
        <SideTitle>Panel</SideTitle>
        <SelectField
          value={panel.id}
          options={panelIds.map((pid) => ({ value: pid, label: hospital.panels[pid].name }))}
          onChange={(pid) => set((s) => { s.panelId = pid; s.selection = null })}
        />
        <div className="row-btns">
          <Pill icon="plus" onClick={() => {
            const p = makeNursePanelNBH()
            p.name = 'New Panel'
            updateHospital((h) => { h.panels[p.id] = p })
            set((s) => { s.panelId = p.id; s.selection = null })
          }}>New</Pill>
          <Pill icon="copy" onClick={() => {
            const copy: Panel = JSON.parse(JSON.stringify(panel))
            copy.id = uid('p')
            copy.name = `${panel.name} (copy)`
            copy.components.forEach((c) => { c.id = uid('c') })
            updateHospital((h) => { h.panels[copy.id] = copy })
            set((s) => { s.panelId = copy.id })
          }}>Duplicate</Pill>
          <Pill icon="trash" kind="danger" onClick={async () => {
            if (!(await confirm(`Delete “${panel.name}”?`, 'Rooms using this panel will lose it.', 'Delete', true))) return
            updateHospital((h) => {
              delete h.panels[panel.id]
              for (const w of h.wards) for (const r of w.rooms) r.panelIds = r.panelIds.filter((id) => id !== panel.id)
            })
            set((s) => { s.panelId = null; s.selection = null })
            toast('Panel deleted')
          }}>Delete</Pill>
        </div>

        <SideTitle>Component Library</SideTitle>
        <div className="palette-scroll">
          <div className="pal-section">Call buttons</div>
          <div className="pal-grid">
            {BUTTON_LIBRARY.map((b, i) => (
              <button key={b.name} className="pal-chip" style={{ ['--pc' as any]: b.color }} onClick={() => addLibraryButton(i)}>
                {b.name}
              </button>
            ))}
          </div>
          <div className="pal-section">Shapes &amp; hardware</div>
          <div className="pal-grid">
            {[
              ['circle', 'Circle button'], ['oval', 'Oval button'], ['triangle', 'Triangle button'],
              ['rect', 'Rect button'], ['wedge', 'Corner wedge'],
              ['led', 'LED'], ['label', 'Label'], ['barcode', 'Asset label'],
              ['speaker', 'Speaker'], ['screw', 'Screw'], ['auxstrip', 'AUX strip'], ['flap', 'Blank flap'],
            ].map(([t, name]) => (
              <button key={t} className="pal-chip shape" onClick={() => addShape(t)}>{name}</button>
            ))}
          </div>
        </div>
      </aside>

      {/* ---- canvas ---- */}
      <section className="build-canvas-wrap">
        <div className="canvas-toolbar">
          <Switch
            checked={testMode}
            label="Test"
            onChange={(v) => {
              if (!v) useStore.getState().cancelPanelCalls('TEST', panel.id)
              set((s) => { s.testMode = v })
            }}
          />
          <span className="toolbar-sep" />
          <Pill icon="undo" onClick={undo} title="Undo (⌘Z)">Undo</Pill>
          <Pill icon="layerUp" onClick={() => reorder(1)} disabled={!selComp}>Front</Pill>
          <Pill icon="layerDown" onClick={() => reorder(-1)} disabled={!selComp}>Back</Pill>
          <Pill icon="copy" onClick={duplicateSelected} disabled={!selComp}>Duplicate</Pill>
          <Pill icon="trash" kind="danger" onClick={deleteSelected} disabled={!selComp}>Delete</Pill>
        </div>
        <div
          ref={canvasRef}
          className={`build-canvas${testMode ? ' testing' : ''}`}
          onPointerDown={(e) => {
            if (!testMode && e.target === e.currentTarget) set((s) => { s.selection = null })
          }}
        >
          <div className="canvas-stage" onPointerDown={(e) => {
            if (!testMode && !(e.target as Element).closest('[data-comp]')) set((s) => { s.selection = null })
          }}>
            <PanelSVG
              panel={panel}
              scale={scale}
              editable={!testMode}
              interactive={testMode}
              selection={testMode ? null : selection}
              activeComps={activeComps}
              panelLive={testMode}
              panelFlashing={flashing}
              flashFast={flashFast}
              onCompPointerDown={onCompPointerDown}
            />
          </div>
        </div>
      </section>

      {/* ---- inspector ---- */}
      <aside className="build-inspector card">
        {!selComp ? (
          <PanelInspector panel={panel} mutate={mutate} />
        ) : (
          <ComponentInspector panel={panel} comp={selComp} mutate={mutate} />
        )}
      </aside>
    </div>
  )
}

function PanelInspector({ panel, mutate }: { panel: Panel; mutate: (fn: (p: Panel) => void, snap?: boolean) => void }) {
  return (
    <>
      <SideTitle>Panel Properties</SideTitle>
      <Field label="Name">
        <input className="field" value={panel.name} onChange={(e) => mutate((p) => { p.name = e.target.value }, false)} />
      </Field>
      <SliderField label="Width" min={60} max={200} value={panel.w} onChange={(v) => mutate((p) => { p.w = v }, false)} />
      <SliderField label="Height" min={60} max={220} value={panel.h} onChange={(v) => mutate((p) => { p.h = v }, false)} />
      <Field label="Face colour">
        <ColorRow value={panel.face.color} swatches={FACE_SWATCHES} onChange={(c) => mutate((p) => { p.face.color = c })} />
      </Field>
      <SliderField label="Corner radius" min={0} max={20} value={panel.face.radius || 9} onChange={(v) => mutate((p) => { p.face.radius = v }, false)} />
      <SelectField
        label="Surround"
        value={panel.face.surround}
        options={[
          { value: 'none', label: 'None (flush)' },
          { value: 'white', label: 'White plastic (merlon)' },
          { value: 'steel', label: 'Stainless steel' },
        ]}
        onChange={(v) => mutate((p) => { p.face.surround = v as any })}
      />
      <div className="hint-block">Select a component to edit it.</div>
    </>
  )
}

function ComponentInspector({ panel, comp: c, mutate }: {
  panel: Panel
  comp: PanelComponent
  mutate: (fn: (p: Panel) => void, snap?: boolean) => void
}) {
  const hospital = useStore((s) => s.hospital)
  const edit = (fn: (cc: PanelComponent) => void, snap = true) =>
    mutate((p) => {
      const cc = p.components.find((k) => k.id === c.id)
      if (cc) fn(cc)
    }, snap)

  const typeName: Record<string, string> = {
    circle: 'Button', rect: 'Rectangular Button', wedge: 'Corner Wedge', led: 'Indicator LED',
    label: 'Label', barcode: 'Asset Label', speaker: 'Speaker', screw: 'Screw',
    auxstrip: 'AUX Strip', flap: 'Blank Flap',
  }

  const b = c.behaviour
  return (
    <>
      <SideTitle>{typeName[c.type] || c.type}</SideTitle>

      {['circle', 'rect', 'wedge'].includes(c.type) && (
        <Field label="Label">
          <input className="field" value={c.label || ''} onChange={(e) => edit((cc) => { cc.label = e.target.value }, false)} />
        </Field>
      )}
      {c.type === 'label' && (
        <Field label="Text">
          <input className="field" value={c.text || ''} onChange={(e) => edit((cc) => { cc.text = e.target.value }, false)} />
        </Field>
      )}
      {c.type === 'barcode' && (
        <>
          <Field label="Site code">
            <input className="field" value={c.text || 'NBH'} onChange={(e) => edit((cc) => { cc.text = e.target.value }, false)} />
          </Field>
          <Field label="Asset number">
            <input className="field" value={c.code || '023061'} onChange={(e) => edit((cc) => { cc.code = e.target.value }, false)} />
          </Field>
        </>
      )}

      {['circle', 'rect', 'wedge', 'led', 'label'].includes(c.type) && (
        <Field label="Colour">
          <ColorRow
            value={c.color || '#199a53'}
            swatches={SWATCHES}
            onChange={(col) => edit((cc) => {
              cc.color = col
              if (cc.behaviour?.action === 'call') cc.behaviour.callColor = col
            })}
          />
        </Field>
      )}
      {['circle', 'rect', 'wedge'].includes(c.type) && (
        <Field label="Text colour">
          <ColorRow value={c.textColor || '#ffffff'} swatches={TEXT_SWATCHES} onChange={(col) => edit((cc) => { cc.textColor = col })} />
        </Field>
      )}

      {c.type === 'circle' && (
        <>
          <Field label="Shape">
            <Segmented
              options={[
                { value: 'circle', label: 'Circle' },
                { value: 'oval', label: 'Oval' },
                { value: 'triangle', label: 'Triangle' },
              ]}
              value={(c.shape || 'circle') as any}
              onChange={(v) => edit((cc) => { cc.shape = v as any })}
            />
          </Field>
          <SliderField label="Size" min={8} max={44} value={c.r || 22} onChange={(v) => edit((cc) => { cc.r = v }, false)} />
        </>
      )}
      {c.type === 'rect' && (
        <>
          <SliderField label="Width" min={10} max={90} value={c.w || 32} onChange={(v) => edit((cc) => { cc.w = v }, false)} />
          <SliderField label="Height" min={10} max={70} value={c.h || 36} onChange={(v) => edit((cc) => { cc.h = v }, false)} />
        </>
      )}
      {c.type === 'wedge' && (
        <>
          <SelectField
            label="Corner"
            value={c.corner || 'tl'}
            options={[
              { value: 'tl', label: 'Top left' }, { value: 'tr', label: 'Top right' },
              { value: 'bl', label: 'Bottom left' }, { value: 'br', label: 'Bottom right' },
            ]}
            onChange={(v) => edit((cc) => { cc.corner = v as any })}
          />
          <SliderField label="Reach" min={30} max={70} value={Math.round((c.leg || 0.46) * 100)} display={`${Math.round((c.leg || 0.46) * 100)}%`} onChange={(v) => edit((cc) => { cc.leg = v / 100 }, false)} />
        </>
      )}
      {c.type === 'led' && (
        <SliderField label="Angle" min={-90} max={90} step={5} value={c.angle || 0} display={`${c.angle || 0}°`} onChange={(v) => edit((cc) => { cc.angle = v }, false)} />
      )}
      {c.type === 'label' && (
        <SliderField label="Size" min={3} max={14} value={c.size || 5} onChange={(v) => edit((cc) => { cc.size = v }, false)} />
      )}
      {c.type === 'barcode' && (
        <SliderField label="Width" min={18} max={70} value={c.w || 34} onChange={(v) => edit((cc) => { cc.w = v }, false)} />
      )}
      {['circle', 'rect'].includes(c.type) && (
        <SelectField
          label="Icon"
          value={c.icon || 'none'}
          options={[
            { value: 'none', label: 'None' },
            { value: 'person', label: 'Person (call figure)' },
            { value: 'cross', label: 'Medical cross' },
          ]}
          onChange={(v) => edit((cc) => { cc.icon = v as any })}
        />
      )}

      {['circle', 'rect', 'wedge'].includes(c.type) && (
        <>
          <SideTitle>Behaviour</SideTitle>
          <SelectField
            label="When pressed"
            value={b?.action || 'none'}
            options={[
              { value: 'call', label: 'Raise a call' },
              { value: 'cancel', label: 'Cancel calls on panel' },
              { value: 'none', label: 'Nothing (decorative)' },
            ]}
            onChange={(v) => edit((cc) => {
              cc.behaviour = cc.behaviour || { action: 'none' }
              cc.behaviour.action = v as any
              if (v === 'call' && !cc.behaviour.callLabel) {
                cc.behaviour.callLabel = cc.label || 'CALL'
                cc.behaviour.callColor = cc.color
                cc.behaviour.priority = cc.behaviour.priority || 3
                cc.behaviour.latching = true
              }
            })}
          />
          {b?.action === 'call' && (
            <>
              <Field label="Call name">
                <input className="field" value={b.callLabel || ''} onChange={(e) => edit((cc) => { cc.behaviour!.callLabel = e.target.value }, false)} />
              </Field>
              <SliderField label="Priority" min={1} max={5} value={b.priority || 3} display={`P${b.priority || 3}`} onChange={(v) => edit((cc) => { cc.behaviour!.priority = v }, false)} />
              <div className="prio-scale"><span>P1 emergency</span><span>P5 routine</span></div>
              <SelectField
                label="Alarm sound"
                value={b.sound || ''}
                options={[{ value: '', label: '— silent —' }, ...hospital.soundProfiles.map((s) => ({ value: s.id, label: s.name }))]}
                onChange={(v) => edit((cc) => { cc.behaviour!.sound = v || null })}
              />
              <Field>
                <label className="check">
                  <input type="checkbox" checked={b.latching !== false} onChange={(e) => edit((cc) => { cc.behaviour!.latching = e.target.checked })} />
                  Latching (stays on until Cancel)
                </label>
              </Field>
            </>
          )}
        </>
      )}
    </>
  )
}
