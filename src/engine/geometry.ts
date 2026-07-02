/* Pure geometry helpers for the panel renderer */

export interface Zone { x0: number; y0: number; x1: number; y1: number }

const f = (n: number) => Math.round(n * 100) / 100

/* corner wedge with a concave arc hugging the centre button */
export function wedgePath(
  corner: 'tl' | 'tr' | 'bl' | 'br',
  zone: Zone, cx: number, cy: number,
  innerR: number, legFrac = 0.46, cr = 8
): string {
  const { x0, y0, x1, y1 } = zone
  const L = (x1 - x0) * legFrac
  let cornerPt: [number, number], P1: [number, number], P2: [number, number]
  if (corner === 'tl') { cornerPt = [x0, y0]; P1 = [x0 + L, y0]; P2 = [x0, y0 + L] }
  else if (corner === 'tr') { cornerPt = [x1, y0]; P1 = [x1, y0 + L]; P2 = [x1 - L, y0] }
  else if (corner === 'br') { cornerPt = [x1, y1]; P1 = [x1 - L, y1]; P2 = [x1, y1 - L] }
  else { cornerPt = [x0, y1]; P1 = [x0, y1 - L]; P2 = [x0 + L, y1] }

  const onCircle = (p: [number, number]): [number, number] => {
    const dx = p[0] - cx, dy = p[1] - cy
    const d = Math.hypot(dx, dy) || 1
    return [cx + innerR * dx / d, cy + innerR * dy / d]
  }
  const Q1 = onCircle(P1), Q2 = onCircle(P2)

  const ang = (p: [number, number]) => Math.atan2(p[1] - cy, p[0] - cx)
  let delta = ang(Q1) - ang(Q2)
  while (delta > Math.PI) delta -= 2 * Math.PI
  while (delta < -Math.PI) delta += 2 * Math.PI
  const sweep = delta > 0 ? 1 : 0

  const [cxn, cyn] = cornerPt
  const e1 = [cxn + Math.sign(P1[0] - cxn) * cr, cyn + Math.sign(P1[1] - cyn) * cr]
  const e2 = [cxn + Math.sign(P2[0] - cxn) * cr, cyn + Math.sign(P2[1] - cyn) * cr]

  return (
    `M ${f(P1[0])} ${f(P1[1])}` +
    ` L ${f(e1[0])} ${f(e1[1])}` +
    ` Q ${f(cxn)} ${f(cyn)} ${f(e2[0])} ${f(e2[1])}` +
    ` L ${f(P2[0])} ${f(P2[1])}` +
    ` Q ${f((P2[0] + Q2[0]) / 2 + (P2[0] - cxn) * 0.04)} ${f((P2[1] + Q2[1]) / 2 + (P2[1] - cyn) * 0.04)} ${f(Q2[0])} ${f(Q2[1])}` +
    ` A ${f(innerR)} ${f(innerR)} 0 0 ${sweep} ${f(Q1[0])} ${f(Q1[1])}` +
    ` Q ${f((P1[0] + Q1[0]) / 2 + (P1[0] - cxn) * 0.04)} ${f((P1[1] + Q1[1]) / 2 + (P1[1] - cyn) * 0.04)} ${f(P1[0])} ${f(P1[1])}` +
    ` Z`
  )
}

export function wedgeTextTransform(
  corner: 'tl' | 'tr' | 'bl' | 'br', zone: Zone, cx: number, cy: number
): string {
  const { x0, y0, x1, y1 } = zone
  const cornerPt = { tl: [x0, y0], tr: [x1, y0], bl: [x0, y1], br: [x1, y1] }[corner]
  const tx = cx + (cornerPt[0] - cx) * 0.73
  const ty = cy + (cornerPt[1] - cy) * 0.73
  const rot = corner === 'tl' || corner === 'br' ? -45 : 45
  return `translate(${f(tx)} ${f(ty)}) rotate(${rot})`
}

/* rounded polygon (triangle buttons) */
export function roundedPolyPath(pts: [number, number][], rr: number): string {
  const toward = (a: [number, number], b: [number, number], dist: number): [number, number] => {
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const L = Math.hypot(dx, dy) || 1
    return [a[0] + (dx / L) * dist, a[1] + (dy / L) * dist]
  }
  const n = pts.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const p = pts[i], prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n]
    const pIn = toward(p, prev, rr), pOut = toward(p, next, rr)
    d += (i === 0 ? 'M ' : ' L ') + `${f(pIn[0])} ${f(pIn[1])}`
    d += ` Q ${f(p[0])} ${f(p[1])} ${f(pOut[0])} ${f(pOut[1])}`
  }
  return d + ' Z'
}

export function triPath(r: number): string {
  return roundedPolyPath([[0, -r], [0.98 * r, 0.72 * r], [-0.98 * r, 0.72 * r]], r * 0.24)
}

/* deterministic pseudo-random barcode bars */
export const BARCODE_SEQ = [2, 1, 3, 1, 1, 2, 1, 4, 1, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 1, 2, 2, 1, 3]

export function polarPoint(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}
