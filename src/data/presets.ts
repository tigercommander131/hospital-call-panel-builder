/* Preset hospitals, sound recipes and the component library */
import { Hospital, Panel, PanelComponent, SoundProfile, uid, Behaviour } from './types'

export function defaultSoundProfiles(): SoundProfile[] {
  return [
    {
      id: 'snd_emergency', name: 'Emergency (AU continuous)', color: '#e01b24',
      pitch: 1, tempo: 1, volume: 0.9, gap: 0,
      blocks: [
        { kind: 'beep', freq: 800, dur: 240, wave: 'square' },
        { kind: 'beep', freq: 1000, dur: 240, wave: 'square' },
      ],
    },
    {
      id: 'snd_nurse', name: 'Nurse Call (soft chime)', color: '#199a53',
      pitch: 1, tempo: 1, volume: 0.65, gap: 1700,
      blocks: [{ kind: 'chime', freq: 1200, dur: 480 }],
    },
    {
      id: 'snd_assist', name: 'Staff Assist (double beep)', color: '#e3c800',
      pitch: 1, tempo: 1, volume: 0.8, gap: 1100,
      blocks: [
        { kind: 'beep', freq: 880, dur: 170, wave: 'triangle' },
        { kind: 'silence', dur: 110 },
        { kind: 'beep', freq: 880, dur: 170, wave: 'triangle' },
      ],
    },
    {
      id: 'snd_orderly', name: 'Orderly (low two-tone)', color: '#8c2fc7',
      pitch: 1, tempo: 1, volume: 0.7, gap: 2300,
      blocks: [
        { kind: 'chime', freq: 620, dur: 330 },
        { kind: 'chime', freq: 760, dur: 380 },
      ],
    },
    {
      id: 'snd_codeblue', name: 'Code Blue (urgent warble)', color: '#1668dd',
      pitch: 1, tempo: 1, volume: 0.9, gap: 120,
      blocks: [{ kind: 'warble', freq: 700, freq2: 950, rate: 9, dur: 900, wave: 'square' }],
    },
    {
      id: 'snd_nhs', name: 'NHS Ward (warble)', color: '#ff7f27',
      pitch: 1, tempo: 1, volume: 0.75, gap: 900,
      blocks: [{ kind: 'warble', freq: 520, freq2: 660, rate: 6, dur: 700, wave: 'sine' }],
    },
    {
      id: 'snd_us_dingdong', name: 'US Ding-Dong', color: '#a0c4ff',
      pitch: 1, tempo: 1, volume: 0.7, gap: 2400,
      blocks: [
        { kind: 'chime', freq: 660, dur: 420 },
        { kind: 'chime', freq: 528, dur: 620 },
      ],
    },
  ]
}

export function comp(type: PanelComponent['type'], props: Partial<PanelComponent> = {}): PanelComponent {
  return { id: uid('c'), type, x: 50, y: 50, ...props }
}

export function behaviourCall(label: string, color: string, priority: number, soundId: string, latching = true): Behaviour {
  return { action: 'call', callLabel: label, callColor: color, priority, sound: soundId, latching, flash: true }
}

/* ---------- Merlon-IP style panels, from the NBH photos ---------- */
export function makeNursePanelNBH(): Panel {
  return {
    id: uid('p'), name: 'Bed Panel — Nurse',
    w: 100, h: 138,
    face: { color: '#5b5f64', radius: 9, surround: 'none' },
    components: [
      comp('flap', { x: 0, y: 104, h: 28 }),
      comp('wedge', {
        corner: 'tl', label: 'ASSIST', color: '#f2d500', textColor: '#111', leg: 0.46,
        behaviour: behaviourCall('STAFF ASSIST', '#f2d500', 2, 'snd_assist'),
      }),
      comp('wedge', { corner: 'tr', label: '', color: '#53575c', textColor: '#fff', leg: 0.46, behaviour: { action: 'none' } }),
      comp('wedge', {
        corner: 'bl', label: 'ORDERLY', color: '#8c2fc7', textColor: '#fff', leg: 0.46,
        behaviour: behaviourCall('ORDERLY', '#8c2fc7', 4, 'snd_orderly'),
      }),
      comp('wedge', {
        corner: 'br', label: 'CANCEL', color: '#f0efec', textColor: '#111', leg: 0.46,
        behaviour: { action: 'cancel' },
      }),
      comp('circle', {
        x: 50, y: 50, r: 24, label: 'NURSE', color: '#199a53', textColor: '#fff', icon: 'person',
        behaviour: behaviourCall('NURSE CALL', '#199a53', 3, 'snd_nurse'),
      }),
      comp('led', { x: 28, y: 28, angle: -45, color: '#38b6ff' }),
      comp('led', { x: 72, y: 28, angle: 45, color: '#38b6ff' }),
      comp('led', { x: 28, y: 72, angle: 45, color: '#38b6ff' }),
      comp('led', { x: 72, y: 72, angle: -45, color: '#38b6ff' }),
    ],
  }
}

