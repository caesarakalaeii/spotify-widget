'use client'

import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-text-sub">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label} colour swatch`}
          onClick={() => setOpen((o) => !o)}
          className="size-9 shrink-0 rounded-lg border border-border-md"
          style={{ background: value }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="h-9 w-28 rounded-lg border border-border bg-surface-2 px-2.5 font-mono text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-spotify/60"
        />
      </div>
      {open && (
        <div className="mt-1">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  )
}
