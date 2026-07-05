'use client'

import type { CSSProperties } from 'react'
import { revDurationSec, type SpinState } from '@/lib/widget/spin'

export interface VinylDiscProps {
  spin: SpinState
  /** Tonearm rotation in degrees (from tonearmRotationDeg) and whether it is parked (idle). */
  tonearmDeg: number
  tonearmParked: boolean
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
      {props.tonearm && (
        <Tonearm deg={props.tonearmDeg} parked={props.tonearmParked} accent={props.accent} />
      )}
    </div>
  )
}

/**
 * A record-player tonearm: a bulky gimbal pivot + counterweight barrel anchored in
 * the top-right corner (off the platter), a long slender tube crossing the record,
 * and an angled headshell + cartridge with a stylus. Drawn in the 0%-progress
 * reference orientation (stylus on the outer groove); the `deg` rotation (from
 * tonearmRotationDeg) sweeps it inward toward the label as the track plays, or
 * parks it off the record when idle. The `.tonearm` CSS eases the motion.
 *
 * Coordinates match the geometry in lib/widget/spin.ts (pivot 88,13; arm len 56).
 */
function Tonearm({ deg, parked, accent }: { deg: number; parked: boolean; accent: string }) {
  return (
    <svg
      className="tonearm"
      viewBox="0 0 100 100"
      data-testid="tonearm"
      data-parked={String(parked)}
      style={{ transform: `rotate(${deg}deg)` }}
      aria-hidden
    >
      {/* counterweight barrel behind the pivot */}
      <line x1="88" y1="13" x2="88.3" y2="4" stroke="#8a8a92" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse
        cx="88.3"
        cy="4"
        rx="6"
        ry="4.5"
        fill="#26262c"
        stroke="#55555f"
        strokeWidth="0.7"
        transform="rotate(91.7 88.3 4)"
      />
      {/* long thin arm tube */}
      <line x1="88" y1="13" x2="86.7" y2="58" stroke="#cbcbd3" strokeWidth="1.5" strokeLinecap="round" />
      {/* headshell + cartridge (cartridge in the accent colour) */}
      <g transform="rotate(107.7 86.5 63)">
        <rect x="83.5" y="57" width="6" height="12" rx="1.3" fill="#34343c" stroke="#5a5a63" strokeWidth="0.6" />
        <rect x="84.5" y="65" width="4" height="4.5" rx="0.8" fill={accent} />
      </g>
      {/* stylus contact point */}
      <circle cx="86.35" cy="69" r="1.2" fill="#111" />
      {/* bulky gimbal pivot (rotationally symmetric so it stays put) */}
      <circle cx="88" cy="13" r="7.5" fill="#202024" stroke="#4a4a52" strokeWidth="1.4" />
      <circle cx="88" cy="13" r="3" fill="#55555f" />
    </svg>
  )
}