export function makeEmergencyPanelNBH(): Panel {
  return {
    id: uid('p'), name: 'Ensuite — Emergency',
    w: 100, h: 138,
    face: { color: '#5b5f64', radius: 9, surround: 'none' },
    components: [
      comp('flap', { x: 0, y: 104, h: 28 }),
      comp('wedge', {
        corner: 'br', label: 'CANCEL', color: '#f0efec', textColor: '#111', leg: 0.46,
        behaviour: { action: 'cancel' },
      }),
      comp('circle', {
        x: 50, y: 50, r: 24, label: 'EMERGENCY', color: '#e01b24', textColor: '#fff', icon: 'person',
        behaviour: behaviourCall('EMERGENCY', '#e01b24', 1, 'snd_emergency'),
      }),
      comp('led', { x: 28, y: 28, angle: -45, color: '#38b6ff' }),
      comp('led', { x: 72, y: 28, angle: 45, color: '#38b6ff' }),
      comp('led', { x: 28, y: 72, angle: 45, color: '#38b6ff' }),
      comp('led', { x: 72, y: 72, angle: -45, color: '#38b6ff' }),
    ],
  }
}

export function makeCorridorPanelNBH(): Panel {
  const p = makeNursePanelNBH()
  p.name = 'Corridor — Nurse (white surround)'
  p.face.surround = 'white'
  p.components.push(comp('auxstrip', { x: 0, y: 104 }))
  p.components = p.components.filter((c) => c.type !== 'flap')
  return p
}

export function makeNHSPanel(): Panel {
  return {
    id: uid('p'), name: 'NHS Bedhead Unit',
    w: 150, h: 92,
    face: { color: '#e9e6df', radius: 7, surround: 'none' },
    components: [
      comp('label', { x: 75, y: 12, text: 'NURSE CALL SYSTEM', size: 5.4, color: '#5b6770', bold: true }),
      comp('rect', {
        x: 27, y: 48, w: 34, h: 40, label: 'CALL', color: '#ff7f27', textColor: '#fff', icon: 'person',
        behaviour: behaviourCall('PATIENT CALL', '#ff7f27', 3, 'snd_nhs'),
      }),
      comp('rect', {
        x: 75, y: 48, w: 34, h: 40, label: 'EMERGENCY', color: '#da291c', textColor: '#fff', icon: 'cross',
        behaviour: behaviourCall('EMERGENCY', '#da291c', 1, 'snd_emergency'),
      }),
      comp('rect', {
        x: 123, y: 48, w: 34, h: 40, label: 'RESET', color: '#768692', textColor: '#fff', icon: 'none',
        behaviour: { action: 'cancel' },
      }),
      comp('led', { x: 27, y: 78, angle: 0, color: '#ffa04a' }),
      comp('led', { x: 75, y: 78, angle: 0, color: '#ff4a4a' }),
      comp('screw', { x: 8, y: 8 }),
      comp('screw', { x: 142, y: 8 }),
      comp('screw', { x: 8, y: 84 }),
      comp('screw', { x: 142, y: 84 }),
    ],
  }
}

export function makeUSPanel(): Panel {
  return {
    id: uid('p'), name: 'US Patient Station',
    w: 120, h: 120,
    face: { color: '#f4f2ee', radius: 8, surround: 'steel' },
    components: [
      comp('label', { x: 60, y: 13, text: 'PATIENT STATION', size: 5.6, color: '#333', bold: true }),
      comp('circle', {
        x: 36, y: 52, r: 19, label: 'NURSE', color: '#ffffff', textColor: '#c81e2b', icon: 'person', ring: '#c81e2b',
        behaviour: behaviourCall('NURSE CALL', '#c81e2b', 3, 'snd_us_dingdong'),
      }),
      comp('circle', {
        x: 86, y: 52, r: 19, label: 'CODE', color: '#1668dd', textColor: '#fff', icon: 'cross',
        behaviour: behaviourCall('CODE BLUE', '#1668dd', 1, 'snd_codeblue'),
      }),
      comp('rect', {
        x: 60, y: 95, w: 52, h: 22, label: 'CANCEL', color: '#d7d3cb', textColor: '#333', icon: 'none',
        behaviour: { action: 'cancel' },
      }),
      comp('led', { x: 60, y: 70, angle: 0, color: '#38b6ff' }),
      comp('speaker', { x: 60, y: 30, r: 7 }),
    ],
  }
}

