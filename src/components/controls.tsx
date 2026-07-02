/* Shared Apple-style controls */
import { ReactNode, useId } from 'react'
import { Icon, IconName } from './Icon'

export function Pill({
  children, onClick, kind = 'frost', icon, disabled, title, className,
}: {
  children?: ReactNode
  onClick?: () => void
  kind?: 'frost' | 'dark' | 'azure' | 'danger'
  icon?: IconName | string
  disabled?: boolean
  title?: string
  className?: string
}) {
  return (
    <button className={`pill pill-${kind}${className ? ' ' + className : ''}`} onClick={onClick} disabled={disabled} title={title}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  )
}

export function LinkBtn({ children, onClick, icon }: { children: ReactNode; onClick?: () => void; icon?: IconName | string }) {
  return (
    <button className="link-btn" onClick={onClick}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </button>
  )
}

export function XBtn({ onClick, title }: { onClick?: () => void; title?: string }) {
  return (
    <button className="x-btn" onClick={onClick} title={title}>
      <Icon name="close" size={12} />
    </button>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" />
      {label}
    </label>
  )
}

export function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="segmented" style={{ ['--seg-count' as any]: options.length, ['--seg-idx' as any]: idx }}>
      <div className="seg-thumb" />
      {options.map((o) => (
        <button
          key={o.value}
          className={`seg-item${o.value === value ? ' on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, value, children }: { label?: ReactNode; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="insp-field">
      {label != null && (
        <label>
          {label}
          {value != null && <em>{value}</em>}
        </label>
      )}
      {children}
    </div>
  )
}

export function SliderField({
  label, min, max, step = 1, value, display, onChange, onCommit,
}: {
  label: ReactNode
  min: number
  max: number
  step?: number
  value: number
  display?: string
  onChange: (v: number) => void
  onCommit?: () => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <Field label={label} value={display ?? value}>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--pct' as any]: `${pct}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
    </Field>
  )
}

export function SelectField({
  label, value, options, onChange,
}: {
  label?: ReactNode
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const sel = (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
  return label != null ? <Field label={label}>{sel}</Field> : sel
}

export function ColorRow({
  value, swatches, onChange,
}: {
  value: string
  swatches: string[]
  onChange: (c: string) => void
}) {
  const id = useId()
  return (
    <div className="color-row">
      {swatches.map((c) => (
        <button
          key={c}
          className={`swatch${c.toLowerCase() === (value || '').toLowerCase() ? ' on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
      <label className="swatch-custom" title="Custom colour" htmlFor={id}>
        <input id={id} type="color" value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#199a53'} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  )
}

export function SideTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="side-title">
      {children}
      {right && <span className="side-title-right">{right}</span>}
    </div>
  )
}
