/* Alarm playback engine — every alarm is synthesised from a recipe.
   No audio files anywhere in the app. */
import { SoundBlock, SoundProfile } from '../data/types'
import { useStore, activeCallsSorted } from '../state/store'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let currentLoop: { stop: () => void } | null = null
let currentSoundId: string | null = null
let previewLoop: { stop: () => void } | null = null

export function ensureCtx(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = useStore.getState().muted ? 0 : 1
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m: boolean) {
  if (master) master.gain.value = m ? 0 : 1
}

/* ---- schedule a single block, returns duration in seconds ---- */
function scheduleBlock(block: SoundBlock, t0: number, out: AudioNode, pitch: number, tempo: number): number {
  const freq = (block.freq || 800) * pitch
  const freq2 = (block.freq2 || (block.freq || 800)) * pitch
  const dur = Math.max(0.02, (block.dur || 300) / 1000 / tempo)
  const kind = block.kind
  if (kind === 'silence') return dur

  const g = ctx!.createGain()
  g.connect(out)

  const osc = (type: OscillatorType, f: number) => {
    const o = ctx!.createOscillator()
    o.type = type || 'sine'
    o.frequency.setValueAtTime(f, t0)
    o.connect(g)
    return o
  }

  if (kind === 'beep') {
    const o = osc(block.wave || 'sine', freq)
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(0.9, t0 + 0.008)
    g.gain.setValueAtTime(0.9, t0 + dur - 0.015)
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
    o.start(t0); o.stop(t0 + dur + 0.02)
    return dur
  }

  if (kind === 'chime') {
    const tail = dur * 1.9
    ;[1, 2.76, 5.4].forEach((mult, i) => {
      const o = osc('sine', freq * mult)
      const pg = ctx!.createGain()
      o.disconnect(); o.connect(pg); pg.connect(g)
      pg.gain.setValueAtTime([0.85, 0.22, 0.07][i], t0)
      pg.gain.exponentialRampToValueAtTime(0.0008, t0 + tail)
      o.start(t0); o.stop(t0 + tail + 0.05)
    })
    g.gain.setValueAtTime(1, t0)
    return dur // tail rings under the next block — musical
  }

  if (kind === 'pulse') {
    const count = Math.max(1, block.count || 3)
    const on = dur
    const off = Math.max(0.02, (block.gapMs || 90) / 1000 / tempo)
    for (let i = 0; i < count; i++) {
      const ts = t0 + i * (on + off)
      const o = osc(block.wave || 'square', freq)
      const pg = ctx!.createGain()
      o.disconnect(); o.connect(pg); pg.connect(g)
      pg.gain.setValueAtTime(0, ts)
      pg.gain.linearRampToValueAtTime(0.85, ts + 0.006)
      pg.gain.setValueAtTime(0.85, ts + on - 0.012)
      pg.gain.linearRampToValueAtTime(0.0001, ts + on)
      o.start(ts); o.stop(ts + on + 0.02)
    }
    g.gain.setValueAtTime(1, t0)
    return count * (dur + off)
  }

  if (kind === 'sweep') {
    const o = osc(block.wave || 'sine', freq)
    o.frequency.linearRampToValueAtTime(freq2, t0 + dur)
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(0.85, t0 + 0.01)
    g.gain.setValueAtTime(0.85, t0 + dur - 0.03)
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
    o.start(t0); o.stop(t0 + dur + 0.02)
    return dur
  }

  if (kind === 'warble') {
    const o = osc(block.wave || 'sine', (freq + freq2) / 2)
    const lfo = ctx!.createOscillator()
    lfo.type = 'square'
    lfo.frequency.setValueAtTime(block.rate || 7, t0)
    const lfoGain = ctx!.createGain()
    lfoGain.gain.setValueAtTime(Math.abs(freq2 - freq) / 2, t0)
    lfo.connect(lfoGain); lfoGain.connect(o.frequency)
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(0.8, t0 + 0.01)
    g.gain.setValueAtTime(0.8, t0 + dur - 0.03)
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
    o.start(t0); lfo.start(t0)
    o.stop(t0 + dur + 0.02); lfo.stop(t0 + dur + 0.02)
    return dur
  }

  const o = osc('sine', freq)
  g.gain.setValueAtTime(0.7, t0)
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
  o.start(t0); o.stop(t0 + dur)
  return dur
}

