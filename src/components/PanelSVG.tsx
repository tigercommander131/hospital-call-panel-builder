/* PanelSVG — renders a call panel from data as pure SVG.
   Each hardware part is its own component. */
import { memo, useMemo } from 'react'
import { Panel, PanelComponent } from '../data/types'
import { wedgePath, wedgeTextTransform, triPath, BARCODE_SEQ, polarPoint, Zone } from '../engine/geometry'

let idCounter = 0

export interface PanelSVGProps {
  panel: Panel
  scale?: number
  interactive?: boolean
  editable?: boolean
  selection?: string | null
  activeComps?: Record<string, boolean>
  panelLive?: boolean
  panelFlashing?: boolean
  flashFast?: boolean
  onCompPointerDown?: (compId: string, e: React.PointerEvent) => void
}

interface Ctx extends PanelSVGProps {
  idp: string
  zone: Zone
  cx: number
  cy: number
  innerR: number
}

/* ---------- glyphs printed on buttons ----------
   Drawn to match real call-point moulding: smooth bezier
   silhouettes, rounded terminals, no hard corners. */
function PersonGlyph({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* head */}
      <circle cx="0" cy="-7.3" r="2.5" fill={color} />
      {/* arms — round-capped, angled out like the moulded figure */}
      <path d="M -2.3 -3.65 L -4.3 0.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M 2.3 -3.65 L 4.3 0.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* A-line dress with soft shoulders and rounded hem */}
      <path
        d="M 0 -4.75
           C -1.15 -4.75 -2.02 -4.32 -2.42 -3.3
           L -4.38 1.72
           C -4.66 2.42 -4.22 2.98 -3.5 2.98
           L 3.5 2.98
           C 4.22 2.98 4.66 2.42 4.38 1.72
           L 2.42 -3.3
           C 2.02 -4.32 1.15 -4.75 0 -4.75 Z"
        fill={color}
      />
      {/* legs — rounded stems */}
      <rect x="-2.1" y="2.6" width="1.62" height="5.8" rx="0.81" fill={color} />
      <rect x="0.48" y="2.6" width="1.62" height="5.8" rx="0.81" fill={color} />
    </g>
  )
}

function CrossGlyph({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
      <rect x="-1.85" y="-5.75" width="3.7" height="11.5" rx="1.15" />
      <rect x="-5.75" y="-1.85" width="11.5" height="3.7" rx="1.15" />
    </g>
  )
}

/* ---------- component renderers ---------- */
function hitProps(c: PanelComponent, ctx: Ctx) {
  const inter = ctx.interactive && c.behaviour && c.behaviour.action && c.behaviour.action !== 'none'
  const cls = ctx.editable ? `editable${ctx.selection === c.id ? ' selected' : ''}` : inter ? 'hit' : undefined
  return {
    className: cls,
    'data-comp': c.id,
    onPointerDown: ctx.onCompPointerDown ? (e: React.PointerEvent) => ctx.onCompPointerDown!(c.id, e) : undefined,
  }
}

