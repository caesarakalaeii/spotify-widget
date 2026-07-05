'use client'

import type { CSSProperties } from 'react'
import { revDurationSec, type SpinState, type TonearmState } from '@/lib/widget/spin'

export interface VinylDiscProps {
  spin: SpinState
  /** Where the tonearm sits: on the record (playing), lifted (cued), or parked (rest). */
  tonearmState: TonearmState
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
      {props.tonearm && <Tonearm state={props.tonearmState} />}
    </div>
  )
}

/**
 * A record-player tonearm: gimbal pivot + counterweight in the top-right corner,
 * a tube reaching down onto the record, and an angled headshell with a stylus.
 * Its position (playing / cued / rest) is animated via the `.tonearm` CSS.
 */
function Tonearm({ state }: { state: TonearmState }) {
  return (
    <svg
      className="tonearm"
      viewBox="0 0 100 100"
      data-position={state}
      data-testid="tonearm"
      aria-hidden
    >
      {/* counterweight behind the pivot */}
      <line x1="88" y1="11" x2="97" y2="5" stroke="#8a8a92" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse
        cx="97"
        cy="5"
        rx="4"
        ry="3"
        fill="#2b2b30"
        stroke="#55555f"
        strokeWidth="0.6"
        transform="rotate(-34 97 5)"
      />
      {/* main arm tube */}
      <line
        x1="88"
        y1="11"
        x2="70"
        y2="28"
        stroke="#c2c2ca"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* angled headshell */}
      <g transform="rotate(24 70 28)">
        <rect x="65.5" y="25" width="9" height="6" rx="1.2" fill="#3a3a42" stroke="#5a5a63" strokeWidth="0.6" />
      </g>
      {/* stylus contact point */}
      <circle cx="67" cy="31" r="1.3" fill="#0a0a0a" />
      {/* gimbal pivot (rotationally symmetric so it stays put) */}
      <circle cx="88" cy="11" r="5" fill="#26262c" stroke="#4a4a52" strokeWidth="1.2" />
      <circle cx="88" cy="11" r="2" fill="#55555f" />
    </svg>
  )
}
