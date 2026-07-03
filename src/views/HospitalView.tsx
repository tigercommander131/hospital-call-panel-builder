/* Hospital — wards, rooms, panel assignment, library, export/import */
import { useRef } from 'react'
import { useStore } from '../state/store'
import { PRESETS } from '../data/presets'
import { uid } from '../data/types'
import { Pill, LinkBtn, XBtn } from '../components/controls'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/ui/tilt'

/* export format — versioned so future migrations have something to key on */
const EXPORT_FORMAT = 'hcpb-hospital'
const EXPORT_VERSION = 2

export default function HospitalView() {
  const hospital = useStore((s) => s.hospital)
  const set = useStore((s) => s.set)
  const updateHospital = useStore((s) => s.updateHospital)
  const confirm = useStore((s) => s.confirm)
  const toast = useStore((s) => s.toast)
  const clearAllCalls = useStore((s) => s.clearAllCalls)
  const fileRef = useRef<HTMLInputElement>(null)

  const panelOptions = Object.keys(hospital.panels)

  const loadPreset = async (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    if (!(await confirm(`Load “${preset.name}”?`, 'This replaces your current hospital. Export it first if you want to keep it.', 'Load'))) return
    clearAllCalls()
    const h = preset.make()
    set((s) => {
      s.hospital = h
      s.roomId = null
      s.panelId = null
      s.soundId = null
      s.selection = null
      s.saveTick++
    })
    toast(`${preset.name} loaded`)
  }

  const exportHospital = () => {
    const payload = {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      hospital,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(hospital.name || 'hospital').replace(/[^\w-]+/g, '-').toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 500)
    toast('Hospital exported', `${a.download}`)
  }

  const importHospital = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result))
        // accept both the versioned envelope and legacy bare-hospital files
        const data = raw?.format === EXPORT_FORMAT ? raw.hospital : raw
        if (!data || typeof data !== 'object' || !data.panels || !data.wards || !data.soundProfiles) {
          toast('That file doesn’t look like a hospital export')
          return
        }
        clearAllCalls()
        set((s) => {
          s.hospital = data
          s.roomId = null
          s.panelId = null
          s.soundId = null
          s.saveTick++
        })
        toast(`${data.name || 'Hospital'} imported`)
      } catch (e: any) {
        toast('Could not read that file', e.message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="hospital-layout view-enter">
      <div className="hosp-inner">
        {/* hero */}
        <div className="hosp-hero">
          <div className="eyebrow">Hospital</div>
          <div className="hosp-hero-row">
            <input
              className="hosp-name-input"
              value={hospital.name}
              spellCheck={false}
              onChange={(e) => updateHospital((h) => { h.name = e.target.value })}
            />
            <label className="prefix-lockup">
              Asset prefix
              <input
                className="field small"
                maxLength={4}
                value={hospital.assetPrefix || 'NBH'}
                onChange={(e) => updateHospital((h) => { h.assetPrefix = e.target.value.toUpperCase() })}
              />
            </label>
          </div>
        </div>

        {/* wards */}
        <div className="section-head">
          <h3>Wards &amp; rooms</h3>
          <Pill icon="plus" kind="dark" onClick={() => {
            updateHospital((h) => { h.wards.push({ id: uid('w'), name: 'New Ward', rooms: [] }) })
          }}>Ward</Pill>
        </div>
        <div className="ward-list">
          {hospital.wards.map((w) => (
            <div key={w.id} className="ward-card card">
              <div className="ward-head">
                <input
                  className="ward-name-input"
                  value={w.name}
                  spellCheck={false}
                  onChange={(e) => updateHospital((h) => {
                    const ww = h.wards.find((x) => x.id === w.id)
                    if (ww) ww.name = e.target.value
                  })}
                />
                <Pill icon="plus" onClick={() => {
                  updateHospital((h) => {
                    const ww = h.wards.find((x) => x.id === w.id)
                    if (ww) ww.rooms.push({ id: uid('r'), name: `Room ${ww.rooms.length + 1}`, panelIds: panelOptions.slice(0, 2) })
                  })
                }}>Room</Pill>
                <XBtn title="Delete ward" onClick={async () => {
                  if (!(await confirm(`Delete “${w.name}”?`, `Its ${w.rooms.length} room(s) will go too.`, 'Delete', true))) return
                  updateHospital((h) => { h.wards = h.wards.filter((x) => x.id !== w.id) })
                }} />
              </div>
              {w.rooms.map((r) => (
                <div key={r.id} className="room-row">
                  <input
                    className="field room-name-input"
                    value={r.name}
                    spellCheck={false}
                    onChange={(e) => updateHospital((h) => {
                      for (const ww of h.wards) {
                        const rr = ww.rooms.find((x) => x.id === r.id)
                        if (rr) rr.name = e.target.value
                      }
                    })}
                  />
                  <div className="room-panels">
                    {r.panelIds.map((pid, i) => {
                      const p = hospital.panels[pid]
                      if (!p) return null
                      return (
                        <span key={`${pid}_${i}`} className="panel-tag">
                          {p.name}
                          <button
                            title="Remove from room"
                            onClick={() => updateHospital((h) => {
                              for (const ww of h.wards) {
                                const rr = ww.rooms.find((x) => x.id === r.id)
                                if (rr) rr.panelIds.splice(i, 1)
                              }
                            })}
                          >
                            <Icon name="close" size={10} />
                          </button>
                        </span>
                      )
                    })}
                    <select
                      className="field add-panel-select"
                      value=""
                      onChange={(e) => {
                        const pid = e.target.value
                        if (!pid) return
                        updateHospital((h) => {
                          for (const ww of h.wards) {
                            const rr = ww.rooms.find((x) => x.id === r.id)
                            if (rr) rr.panelIds.push(pid)
                          }
                        })
                      }}
                    >
                      <option value="">+ Add panel</option>
                      {panelOptions.map((pid) => (
                        <option key={pid} value={pid}>{hospital.panels[pid].name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="room-actions">
                    <LinkBtn onClick={() => set((s) => { s.roomId = r.id; s.view = 'simulate' })}>Simulate</LinkBtn>
                    <XBtn title="Delete room" onClick={() => {
                      updateHospital((h) => {
                        for (const ww of h.wards) ww.rooms = ww.rooms.filter((x) => x.id !== r.id)
                      })
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* library */}
        <div className="section-head"><h3>Library</h3></div>
        <div className="lib-grid">
          {PRESETS.map((p) => (
            <Tilt key={p.id} maxTilt={5} liftZ={6}>
              <div className="preset-card card">
                <div className="preset-name">{p.name}</div>
                <div className="preset-desc">{p.desc}</div>
                <LinkBtn onClick={() => loadPreset(p.id)}>Load</LinkBtn>
              </div>
            </Tilt>
          ))}
        </div>

        {/* your configuration */}
        <div className="section-head"><h3>Your configuration</h3></div>
        <div className="config-row">
          <Pill icon="download" onClick={exportHospital}>Export (.json)</Pill>
          <Pill icon="upload" onClick={() => fileRef.current?.click()}>Import (.json)</Pill>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importHospital(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>
    </div>
  )
}