/* ---- play one iteration of a recipe, returns total ms ---- */
export function playOnce(profile: SoundProfile, dest?: AudioNode): number {
  if (!ensureCtx()) return 0
  const pitch = profile.pitch || 1
  const tempo = profile.tempo || 1
  const vol = profile.volume == null ? 0.8 : profile.volume
  const g = ctx!.createGain()
  g.gain.value = vol * 0.55
  g.connect(dest || master!)
  const t = ctx!.currentTime + 0.03
  let total = 0
  for (const b of profile.blocks || []) total += scheduleBlock(b, t + total, g, pitch, tempo)
  setTimeout(() => { try { g.disconnect() } catch {} }, (total + 3) * 1000)
  return total * 1000
}

/* ---- looping playback through a private gate so stop() is instant.
       getProfile is called fresh each iteration → live retuning. ---- */
function makeLoop(getProfile: () => SoundProfile | undefined) {
  if (!ensureCtx()) return null
  const gate = ctx!.createGain()
  gate.gain.value = 1
  gate.connect(master!)
  let stopped = false
  let timer: ReturnType<typeof setTimeout>
  const iter = () => {
    if (stopped) return
    const profile = getProfile()
    if (!profile) { stop(); return }
    const ms = playOnce(profile, gate)
    const gap = Math.max(30, (profile.gap == null ? 800 : profile.gap) / (profile.tempo || 1))
    timer = setTimeout(iter, ms + gap)
  }
  const stop = () => {
    stopped = true
    clearTimeout(timer)
    try {
      gate.gain.setValueAtTime(0, ctx!.currentTime)
      gate.disconnect()
    } catch {}
  }
  iter()
  return { stop }
}

function profileById(id: string) {
  return () => useStore.getState().hospital.soundProfiles.find((s) => s.id === id)
}

function stopAlarm() {
  currentLoop?.stop()
  currentLoop = null
  currentSoundId = null
}

/* ---- arbitration: play the highest-priority active call ---- */
export function arbitrate() {
  if (previewLoop) return // Sound Studio preview owns the speakers
  const calls = activeCallsSorted(useStore.getState().calls)
  const top = calls[0]
  const wantId = top && top.sound ? top.sound : null
  if (wantId === currentSoundId) return
  stopAlarm()
  if (wantId) {
    currentLoop = makeLoop(profileById(wantId))
    currentSoundId = currentLoop ? wantId : null
  }
}

/* ---- tiny UI tick ---- */
export function clickTick(freq = 2200) {
  if (!ensureCtx()) return
  const t = ctx!.currentTime
  const o = ctx!.createOscillator()
  const g = ctx!.createGain()
  o.type = 'sine'; o.frequency.value = freq
  o.connect(g); g.connect(master!)
  g.gain.setValueAtTime(0.12, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
  o.start(t); o.stop(t + 0.08)
}

/* ---- Sound Studio preview ---- */
export function previewStart(soundId: string) {
  previewLoop?.stop()
  stopAlarm()
  previewLoop = makeLoop(profileById(soundId))
}
export function previewStop() {
  previewLoop?.stop()
  previewLoop = null
  arbitrate() // resume live alarm if calls are still active
}
export function isPreviewing() {
  return !!previewLoop
}

/* wire arbitration + mute to the store */
useStore.subscribe((state, prev) => {
  if (state.calls !== prev.calls) arbitrate()
  if (state.muted !== prev.muted) setMuted(state.muted)
})

/* wake the audio context on first interaction (autoplay policy) */
const wake = () => {
  ensureCtx()
  document.removeEventListener('pointerdown', wake)
}
document.addEventListener('pointerdown', wake)
