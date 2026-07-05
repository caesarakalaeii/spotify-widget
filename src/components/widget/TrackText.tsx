'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { shouldMarquee } from '@/lib/widget/spin'
import { fontFamily } from '@/lib/widget/fonts'
import type { WidgetSettings } from '@/lib/settings/schema'

export function TrackText({
  title,
  artists,
  album,
  text,
  colors,
  reducedMotion,
}: {
  title: string
  artists: string[]
  album: string | null
  text: WidgetSettings['text']
  colors: WidgetSettings['colors']
  reducedMotion: boolean
}) {
  const marquee = text.marquee && shouldMarquee(title, text.marqueeThreshold) && !reducedMotion
  const artistLine = artists.join(', ')

  return (
    <div
      className={cn('flex min-w-0 flex-col justify-center gap-0.5')}
      style={{ textAlign: text.align, fontFamily: fontFamily(text.font) }}
      data-testid="track-text"
    >
      {text.showTitle && (
        <div className="marquee" data-active={String(marquee)}>
          <div
            className="marquee__track font-semibold leading-tight"
            style={
              { color: colors.titleColor, fontSize: `${text.titleSize}px` } as CSSProperties
            }
          >
            <span>{title}</span>
            {marquee && <span aria-hidden>{title}</span>}
          </div>
        </div>
      )}
      {text.showArtist && artistLine && (
        <div
          className="truncate leading-tight"
          style={{ color: colors.artistColor, fontSize: `${text.artistSize}px` }}
        >
          {artistLine}
        </div>
      )}
      {text.showAlbum && album && (
        <div
          className="truncate leading-tight opacity-70"
          style={{ color: colors.artistColor, fontSize: `${Math.round(text.artistSize * 0.85)}px` }}
        >
          {album}
        </div>
      )}
    </div>
  )
}
