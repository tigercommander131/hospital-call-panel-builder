/* Sound Studio — every alarm is a recipe, never a recording */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../state/store'
import { SoundBlock, SoundProfile, uid } from '../data/types'
import { previewStart, previewStop, isPreviewing } from '../engine/audio'
import { Pill, SliderField, SelectField, SideTitle, Field } from '../components/controls'
import { Icon } from '../components/Icon'

const BLOCK_KINDS = [
  { kind: 'beep', name: 'Beep', color: '#0a84ff' },
  { kind: 'chime', name: 'Chime', color: '#ff9f0a' },
  { kind: 'pulse', name: 'Pulse', color: '#ff375f' },
  { kind: 'sweep', name: 'Sweep', color: '#bf5af2' },
  { kind: 'warble', name: 'Warble', color: '#30d158' },
  { kind: 'silence', name: 'Silence', color: '#8e8e93' },
] as const

const kindMeta = (kind: string) => BLOCK_KINDS.find((k) => k.kind === kind) || BLOCK_KINDS[0]

function blockDurMs(b: SoundBlock) {
  if (b.kind === 'pulse') return (b.count || 3) * ((b.dur || 150) + (b.gapMs || 90))
  return b.dur || 300
}

function usedByCount(soundId: string) {
  const panels = useStore.getState().hospital.panels
  let n = 0
  for (const pid of Object.keys(panels)) {
    for (const c of panels[pid].components) {
      if (c.behaviour?.sound === soundId) n++
    }
  }
  return n
}