/* ---------- hospitals ---------- */
function ward(name: string, rooms: any[]) { return { id: uid('w'), name, rooms } }
function room(name: string, panelIds: string[]) { return { id: uid('r'), name, panelIds } }

export function presetNBH(): Hospital {
  const nurse = makeNursePanelNBH()
  const emerg = makeEmergencyPanelNBH()
  const corridor = makeCorridorPanelNBH()
  const panels: Record<string, Panel> = {}
  for (const p of [nurse, emerg, corridor]) panels[p.id] = p
  return {
    id: uid('h'), name: 'Northern Beaches Hospital', assetPrefix: 'NBH',
    wall: { color: '#c9dde2', plate: 'steel' },
    soundProfiles: defaultSoundProfiles(),
    panels,
    wards: [
      ward('Ward 9B', [
        room('Room 1 — Bed A', [emerg.id, nurse.id]),
        room('Room 2 — Bed A', [emerg.id, nurse.id]),
        room('Room 3 — Bariatric', [emerg.id, nurse.id]),
        room('Corridor Bay', [corridor.id]),
      ]),
      ward('Emergency Dept', [
        room('Resus 1', [emerg.id, nurse.id]),
        room('Triage', [nurse.id]),
      ]),
    ],
  }
}

export function presetGenericAU(): Hospital {
  const h = presetNBH()
  h.name = 'Generic Australian Ward'
  h.assetPrefix = 'AUW'
  const ids = Object.keys(h.panels)
  h.wards = [ward('Ward A', [room('Room 1', ids.slice(0, 2)), room('Room 2', ids.slice(0, 2))])]
  return h
}

export function presetNHS(): Hospital {
  const p = makeNHSPanel()
  return {
    id: uid('h'), name: 'NHS Ward', assetPrefix: 'NHS',
    wall: { color: '#dce7ea', plate: 'none' },
    soundProfiles: defaultSoundProfiles(),
    panels: { [p.id]: p },
    wards: [ward('Nightingale Ward', [room('Bay 1', [p.id]), room('Bay 2', [p.id]), room('Side Room', [p.id])])],
  }
}

export function presetUS(): Hospital {
  const p = makeUSPanel()
  return {
    id: uid('h'), name: 'Generic US Hospital', assetPrefix: 'USH',
    wall: { color: '#e4e0d8', plate: 'none' },
    soundProfiles: defaultSoundProfiles(),
    panels: { [p.id]: p },
    wards: [ward('Med-Surg 4', [room('Room 401', [p.id]), room('Room 402', [p.id])])],
  }
}

export const PRESETS = [
  { id: 'nbh', name: 'Northern Beaches Hospital', desc: 'Merlon-IP panels: Nurse / Assist / Orderly + ensuite Emergency, exactly like the ward photos.', make: presetNBH },
  { id: 'au', name: 'Generic Australian Ward', desc: 'Standard AU colour conventions on a compact two-room ward.', make: presetGenericAU },
  { id: 'nhs', name: 'NHS Ward', desc: 'UK bedhead unit — orange patient call, red emergency, grey reset.', make: presetNHS },
  { id: 'us', name: 'Generic US Hospital', desc: 'US patient station with Code Blue and ding-dong nurse chime.', make: presetUS },
]

export const BUTTON_LIBRARY = [
  { name: 'Emergency', color: '#e01b24', text: '#fff', priority: 1, sound: 'snd_emergency', icon: 'person' },
  { name: 'Nurse', color: '#199a53', text: '#fff', priority: 3, sound: 'snd_nurse', icon: 'person' },
  { name: 'Staff Assist', color: '#f2d500', text: '#111', priority: 2, sound: 'snd_assist', icon: 'none' },
  { name: 'Orderly', color: '#8c2fc7', text: '#fff', priority: 4, sound: 'snd_orderly', icon: 'none' },
  { name: 'Code Blue', color: '#1668dd', text: '#fff', priority: 1, sound: 'snd_codeblue', icon: 'cross' },
  { name: 'MET', color: '#ff7f27', text: '#fff', priority: 1, sound: 'snd_codeblue', icon: 'cross' },
  { name: 'Fire', color: '#c8102e', text: '#fff', priority: 1, sound: 'snd_emergency', icon: 'none' },
  { name: 'Security', color: '#14315c', text: '#fff', priority: 2, sound: 'snd_assist', icon: 'none' },
  { name: 'Cleaner', color: '#00a3a3', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' },
  { name: 'Porter', color: '#7a5230', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' },
  { name: 'Housekeeping', color: '#2e9e6b', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' },
  { name: 'Maintenance', color: '#6d747c', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' },
  { name: 'Isolation', color: '#e8850c', text: '#fff', priority: 4, sound: 'snd_nhs', icon: 'none' },
  { name: 'Tech Support', color: '#4a5568', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' },
] as const
