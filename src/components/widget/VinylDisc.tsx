'use client'

import type { CSSProperties } from 'react'
import { revDurationSec, type SpinState } from '@/lib/widget/spin'

export interface VinylDiscProps {
  spin: SpinState
  /** Tonearm resting on the record (playing) vs lifted (paused/idle). */
  engaged: boolean
  albumArtUrl: string | null
  title: string
  size: number
  rpm: number
  grooveIntensity: number
  artShape: 'disc-label' | 'disc-full' | 'square'
  tonearm: boolean
  sheen: boolean
  glow: boolean
  accent: string
}

const artClassName: Record<VinylDiscProps['artShape'], string> = {
  'disc-label': 'vinyl__art vinyl__art--label',
  'disc-full': 'vinyl__art vinyl__art--full',
  square: 'vinyl__art vinyl__art--square',
}

export function VinylDisc(props: VinylDiscProps) {
  const style = {
    '--disc-size': `${props.size}px`,
    '--rev-duration': `${revDurationSec(props.rpm)}s`,
    '--groove-alpha': props.grooveIntensity,
    '--accent': props.accent,
  } as CSSProperties

  return (
    <div className="vinyl" style={style} data-testid="vinyl">
      <div
        className="vinyl__disc"
        data-spin={props.spin}
        data-sheen={String(props.sheen)}
        data-glow={String(props.glow)}
        data-testid="vinyl-disc"
      >
        {props.albumArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={artClassName[props.artShape]}
            src={props.albumArtUrl}
            alt={`Album art: ${props.title}`}
          />
        ) : (
          <div className="vinyl__label-fallback" aria-hidden />
        )}
        <div className="vinyl__spindle" aria-hidden />
      </div>
      {props.tonearm && <Tonearm engaged={props.engaged} />}
    </div>
  )
}

function Tonearm({ engaged }: { engaged: boolean }) {
  return (
    <svg className="tonearm" viewBox="0 0 100 100" data-engaged={String(engaged)} aria-hidden>
      {/* pivot base */}
      <circle cx="86" cy="14" r="7" fill="#2a2a30" stroke="#444" strokeWidth="1.5" />
      {/* arm */}
      <rect
        x="49"
        y="11"
        width="38"
        height="5"
        rx="2.5"
        transform="rotate(0 86 14)"
        fill="#3a3a42"
      />
      {/* headshell */}
      <rect x="44" y="6" width="12" height="14" rx="2" fill="#4a4a52" />
    </svg>
  )
}
