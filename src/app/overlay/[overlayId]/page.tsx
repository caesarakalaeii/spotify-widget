'use client'

import { useParams } from 'next/navigation'
import { useNowPlaying } from '@/hooks/useNowPlaying'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { VinylWidget } from '@/components/widget/VinylWidget'
import type { WidgetSettings } from '@/lib/settings/schema'

const anchorClass: Record<WidgetSettings['layout']['anchor'], string> = {
  'top-left': 'items-start justify-start',
  'top-right': 'items-start justify-end',
  'bottom-left': 'items-end justify-start',
  'bottom-right': 'items-end justify-end',
  center: 'items-center justify-center',
}

export default function OverlayPage() {
  const params = useParams<{ overlayId: string }>()
  const overlayId = params.overlayId
  const reducedMotion = useReducedMotion()
  const { settings, playback } = useNowPlaying(overlayId)

  // Avoid a flash of unstyled widget before the first settings arrive.
  if (!settings) return null

  return (
    <div
      className={`fixed inset-0 flex ${anchorClass[settings.layout.anchor]}`}
      style={{ padding: settings.layout.padding }}
    >
      <VinylWidget settings={settings} playback={playback} reducedMotion={reducedMotion} />
    </div>
  )
}
