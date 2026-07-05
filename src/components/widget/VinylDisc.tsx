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
    <div className="vinyl" style={style} data-deck={String(props.tonearm)} data-testid="vinyl">
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
      {props.tonearm && <Tonearm deg={props.tonearmDeg} parked={props.tonearmParked} />}
    </div>
  )
}

/**
 * A record-player tonearm. The pivot assembly (post + cap) is fixed; only the arm
 * rotates about the pivot, so the pivot never drifts. The arm is a long thin tube
 * with a counterweight barrel behind the pivot and an angled headshell + cartridge
 * (accent-coloured) + stylus at the record end. Its rotation (from tonearmRotationDeg)
 * sweeps the stylus from the outer groove to the label as the track plays, or parks
 * it off the record when idle. Sized in em via the `.ta__*` CSS (1em == disc size).
 */
function Tonearm({ deg, parked }: { deg: number; parked: boolean }) {
  return (
    <>
      <div className="ta__post" aria-hidden />
      <div
        className="ta__arm"
        data-testid="tonearm"
        data-parked={String(parked)}
        style={{ ['--ta-rot' as string]: `${deg}deg` } as CSSProperties}
        aria-hidden
      >
        <div className="ta__cw" />
        <div className="ta__tube" />
        <div className="ta__head">
          <div className="ta__head-body" />
          <div className="ta__cart" />
          <div className="ta__sty" />
        </div>
      </div>
      <div className="ta__cap" aria-hidden />
    </>
  )
}
