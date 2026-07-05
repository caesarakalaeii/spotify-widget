'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { spinStateFor, tonearmStateFor } from '@/lib/widget/spin'
import type { WidgetSettings } from '@/lib/settings/schema'
import type { NowPlaying } from '@/types/nowplaying'
import { VinylDisc } from './VinylDisc'
import { TrackText } from './TrackText'
import { ProgressBar } from './ProgressBar'
import { SpotifyAttribution } from './SpotifyAttribution'

export interface VinylWidgetProps {
  settings: WidgetSettings
  playback: NowPlaying | null
  reducedMotion?: boolean
  className?: string
}

const orientationClass: Record<WidgetSettings['layout']['orientation'], string> = {
  'disc-left': 'flex-row items-center',
  'disc-right': 'flex-row-reverse items-center',
  'disc-top': 'flex-col items-center',
  'disc-only': 'flex-row items-center',
  'text-only': 'flex-row items-center',
}

export function VinylWidget({
  settings,
  playback,
  reducedMotion = false,
  className,
}: VinylWidgetProps) {
  const { layout, vinyl, colors, text, progress, behaviour, attribution } = settings
  const track = playback?.track ?? null
  const isPlaying = playback?.isPlaying ?? false
  const idle = !track
  const spin = idle ? 'stopped' : spinStateFor(isPlaying, reducedMotion)
  const tonearmState = tonearmStateFor(isPlaying, idle)

  const showDisc = layout.orientation !== 'text-only'
  const showText = layout.orientation !== 'disc-only'

  const blockStyle: CSSProperties = {
    gap: layout.gap,
    transitionProperty: 'opacity',
    transitionDuration: `${behaviour.fadeMs}ms`,
  }
  if (colors.background === 'solid') {
    blockStyle.background = hexWithOpacity(colors.backgroundColor, colors.backgroundOpacity)
    blockStyle.padding = 16
    blockStyle.borderRadius = 16
  }

  return (
    <div
      className={cn('relative inline-flex', orientationClass[layout.orientation], className)}
      style={blockStyle}
      data-idle={String(idle)}
      data-spin={spin}
      data-testid="vinyl-widget"
    >
      {showDisc && (
        <VinylDisc
          spin={spin}
          tonearmState={tonearmState}
          albumArtUrl={track?.albumArtUrl ?? null}
          title={track?.name ?? behaviour.idleText}
          size={layout.size}
          rpm={vinyl.rpm}
          grooveIntensity={vinyl.grooveIntensity}
          artShape={vinyl.artShape}
          tonearm={vinyl.tonearm}
          sheen={vinyl.sheen}
          glow={colors.glow}
          accent={colors.accent}
        />
      )}

      {showText && (
        <div className="flex min-w-0 flex-col gap-2" style={{ maxWidth: layout.size * 1.5 }}>
          {idle ? (
            <div
              className="font-mono text-sm opacity-80"
              style={{ color: colors.artistColor }}
              data-testid="idle-label"
            >
              {behaviour.idleText}
            </div>
          ) : (
            <>
              <TrackText
                title={track.name}
                artists={track.artists}
                album={track.album}
                text={text}
                colors={colors}
                reducedMotion={reducedMotion}
              />
              {progress.show && (
                <ProgressBar
                  progressMs={track.progressMs}
                  durationMs={track.durationMs}
                  fetchedAt={playback?.fetchedAt ?? Date.now()}
                  isPlaying={isPlaying}
                  progress={progress}
                  colors={colors}
                />
              )}
            </>
          )}
        </div>
      )}

      <SpotifyAttribution
        trackUrl={track?.trackUrl ?? null}
        style={attribution.style}
        className={attributionPositionClass(attribution.position)}
      />
    </div>
  )
}

function attributionPositionClass(pos: WidgetSettings['attribution']['position']): string {
  const base = 'absolute z-10'
  switch (pos) {
    case 'top-left':
      return cn(base, 'top-1 left-1')
    case 'top-right':
      return cn(base, 'top-1 right-1')
    case 'bottom-left':
      return cn(base, 'bottom-1 left-1')
    default:
      return cn(base, 'bottom-1 right-1')
  }
}

function hexWithOpacity(hex: string, opacity: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