function Flap({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  const fy = c.y ?? ctx.panel.w + 4
  const fh = c.h || 28
  const w = ctx.panel.w
  return (
    <g {...hitProps(c, ctx)}>
      <rect x="3.2" y={fy} width={w - 6.4} height={fh} rx="4.5" fill="#54585d" stroke="#3c3f43" strokeWidth="0.7" />
      <rect x="3.2" y={fy} width={w - 6.4} height={fh} rx="4.5" fill={`url(#${ctx.idp}faceSheen)`} />
      <circle cx="9.5" cy={fy + fh - 6} r="2.4" fill="#26282b" />
    </g>
  )
}

function AuxStrip({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  const ay = c.y ?? ctx.panel.w + 4
  const ah = 28
  const w = ctx.panel.w
  return (
    <g {...hitProps(c, ctx)}>
      <rect x="3.2" y={ay} width={w - 6.4} height={ah} rx="4.5" fill="#45484d" stroke="#33363a" strokeWidth="0.7" />
      <text x={w * 0.22} y={ay + 9} fontSize="4.6" fill="#d8d8d6" textAnchor="middle" fontWeight="600">AUX1</text>
      <text x={w * 0.78} y={ay + 9} fontSize="4.6" fill="#d8d8d6" textAnchor="middle" fontWeight="600">AUX2</text>
      <circle cx={w * 0.22} cy={ay + 17} r="3.4" fill="#191a1c" stroke="#8f9296" strokeWidth="1" />
      <circle cx={w * 0.78} cy={ay + 17} r="3.4" fill="#191a1c" stroke="#8f9296" strokeWidth="1" />
      <rect x={w / 2 - 7} y={ay + 8} width="14" height="15" rx="1.5" fill="#191a1c" stroke="#5b5e63" strokeWidth="0.8" />
      <rect x={w / 2 - 4.4} y={ay + 10} width="8.8" height="9" rx="1" fill="#efefec" />
    </g>
  )
}

function Wedge({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  const path = wedgePath(c.corner || 'tl', ctx.zone, ctx.cx, ctx.cy, ctx.innerR, c.leg || 0.46, (ctx.panel.face.radius || 9) * 0.9)
  const isBlank = !c.behaviour || c.behaviour.action === 'none'
  const active = ctx.activeComps?.[c.id]
  const wfs = c.size || Math.min(6.2, (26 / Math.max(4, (c.label || '').length)) * 1.55)
  return (
    <g {...hitProps(c, ctx)}>
      <g className="btn-press">
        <path
          d={path}
          fill={c.color || '#63676c'}
          stroke="#f5f5f2"
          strokeWidth="1.1"
          strokeOpacity={isBlank ? 0.55 : 0.95}
          filter={active ? `url(#${ctx.idp}btnGlow)` : undefined}
        />
        <path d={path} fill={`url(#${ctx.idp}wedgeSheen)`} pointerEvents="none" />
        {active && <path d={path} className="pulseFill" fill="#ffffff" pointerEvents="none" />}
        {c.label && (
          <text
            transform={wedgeTextTransform(c.corner || 'tl', ctx.zone, ctx.cx, ctx.cy)}
            fontSize={wfs} fontWeight="700" fill={c.textColor || '#111'}
            textAnchor="middle" dominantBaseline="middle" letterSpacing="0.3" pointerEvents="none"
          >
            {c.label}
          </text>
        )}
      </g>
    </g>
  )
}

function CircleButton({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  const r = c.r || 22
  const shape = c.shape || 'circle'
  const active = ctx.activeComps?.[c.id]
  const iconColor = c.textColor || '#fff'
  const hasLabel = !!(c.label && c.label.length)
  const hasIcon = !!(c.icon && c.icon !== 'none')
  const fx = active ? `url(#${ctx.idp}btnGlow)` : `url(#${ctx.idp}softShadow)`

  if (shape === 'oval') {
    const rx = r * 1.45, ry = r * 0.92
    const fsO = Math.min(ry * 0.5, ((rx * 1.02) / Math.max(3, (c.label || '').length)) * 1.5)
    const fsO2 = Math.min(ry * 0.62, ((rx * 1.62) / Math.max(4, (c.label || '').length)) * 1.35)
    return (
      <g {...hitProps(c, ctx)} transform={`translate(${c.x} ${c.y})`}>
        <g className="btn-press">
        <ellipse rx={rx + 1.6} ry={ry + 1.6} fill="#f2f1ee" opacity="0.92" />
        <ellipse rx={rx} ry={ry} fill={c.color || '#199a53'} filter={fx} />
        {c.ring && <ellipse rx={rx - 1.2} ry={ry - 1.2} fill="none" stroke={c.ring} strokeWidth="1.6" />}
        <ellipse rx={rx} ry={ry} fill={`url(#${ctx.idp}btnDome)`} pointerEvents="none" />
        <ellipse cy={-ry * 0.5} rx={rx * 0.55} ry={ry * 0.26} fill="#ffffff" opacity="0.15" pointerEvents="none" />
        {active && <ellipse rx={rx} ry={ry} className="pulseFill" fill="#ffffff" pointerEvents="none" />}
        {hasIcon && hasLabel ? (
          <>
            {c.icon === 'person' && <PersonGlyph x={-rx * 0.56} y={0} s={ry / 13.5} color={iconColor} />}
            {c.icon === 'cross' && <CrossGlyph x={-rx * 0.56} y={0} s={ry / 12} color={iconColor} />}
            <text x={rx * 0.2} y={fsO * 0.35} fontSize={fsO} fontWeight="700" fill={iconColor} textAnchor="middle" letterSpacing="0.2" pointerEvents="none">{c.label}</text>
          </>
        ) : (
          <>
            {c.icon === 'person' && <PersonGlyph x={0} y={0} s={ry / 10.5} color={iconColor} />}
            {c.icon === 'cross' && <CrossGlyph x={0} y={0} s={ry / 9} color={iconColor} />}
            {hasLabel && <text y={fsO2 * 0.35} fontSize={fsO2} fontWeight="700" fill={iconColor} textAnchor="middle" letterSpacing="0.3" pointerEvents="none">{c.label}</text>}
          </>
        )}
        </g>
      </g>
    )
  }

  if (shape === 'triangle') {
    const tp = triPath(r)
    const fsT = Math.min(r * 0.27, ((r * 1.15) / Math.max(3, (c.label || '').length)) * 1.45)
    return (
      <g {...hitProps(c, ctx)} transform={`translate(${c.x} ${c.y})`}>
        <g className="btn-press">
        <path d={triPath(r + 1.8)} fill="#f2f1ee" opacity="0.92" />
        <path d={tp} fill={c.color || '#86c67c'} filter={fx} />
        <path d={tp} fill={`url(#${ctx.idp}btnDome)`} pointerEvents="none" />
        {active && <path d={tp} className="pulseFill" fill="#ffffff" pointerEvents="none" />}
        {c.icon === 'person' && <PersonGlyph x={0} y={hasLabel ? -r * 0.04 : r * 0.1} s={r / 26} color={iconColor} />}
        {c.icon === 'cross' && <CrossGlyph x={0} y={hasLabel ? -r * 0.04 : r * 0.1} s={r / 22} color={iconColor} />}
        {hasLabel && <text y={hasIcon ? r * 0.58 : r * 0.3} fontSize={fsT} fontWeight="700" fill={iconColor} textAnchor="middle" pointerEvents="none">{c.label}</text>}
        </g>
      </g>
    )
  }

  const fs = Math.min(r * 0.34, ((r * 1.75) / Math.max(4, (c.label || '').length)) * 1.26)
  return (
    <g {...hitProps(c, ctx)} transform={`translate(${c.x} ${c.y})`}>
      <g className="btn-press">
      <circle r={r + 1.6} fill="#f2f1ee" opacity="0.92" />
      <circle r={r} fill={c.color || '#199a53'} filter={fx} />
      {c.ring && <circle r={r - 1.2} fill="none" stroke={c.ring} strokeWidth="1.6" />}
      <circle r={r} fill={`url(#${ctx.idp}btnDome)`} pointerEvents="none" />
      <ellipse cy={-r * 0.52} rx={r * 0.55} ry={r * 0.27} fill="#ffffff" opacity="0.15" pointerEvents="none" />
      {active && <circle r={r} className="pulseFill" fill="#ffffff" pointerEvents="none" />}
      {c.icon === 'person' && <PersonGlyph x={0} y={hasLabel ? -r * 0.18 : 0} s={r / 16.5} color={iconColor} />}
      {c.icon === 'cross' && <CrossGlyph x={0} y={hasLabel ? -r * 0.2 : 0} s={r / 14} color={iconColor} />}
      {hasLabel && (
        <text y={hasIcon ? r * 0.58 : r * 0.12} fontSize={fs} fontWeight="700" fill={iconColor} textAnchor="middle" letterSpacing="0.2" pointerEvents="none">{c.label}</text>
      )}
      </g>
    </g>
  )
}

function RectButton({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  const w = c.w || 32, h = c.h || 36
  const active = ctx.activeComps?.[c.id]
  const fx = active ? `url(#${ctx.idp}btnGlow)` : `url(#${ctx.idp}softShadow)`
  const hasIcon = !!(c.icon && c.icon !== 'none')
  const fs2 = Math.min(6.5, ((w - 6) / Math.max(3, (c.label || '').length)) * 1.5)
  const icY = c.label ? -h * 0.14 : 0
  return (
    <g {...hitProps(c, ctx)} transform={`translate(${c.x} ${c.y})`}>
      <g className="btn-press">
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="3.5" fill={c.color || '#888'} stroke="#00000030" strokeWidth="0.8" filter={fx} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="3.5" fill={`url(#${ctx.idp}btnDome)`} pointerEvents="none" />
      {active && <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="3.5" className="pulseFill" fill="#fff" pointerEvents="none" />}
      {c.icon === 'person' && <PersonGlyph x={0} y={icY} s={Math.min(w, h) / 24} color={c.textColor || '#fff'} />}
      {c.icon === 'cross' && <CrossGlyph x={0} y={icY} s={Math.min(w, h) / 20} color={c.textColor || '#fff'} />}
      {c.label && (
        <text y={hasIcon ? h * 0.32 : 1.8} fontSize={fs2} fontWeight="700" fill={c.textColor || '#fff'} textAnchor="middle" pointerEvents="none">{c.label}</text>
      )}
      </g>
    </g>
  )
}

function Led({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  const lit = ctx.panelLive
  const flash = ctx.panelFlashing
  const col = c.color || '#38b6ff'
  const cls = flash ? (ctx.flashFast ? 'ledFlash fast' : 'ledFlash') : undefined
  return (
    <g {...hitProps(c, ctx)} transform={`translate(${c.x} ${c.y}) rotate(${c.angle || 0})`}>
      <rect x="-3.4" y="-1.8" width="6.8" height="3.6" rx="1.8" fill="#22242a" />
      <rect
        x="-2.9" y="-1.4" width="5.8" height="2.8" rx="1.4"
        className={cls}
        fill={lit || flash ? col : '#3a3f47'}
        filter={lit || flash ? `url(#${ctx.idp}ledGlow)` : undefined}
      />
    </g>
  )
}

function LabelComp({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  return (
    <g {...hitProps(c, ctx)}>
      <text x={c.x} y={c.y} fontSize={c.size || 5} fill={c.color || '#eee'} textAnchor="middle" fontWeight={c.bold ? 700 : 500} letterSpacing="0.4">
        {c.text || 'LABEL'}
      </text>
    </g>
  )
}

function Barcode({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  const bw = c.w || 34, bh = bw * 0.55
  const bars = useMemo(() => {
    const out: JSX.Element[] = []
    let bx = bw * 0.08, i = 0
    while (bx < bw * 0.92) {
      const w = BARCODE_SEQ[i % BARCODE_SEQ.length] * (bw * 0.84 / 60)
      if (i % 2 === 0) out.push(<rect key={i} x={bx} y={bh * 0.38} width={w} height={bh * 0.34} fill="#111" />)
      bx += w; i++
    }
    return out
  }, [bw, bh])
  return (
    <g {...hitProps(c, ctx)} transform={`translate(${c.x - bw / 2} ${c.y - bh / 2})`}>
      <rect x="-2" y="-2" width={bw + 4} height={bh + 4} rx="1.5" fill="#fbfbf8" filter={`url(#${ctx.idp}softShadow)`} />
      <text x={bw / 2} y={bh * 0.28} fontSize={bw * 0.2} fontWeight="800" fill="#111" textAnchor="middle">{c.text || 'NBH'}</text>
      {bars}
      <text x={bw / 2} y={bh * 0.94} fontSize={bw * 0.13} fill="#222" textAnchor="middle">{c.code || '023061'}</text>
    </g>
  )
}

function Speaker({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  const sr = c.r || 8
  const holes = useMemo(() => {
    const out: JSX.Element[] = []
    for (let ri = 0; ri < 3; ri++) {
      const n = ri === 0 ? 1 : ri * 6
      for (let k = 0; k < n; k++) {
        const p = polarPoint(0, 0, ri * sr * 0.32, k * (360 / n))
        out.push(<circle key={`${ri}-${k}`} cx={p[0]} cy={p[1]} r={sr * 0.08} fill="#1c1e21" />)
      }
    }
    return out
  }, [sr])
  return (
    <g {...hitProps(c, ctx)} transform={`translate(${c.x} ${c.y})`}>
      <circle r={sr} fill="#4a4d52" stroke="#33363a" strokeWidth="0.6" />
      {holes}
    </g>
  )
}

function Screw({ c, ctx }: { c: PanelComponent; ctx: Ctx }) {
  return (
    <g {...hitProps(c, ctx)} transform={`translate(${c.x} ${c.y})`}>
      <circle r="3" fill={`url(#${ctx.idp}steelV)`} stroke="#7d8184" strokeWidth="0.5" />
      <rect x="-2.1" y="-0.45" width="4.2" height="0.9" rx="0.4" fill="#6d7073" transform="rotate(20)" />
      <rect x="-0.45" y="-2.1" width="0.9" height="4.2" rx="0.4" fill="#6d7073" transform="rotate(20)" />
    </g>
  )
}

const RENDERERS: Record<string, (p: { c: PanelComponent; ctx: Ctx }) => JSX.Element | null> = {
  flap: Flap,
  auxstrip: AuxStrip,
  wedge: Wedge,
  circle: CircleButton,
  rect: RectButton,
  led: Led,
  label: LabelComp,
  barcode: Barcode,
  speaker: Speaker,
  screw: Screw,
}

function SelectionOutline({ panel, selection }: { panel: Panel; selection: string }) {
  const c = panel.components.find((k) => k.id === selection)
  if (!c || c.x == null || !['circle', 'rect', 'led', 'label', 'barcode', 'speaker', 'screw'].includes(c.type)) return null
  let hw: number, hh: number
  if (c.type === 'circle') {
    const r = c.r || 22
    const sh = c.shape || 'circle'
    hw = sh === 'oval' ? r * 1.45 : r
    hh = sh === 'oval' ? r * 0.92 : r
  } else {
    hw = (c.w || 16) / 2 + 3
    hh = (c.h || (c.type === 'barcode' ? (c.w || 34) * 0.55 : 12)) / 2 + 3
  }
  return (
    <g pointerEvents="none">
      <rect
        x={c.x - hw - 2} y={c.y - hh - 2} width={hw * 2 + 4} height={hh * 2 + 4}
        fill="none" stroke="#0071e3" strokeWidth="0.9" strokeDasharray="3 2" rx="2"
      />
    </g>
  )
}

export const PanelSVG = memo(function PanelSVG(props: PanelSVGProps) {
  const { panel, scale = 3 } = props
  const idp = useMemo(() => `pp${++idCounter}_`, [])

  const surround = panel.face.surround || 'none'
  const pad = surround === 'none' ? 4 : 12
  const hasBarcodeAbove = panel.components.some((c) => c.type === 'barcode' && c.y < 0)
  const topPad = pad + (hasBarcodeAbove ? 14 : 0)
  const vbW = panel.w + pad * 2
  const vbH = panel.h + topPad + pad

  const zonePad = 4
  const zoneSize = panel.w - zonePad * 2
  const zone: Zone = { x0: zonePad, y0: zonePad, x1: panel.w - zonePad, y1: zonePad + zoneSize }
  const cx = panel.w / 2
  const cy = zonePad + zoneSize / 2
  const circles = panel.components.filter((k) => k.type === 'circle')
  const maxR = circles.length ? Math.max(...circles.map((k) => k.r || 22)) : zoneSize * 0.24
  const innerR = maxR + 13.5

  const ctx: Ctx = { ...props, idp, zone, cx, cy, innerR }

  return (
    <svg
      className="panel-svg"
      data-panel={panel.id}
      width={vbW * scale}
      height={vbH * scale}
      viewBox={`${-pad} ${-topPad} ${vbW} ${vbH}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${idp}faceSheen`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.10" />
        </linearGradient>
        <radialGradient id={`${idp}btnDome`} cx="0.38" cy="0.3" r="0.95">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="0.85" stopColor="#000000" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.28" />
        </radialGradient>
        <linearGradient id={`${idp}wedgeSheen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.30" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id={`${idp}surroundWhite`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdfcf9" />
          <stop offset="0.5" stopColor="#f1efe8" />
          <stop offset="1" stopColor="#dedbd2" />
        </linearGradient>
        <linearGradient id={`${idp}steelV`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8cbce" />
          <stop offset="0.18" stopColor="#b3b7ba" />
          <stop offset="0.42" stopColor="#d7dadd" />
          <stop offset="0.62" stopColor="#a9adb1" />
          <stop offset="0.85" stopColor="#c2c6c9" />
          <stop offset="1" stopColor="#9fa3a7" />
        </linearGradient>
        <filter id={`${idp}brushed`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.012" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.72  0 0 0 0 0.73  0 0 0 0 0.75  0 0 0 0.25 0" result="tex" />
          <feComposite in="tex" in2="SourceGraphic" operator="atop" />
        </filter>
        <filter id={`${idp}ledGlow`} x="-220%" y="-220%" width="540%" height="540%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${idp}btnGlow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="b" />
          <feMerge>
            <feMergeNode in="b" /><feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${idp}softShadow`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.1" stdDeviation="1.4" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>

      {surround === 'white' && (
        <>
          <rect x={-pad + 1} y={-topPad + 1} width={vbW - 2} height={vbH - 2} rx="10" fill={`url(#${idp}surroundWhite)`} stroke="#c9c5ba" strokeWidth="0.8" filter={`url(#${idp}softShadow)`} />
          <rect x={-pad + 3.4} y={-topPad + 3.4} width={vbW - 6.8} height={vbH - 6.8} rx="8" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1" />
          <text x={panel.w * 0.13} y={panel.h + pad * 0.55} fontSize="5" fill="#b9b5aa" fontWeight="700" fontStyle="italic">merlon</text>
        </>
      )}
      {surround === 'steel' && (
        <g filter={`url(#${idp}brushed)`}>
          <rect x={-pad + 1} y={-topPad + 1} width={vbW - 2} height={vbH - 2} rx="3" fill={`url(#${idp}steelV)`} stroke="#8b8f93" strokeWidth="0.7" />
        </g>
      )}

      {/* face module */}
      <rect x="-1.6" y="-1.6" width={panel.w + 3.2} height={panel.h + 3.2} rx={(panel.face.radius || 9) + 1.5} fill="#2e3033" />
      <rect x="0" y="0" width={panel.w} height={panel.h} rx={panel.face.radius || 9} fill={panel.face.color || '#5b5f64'} />
      <rect x="0" y="0" width={panel.w} height={panel.h} rx={panel.face.radius || 9} fill={`url(#${idp}faceSheen)`} />

      {panel.components.map((c) => {
        if (c.type === 'brand') {
          return (
            <text key={c.id} x={panel.w - 6} y={panel.h - 5.5} fontSize="3.8" fill="#c9c9c6" textAnchor="end" fontWeight="600" letterSpacing="0.2">
              merlon-IP
            </text>
          )
        }
        const R = RENDERERS[c.type]
        return R ? <R key={c.id} c={c} ctx={ctx} /> : null
      })}

      {props.editable && props.selection && <SelectionOutline panel={panel} selection={props.selection} />}
    </svg>
  )
})
