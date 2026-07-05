'use client'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  format?: (v: number) => string
  onChange: (value: number) => void
}

export function Slider({ label, value, min, max, step = 1, unit, format, onChange }: SliderProps) {
  const display = format ? format(value) : `${value}${unit ?? ''}`
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm text-text-sub">
        <span>{label}</span>
        <span className="font-mono text-xs text-text">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-spotify"
      />
    </label>
  )
}