/* ---------- describe → recipe ---------- */
function generateFromDescription(txt: string): SoundProfile {
  const t = txt.toLowerCase()
  const tBranch = t.replace(/\b(not|no|isn'?t|without)\s+(an?\s+|the\s+)?\w+/g, '')
  const s: SoundProfile = {
    id: uid('snd'),
    name: txt.length > 34 ? txt.slice(0, 34) + '…' : txt,
    color: '#034f46', pitch: 1, tempo: 1, volume: 0.8, gap: 1200, blocks: [],
  }
  const has = (re: RegExp) => re.test(tBranch)
  const hasMod = (re: RegExp) => re.test(t)

  if (has(/emergen|code|resus|crash|critical/)) {
    s.blocks = [
      { kind: 'beep', freq: 800, dur: 240, wave: 'square' },
      { kind: 'beep', freq: 1000, dur: 240, wave: 'square' },
    ]
    s.gap = 0; s.volume = 0.9; s.color = '#e01b24'
  } else if (has(/urgent|assist|hurry|priority/)) {
    s.blocks = [{ kind: 'pulse', freq: 900, dur: 140, count: 3, gapMs: 80, wave: 'triangle' }]
    s.gap = 900; s.color = '#e0a136'
  } else if (has(/warble|nhs|uk|british/)) {
    s.blocks = [{ kind: 'warble', freq: 520, freq2: 680, rate: 6, dur: 750, wave: 'sine' }]
    s.gap = 900; s.color = '#ff7f27'
  } else if (has(/ding|dong|us|american|door/)) {
    s.blocks = [{ kind: 'chime', freq: 660, dur: 420 }, { kind: 'chime', freq: 528, dur: 620 }]
    s.gap = 2400; s.color = '#a0c4ff'
  } else if (has(/nurse|call|classic|australian|aussie|au\b/)) {
    s.blocks = [{ kind: 'chime', freq: 1200, dur: 480 }]
    s.gap = 1700; s.color = '#199a53'
  } else if (has(/chime|bell|gentle|soft|calm/)) {
    s.blocks = [{ kind: 'chime', freq: 1000, dur: 500 }]
    s.gap = 2000; s.color = '#41c98a'
  } else {
    s.blocks = [
      { kind: 'beep', freq: 950, dur: 260, wave: 'sine' },
      { kind: 'silence', dur: 160 },
      { kind: 'beep', freq: 950, dur: 260, wave: 'sine' },
    ]
    s.gap = 1400
  }

  if (hasMod(/fast|quick|rapid/)) { s.tempo = 1.5; s.gap = Math.round(s.gap * 0.5) }
  if (hasMod(/slow|lazy|relaxed/)) { s.tempo = 0.75; s.gap = Math.round(s.gap * 1.8) }
  if (hasMod(/high/)) s.pitch = 1.3
  if (hasMod(/low|deep/)) s.pitch = 0.72
  if (hasMod(/soft|quiet|gentle/)) s.volume = 0.5
  if (hasMod(/loud/)) s.volume = 1
  if (hasMod(/not an emergency|not emergency/)) { s.gap = Math.max(s.gap, 800); s.volume = Math.min(s.volume, 0.75) }
  return s
}

/* ---------- visualisation canvas ---------- */
function VizCanvas({ snd, selBlock }: { snd: SoundProfile; selBlock: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    cv.width = cv.clientWidth * 2
    cv.height = 260
    const ctx = cv.getContext('2d')!
    ctx.clearRect(0, 0, cv.width, cv.height)

    const totalMs = snd.blocks.reduce((a, b) => a + blockDurMs(b), 0) + (snd.gap || 0)
    if (!totalMs) return
    const pxPerMs = cv.width / totalMs
    const fMin = 200, fMax = 2000
    const yOf = (f: number) => {
      const t = (Math.log(f) - Math.log(fMin)) / (Math.log(fMax) - Math.log(fMin))
      return cv.height - 24 - Math.max(0, Math.min(1, t)) * (cv.height - 48)
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (const f of [300, 500, 800, 1200, 1800]) {
      const y = yOf(f)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = '20px -apple-system, sans-serif'
      ctx.fillText(`${f} Hz`, 10, y - 6)
    }

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      r = Math.min(r, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }

    let x = 0
    const pitch = snd.pitch || 1
    snd.blocks.forEach((b, i) => {
      const w = blockDurMs(b) * pxPerMs
      const meta = kindMeta(b.kind)
      ctx.fillStyle = meta.color
      if (b.kind === 'silence') {
        ctx.globalAlpha = 0.15
        ctx.fillRect(x, cv.height - 34, w, 10)
        ctx.globalAlpha = 1
      } else if (b.kind === 'sweep') {
        const y1 = yOf((b.freq || 800) * pitch), y2 = yOf((b.freq2 || 1200) * pitch)
        ctx.beginPath()
        ctx.moveTo(x, y1 + 8); ctx.lineTo(x + w, y2 + 8)
        ctx.lineTo(x + w, y2 - 8); ctx.lineTo(x, y1 - 8)
        ctx.closePath(); ctx.fill()
      } else if (b.kind === 'warble') {
        const ym = yOf((((b.freq || 700) + (b.freq2 || 950)) / 2) * pitch)
        const amp = Math.abs(yOf((b.freq2 || 950) * pitch) - yOf((b.freq || 700) * pitch)) / 2
        ctx.beginPath()
        for (let px = 0; px <= w; px += 3) {
          const yy = ym + Math.sin((px / w) * (b.rate || 7) * Math.PI * 2) * amp
          px === 0 ? ctx.moveTo(x + px, yy) : ctx.lineTo(x + px, yy)
        }
        ctx.lineWidth = 12; ctx.strokeStyle = meta.color; ctx.stroke()
      } else if (b.kind === 'pulse') {
        const yP = yOf((b.freq || 800) * pitch)
        const count = b.count || 3
        const on = (b.dur || 150) * pxPerMs, off = (b.gapMs || 90) * pxPerMs
        for (let k = 0; k < count; k++) ctx.fillRect(x + k * (on + off), yP - 9, on, 18)
      } else {
        const yB = yOf((b.freq || 800) * pitch)
        roundRect(x + 1, yB - 9, Math.max(6, w - 2), 18, 9)
        ctx.fill()
        if (b.kind === 'chime') {
          ctx.globalAlpha = 0.25
          roundRect(x + w, yB - 9, w * 0.9, 18, 9)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      }
      if (i === selBlock) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
        ctx.strokeRect(x + 1, 8, Math.max(6, w - 2), cv.height - 16)
      }
      x += w
    })
    if (snd.gap) {
      ctx.fillStyle = 'rgba(255,255,255,0.09)'
      ctx.fillRect(x, cv.height - 34, snd.gap * pxPerMs, 10)
    }
  }, [snd, selBlock])
  return <canvas ref={ref} className="snd-viz" height={130} />
}

export default function SoundStudioView() {
  const hospital = useStore((s) => s.hospital)
  const soundId = useStore((s) => s.soundId)
  const selBlock = useStore((s) => s.selBlock)
  const set = useStore((s) => s.set)
  const updateHospital = useStore((s) => s.updateHospital)
  const confirm = useStore((s) => s.confirm)
  const toast = useStore((s) => s.toast)
  const [describe, setDescribe] = useState('')
  const [playing, setPlaying] = useState(isPreviewing())

  const snd = hospital.soundProfiles.find((s) => s.id === soundId) ?? hospital.soundProfiles[0]
  useEffect(() => {
    if (snd && soundId !== snd.id) set((s) => { s.soundId = snd.id })
  }, [snd, soundId, set])

  useEffect(() => () => { previewStop(); }, []) // stop preview when leaving the studio

  if (!snd) return <div className="empty-note">No sound profiles yet — create one.</div>

  const editSnd = (fn: (s: SoundProfile) => void) =>
    updateHospital((h) => {
      const target = h.soundProfiles.find((x) => x.id === snd.id)
      if (target) fn(target)
    })

  const block = snd.blocks[selBlock]
  const meta = block ? kindMeta(block.kind) : null
  const total = snd.blocks.reduce((a, b) => a + blockDurMs(b), 0) || 1

  const play = () => { previewStart(snd.id); setPlaying(true) }
  const stop = () => { previewStop(); setPlaying(false) }

  const addBlock = (kind: string) => {
    let b: SoundBlock = { kind: kind as any, freq: 800, dur: 300, wave: 'sine' }
    if (kind === 'chime') b = { kind: 'chime', freq: 1200, dur: 450 }
    if (kind === 'warble') b = { kind: 'warble', freq: 700, freq2: 950, rate: 7, dur: 800, wave: 'sine' }
    if (kind === 'sweep') b = { kind: 'sweep', freq: 500, freq2: 1100, dur: 500, wave: 'sine' }
    if (kind === 'pulse') b = { kind: 'pulse', freq: 800, dur: 140, count: 3, gapMs: 90, wave: 'square' }
    if (kind === 'silence') b = { kind: 'silence', dur: 300 }
    editSnd((s) => { s.blocks.push(b) })
    set((s) => { s.selBlock = snd.blocks.length })
  }

  const editBlock = (fn: (b: SoundBlock) => void) =>
    editSnd((s) => {
      const b = s.blocks[selBlock]
      if (b) fn(b)
    })

  const moveBlock = (dir: 1 | -1) => {
    const j = selBlock + dir
    if (selBlock < 0 || j < 0 || j >= snd.blocks.length) return
    editSnd((s) => {
      ;[s.blocks[selBlock], s.blocks[j]] = [s.blocks[j], s.blocks[selBlock]]
    })
    set((s) => { s.selBlock = j })
  }

  return (
    <div className="studio-layout view-enter">
      {/* ---- profile list ---- */}
      <aside className="studio-side card">
        <SideTitle>Sound Profiles</SideTitle>
        <div className="sound-list">
          {hospital.soundProfiles.map((s) => {
            const used = usedByCount(s.id)
            return (
              <button
                key={s.id}
                className={`sound-item${s.id === snd.id ? ' active' : ''}`}
                onClick={() => { previewStop(); setPlaying(false); set((st) => { st.soundId = s.id; st.selBlock = -1 }) }}
              >
                <span className="dot" style={{ background: s.color || '#888' }} />
                <span className="snd-name">{s.name}</span>
                {used > 0 && <span className="snd-used">{used} btn</span>}
              </button>
            )
          })}
        </div>
        <div className="row-btns">
          <Pill icon="plus" onClick={() => {
            const s: SoundProfile = {
              id: uid('snd'), name: 'New Alarm', color: '#034f46',
              pitch: 1, tempo: 1, volume: 0.8, gap: 1000,
              blocks: [{ kind: 'beep', freq: 900, dur: 250, wave: 'sine' }],
            }
            updateHospital((h) => { h.soundProfiles.push(s) })
            set((st) => { st.soundId = s.id; st.selBlock = -1 })
          }}>New</Pill>
          <Pill icon="copy" onClick={() => {
            const copy: SoundProfile = JSON.parse(JSON.stringify(snd))
            copy.id = uid('snd')
            copy.name = `${snd.name} (copy)`
            updateHospital((h) => { h.soundProfiles.push(copy) })
            set((st) => { st.soundId = copy.id })
          }}>Duplicate</Pill>
          <Pill icon="trash" kind="danger" onClick={async () => {
            const used = usedByCount(snd.id)
            if (!(await confirm(`Delete “${snd.name}”?`, used ? `${used} button(s) use it and will go silent.` : undefined, 'Delete', true))) return
            previewStop(); setPlaying(false)
            updateHospital((h) => { h.soundProfiles = h.soundProfiles.filter((s) => s.id !== snd.id) })
            set((st) => { st.soundId = null; st.selBlock = -1 })
            toast('Sound profile deleted')
          }}>Delete</Pill>
        </div>

        <SideTitle>Describe it</SideTitle>
        <div className="describe-box">
          <input
            className="field"
            placeholder="urgent but not an emergency"
            value={describe}
            onChange={(e) => setDescribe(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('genBtn')?.click() }}
          />
          <Pill icon="sparkle" className="gen-btn" onClick={() => {
            if (!describe.trim()) return
            const s = generateFromDescription(describe.trim())
            updateHospital((h) => { h.soundProfiles.push(s) })
            set((st) => { st.soundId = s.id; st.selBlock = -1 })
            previewStart(s.id); setPlaying(true)
            setTimeout(() => { previewStop(); setPlaying(false) }, 3500)
          }}><span id="genBtn">Generate</span></Pill>
        </div>
      </aside>

      {/* ---- editor ---- */}
      <section className="studio-main">
        <div className="studio-header">
          <input className="big-name" value={snd.name} spellCheck={false} onChange={(e) => editSnd((s) => { s.name = e.target.value })} />
          <div className="transport">
            <Pill icon={playing ? 'wave' : 'play'} kind="dark" className="play-pill" onClick={play}>{playing ? 'Playing' : 'Play'}</Pill>
            <Pill icon="stop" onClick={stop}>Stop</Pill>
          </div>
        </div>

        {/* the dark stage — viz + recipe timeline */}
        <div className="stage-dark">
          <VizCanvas snd={snd} selBlock={selBlock} />
          <div className="timeline">
            <AnimatePresence initial={false} mode="popLayout">
              {snd.blocks.map((b, i) => {
                const m = kindMeta(b.kind)
                const wPct = Math.max(9, (blockDurMs(b) / (total + (snd.gap || 0))) * 100)
                return (
                  <motion.button
                    key={i}
                    layout
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.14 } }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className={`tblock k-${b.kind}${i === selBlock ? ' on' : ''}`}
                    style={{ ['--bc' as any]: m.color, width: `${wPct}%` }}
                    onClick={() => set((s) => { s.selBlock = i })}
                  >
                    <span className="tb-kind">{m.name}</span>
                    <span className="tb-info">{b.kind === 'silence' ? `${b.dur || 300}ms` : `${Math.round(b.freq || 800)}Hz`}</span>
                  </motion.button>
                )
              })}
            </AnimatePresence>
            {snd.gap > 0 && (
              <div className="tgap" style={{ width: `${Math.min(30, Math.max(6, (snd.gap / (total + snd.gap)) * 100))}%` }}>
                gap {snd.gap}ms
              </div>
            )}
            <div className="trepeat"><Icon name="loop" size={15} /></div>
          </div>
        </div>

        <div className="block-palette">
          {BLOCK_KINDS.map((k) => (
            <button key={k.kind} className="pal-chip" style={{ ['--pc' as any]: k.color }} onClick={() => addBlock(k.kind)}>
              <Icon name="plus" size={11} /> {k.name}
            </button>
          ))}
        </div>

        {/* selected block */}
        <div className="block-params card">
          {!block ? (
            <div className="hint-block">Select a block on the timeline to tune it.</div>
          ) : (
            <>
              <div className="bp-head">
                <span className="dot" style={{ background: meta!.color }} /> {meta!.name} block
                <span className="bp-actions">
                  <Pill icon="chevronL" onClick={() => moveBlock(-1)} title="Move earlier" />
                  <Pill icon="chevronR" onClick={() => moveBlock(1)} title="Move later" />
                  <Pill icon="trash" kind="danger" onClick={() => {
                    editSnd((s) => { s.blocks.splice(selBlock, 1) })
                    set((s) => { s.selBlock = -1 })
                  }}>Remove</Pill>
                </span>
              </div>
              <div className="bp-grid">
                {block.kind !== 'silence' && (
                  <SliderField
                    label={block.kind === 'warble' || block.kind === 'sweep' ? 'Freq A' : 'Frequency'}
                    min={200} max={2000} value={block.freq || 800} display={`${block.freq || 800}Hz`}
                    onChange={(v) => editBlock((b) => { b.freq = v })}
                  />
                )}
                {(block.kind === 'warble' || block.kind === 'sweep') && (
                  <SliderField label="Freq B" min={200} max={2000} value={block.freq2 || 1000} display={`${block.freq2 || 1000}Hz`} onChange={(v) => editBlock((b) => { b.freq2 = v })} />
                )}
                {block.kind === 'warble' && (
                  <SliderField label="Warble rate" min={2} max={16} value={block.rate || 7} display={`${block.rate || 7}/s`} onChange={(v) => editBlock((b) => { b.rate = v })} />
                )}
                {block.kind === 'pulse' && (
                  <>
                    <SliderField label="Pulses" min={1} max={8} value={block.count || 3} onChange={(v) => editBlock((b) => { b.count = v })} />
                    <SliderField label="Pulse gap" min={30} max={300} value={block.gapMs || 90} display={`${block.gapMs || 90}ms`} onChange={(v) => editBlock((b) => { b.gapMs = v })} />
                  </>
                )}
                <SliderField
                  label={block.kind === 'pulse' ? 'Pulse length' : 'Duration'}
                  min={40} max={1500} value={block.dur || 300} display={`${block.dur || 300}ms`}
                  onChange={(v) => editBlock((b) => { b.dur = v })}
                />
                {['beep', 'pulse', 'sweep', 'warble'].includes(block.kind) && (
                  <SelectField
                    label="Tone"
                    value={block.wave || 'sine'}
                    options={['sine', 'triangle', 'square', 'sawtooth'].map((w) => ({ value: w, label: w }))}
                    onChange={(v) => editBlock((b) => { b.wave = v as OscillatorType })}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* simple mode */}
        <SideTitle>Simple mode</SideTitle>
        <div className="simple-grid card">
          <SliderField label="Pitch" min={50} max={200} value={Math.round((snd.pitch || 1) * 100)} display={`${Math.round((snd.pitch || 1) * 100)}%`} onChange={(v) => editSnd((s) => { s.pitch = v / 100 })} />
          <SliderField label="Tempo" min={50} max={200} value={Math.round((snd.tempo || 1) * 100)} display={`${Math.round((snd.tempo || 1) * 100)}%`} onChange={(v) => editSnd((s) => { s.tempo = v / 100 })} />
          <SliderField label="Repeat gap" min={0} max={4000} value={snd.gap || 0} display={`${snd.gap || 0}ms`} onChange={(v) => editSnd((s) => { s.gap = v })} />
          <SliderField label="Volume" min={0} max={100} value={Math.round((snd.volume ?? 0.8) * 100)} display={`${Math.round((snd.volume ?? 0.8) * 100)}%`} onChange={(v) => editSnd((s) => { s.volume = v / 100 })} />
        </div>
      </section>
    </div>
  )
}
