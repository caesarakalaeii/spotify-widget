'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { VinylWidget } from '@/components/widget/VinylWidget'
import type { WidgetSettings } from '@/lib/settings/schema'
import type { NowPlaying } from '@/types/nowplaying'

type PreviewState = 'playing' | 'paused' | 'idle'

const SAMPLE = {
  short: 'Midnight City',
  long: 'An Extremely Long Song Title That Should Definitely Scroll Across',
}

export function LivePreview({ settings }: { settings: WidgetSettings }) {
  const [state, setState] = useState<PreviewState>('playing')
  const [longTitle, setLongTitle] = useState(false)

  const playback: NowPlaying | null =
    state === 'idle'
      ? null
      : {
          isPlaying: state === 'playing',
          track: {
            name: longTitle ? SAMPLE.long : SAMPLE.short,
            artists: ['Sample Artist'],
            album: 'Preview Album',
            albumArtUrl: null,
            trackUrl: 'https://open.spotify.com',
            progressMs: 72_000,
            durationMs: 240_000,
          },
          fetchedAt: Date.now(),
        }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Live preview</CardTitle>
        <div className="flex gap-1">
          {(['playing', 'paused', 'idle'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={state === s ? 'default' : 'subtle'}
              onClick={() => setState(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <div className="transparency-grid flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg p-6">
          <VinylWidget settings={settings} playback={playback} />
        </div>
        <label className="flex items-center gap-2 text-xs text-text-sub">
          <input
            type="checkbox"
            checked={longTitle}
            onChange={(e) => setLongTitle(e.target.checked)}
            className="accent-spotify"
          />
          Preview a long title (marquee)
        </label>
      </CardBody>
    </Card>
  )
}
