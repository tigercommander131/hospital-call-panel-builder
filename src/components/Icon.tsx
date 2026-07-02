/* SF-symbols-style icon set — 24-grid, 1.8px strokes, round caps.
   One component, many glyphs, always crisp. */

const STROKE = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const GLYPHS: Record<string, JSX.Element> = {
  play: <path d="M8.5 5.8c0-.9 1-1.5 1.8-1L19 11.1c.8.5.8 1.6 0 2L10.3 19c-.8.5-1.8-.1-1.8-1V5.8z" fill="currentColor" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.4" fill="currentColor" />,
  plus: <g {...STROKE}><path d="M12 5.5v13M5.5 12h13" /></g>,
  close: <g {...STROKE}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></g>,
  trash: (
    <g {...STROKE}>
      <path d="M5 7h14M10 7V5.4c0-.8.6-1.4 1.4-1.4h1.2c.8 0 1.4.6 1.4 1.4V7M7 7l.8 11.2c.1 1 .9 1.8 2 1.8h4.4c1.1 0 1.9-.8 2-1.8L17 7" />
      <path d="M10.2 10.5v5M13.8 10.5v5" />
    </g>
  ),
  copy: (
    <g {...STROKE}>
      <rect x="9" y="9" width="10.5" height="10.5" rx="2.5" />
      <path d="M15 5.5v-.1A2.4 2.4 0 0 0 12.6 3H6.4A2.4 2.4 0 0 0 4 5.4v6.2A2.4 2.4 0 0 0 6.4 14h.1" />
    </g>
  ),
  undo: <g {...STROKE}><path d="M8.5 5.5L4.5 9.5l4 4" /><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" /></g>,
  layerUp: <g {...STROKE}><path d="M12 4.5l7 4-7 4-7-4 7-4z" /><path d="M5 13.5l7 4 7-4" opacity="0.45" /></g>,
  layerDown: <g {...STROKE}><path d="M5 9.5l7 4 7-4" opacity="0.45" /><path d="M12 11.5l7 4-7 4-7-4 7-4z" /></g>,
  volumeOn: (
    <g {...STROKE}>
      <path d="M4.5 9.5h2.8L11.5 6v12l-4.2-3.5H4.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" fill="currentColor" stroke="none" />
      <path d="M15 9a4.2 4.2 0 0 1 0 6M17.8 6.8a8 8 0 0 1 0 10.4" />
    </g>
  ),
  volumeOff: (
    <g {...STROKE}>
      <path d="M4.5 9.5h2.8L11.5 6v12l-4.2-3.5H4.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" fill="currentColor" stroke="none" />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </g>
  ),
  expand: <g {...STROKE}><path d="M9 4.5H5.7A1.2 1.2 0 0 0 4.5 5.7V9M15 4.5h3.3a1.2 1.2 0 0 1 1.2 1.2V9M9 19.5H5.7a1.2 1.2 0 0 1-1.2-1.2V15M15 19.5h3.3a1.2 1.2 0 0 0 1.2-1.2V15" /></g>,
  download: <g {...STROKE}><path d="M12 4.5v10M8 11l4 4 4-4M5 19.5h14" /></g>,
  upload: <g {...STROKE}><path d="M12 14.5v-10M8 8l4-4 4 4M5 19.5h14" /></g>,
  chevronL: <g {...STROKE}><path d="M14.5 5.5L8 12l6.5 6.5" /></g>,
  chevronR: <g {...STROKE}><path d="M9.5 5.5L16 12l-6.5 6.5" /></g>,
  bell: (
    <g {...STROKE}>
      <path d="M12 4a5.6 5.6 0 0 1 5.6 5.6c0 4.4 1.4 5.6 1.9 6.1H4.5c.5-.5 1.9-1.7 1.9-6.1A5.6 5.6 0 0 1 12 4z" />
      <path d="M10 18.8a2.1 2.1 0 0 0 4 0" />
    </g>
  ),
  wave: <g {...STROKE}><path d="M4 12h1.5M8 8.5v7M12 5.5v13M16 8.5v7M20 12h-1.5" strokeWidth="2" /></g>,
  building: (
    <g {...STROKE}>
      <path d="M5 20V6.2A1.2 1.2 0 0 1 6.2 5h11.6A1.2 1.2 0 0 1 19 6.2V20M3.5 20h17" />
      <path d="M12 8.2v4M10 10.2h4" />
      <path d="M9.5 16.5h5V20h-5z" />
    </g>
  ),
  sparkle: (
    <g fill="currentColor">
      <path d="M12 4.5l1.6 4.3 4.3 1.6-4.3 1.6L12 16.3l-1.6-4.3-4.3-1.6 4.3-1.6L12 4.5z" />
      <path d="M18.5 15.5l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1z" opacity="0.55" />
    </g>
  ),
  check: <g {...STROKE}><path d="M5 12.5l4.5 4.5L19 7.5" /></g>,
  person: (
    <g fill="currentColor">
      <circle cx="12" cy="7.2" r="3" />
      <path d="M5.5 19.4c.6-3.6 3.3-5.6 6.5-5.6s5.9 2 6.5 5.6c.1.6-.4 1.1-1 1.1H6.5c-.6 0-1.1-.5-1-1.1z" />
    </g>
  ),
}

export type IconName = keyof typeof GLYPHS

export function Icon({ name, size = 16, className }: { name: IconName | string; size?: number; className?: string }) {
  const glyph = GLYPHS[name as string]
  if (!glyph) return null
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {glyph}
    </svg>
  )
}
