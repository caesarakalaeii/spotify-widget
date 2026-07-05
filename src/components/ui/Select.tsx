'use client'

interface Option {
  label: string
  value: string
}

interface SelectProps {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}

export function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-text-sub">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-border bg-surface-2 px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-spotify/60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
