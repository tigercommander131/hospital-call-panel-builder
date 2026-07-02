/* Data model — everything is data driven:
   Hospital → Wards → Rooms → Panels → Components → Behaviour → Sound Profile */

export type BlockKind = 'beep' | 'chime' | 'pulse' | 'sweep' | 'warble' | 'silence'

export interface SoundBlock {
  kind: BlockKind
  freq?: number
  freq2?: number
  dur?: number
  wave?: OscillatorType
  rate?: number
  count?: number
  gapMs?: number
}

export interface SoundProfile {
  id: string
  name: string
  color: string
  pitch: number
  tempo: number
  volume: number
  gap: number
  blocks: SoundBlock[]
}

export interface Behaviour {
  action: 'call' | 'cancel' | 'none'
  callLabel?: string
  callColor?: string
  priority?: number
  sound?: string | null
  latching?: boolean
  flash?: boolean
}

export type CompType =
  | 'circle' | 'rect' | 'wedge' | 'led' | 'label' | 'barcode'
  | 'speaker' | 'screw' | 'auxstrip' | 'flap' | 'brand'

export type ButtonShape = 'circle' | 'oval' | 'triangle'

export interface PanelComponent {
  id: string
  type: CompType
  x: number
  y: number
  w?: number
  h?: number
  r?: number
  shape?: ButtonShape
  corner?: 'tl' | 'tr' | 'bl' | 'br'
  leg?: number
  angle?: number
  size?: number
  label?: string
  text?: string
  code?: string
  color?: string
  textColor?: string
  ring?: string
  icon?: 'person' | 'cross' | 'none'
  bold?: boolean
  behaviour?: Behaviour
}

export interface Panel {
  id: string
  name: string
  w: number
  h: number
  face: { color: string; radius: number; surround: 'none' | 'white' | 'steel' }
  components: PanelComponent[]
}

export interface Room {
  id: string
  name: string
  panelIds: string[]
}

export interface Ward {
  id: string
  name: string
  rooms: Room[]
}

export interface Hospital {
  id: string
  name: string
  assetPrefix: string
  wall: { color: string; plate: 'steel' | 'none' }
  soundProfiles: SoundProfile[]
  panels: Record<string, Panel>
  wards: Ward[]
}

export interface Call {
  key: string
  roomId: string
  panelId: string
  compId: string
  startedAt: number
  callLabel: string
  callColor: string
  priority: number
  sound: string | null
  latching: boolean
}

export type ViewName = 'simulate' | 'builder' | 'sounds' | 'hospital'

let uidCounter = 0
export function uid(prefix = 'id'): string {
  uidCounter++
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}_${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function callKey(roomId: string, panelId: string, compId: string) {
  return `${roomId}|${panelId}|${compId}`
}
