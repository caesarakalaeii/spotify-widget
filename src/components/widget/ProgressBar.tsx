'use client'

import { useEffect, useState } from 'react'
import { interpolateProgress, formatTime } from '@/lib/widget/spin'
import type { WidgetSettings } from '@/lib/settings/schema'

export function ProgressBar({
  progressMs,
  durationMs,
  fetchedAt,
  isPlaying,
  progress,
  colors,
}: {
  progressMs: number
  durationMs: number
  fetchedAt: number
  isPlaying: boolean
  progress: WidgetSettings['progress']
  colors: WidgetSettings['colors']
}) {
  // Local ticker so the bar advances smoothly between (infrequent) polls.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [isPlaying])

  const elapsed = interpolateProgress(progressMs, fetchedAt, isPlaying, durationMs, now)
  const pct = durationMs > 0 ? Math.min(100, (elapsed / durationMs) * 100) : 0

  return (
    <div className="flex w-full flex-col gap-1" data-testid="progress">
      <div
        className="w-full overflow-hidden rounded-full bg-white/15"
        style={{ height: `${progress.thickness}px` }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: colors.accent }}
        />
      </div>
      {progress.showTime && (
        <div className="flex justify-between font-mono text-[10px] text-white/60">
          <span>{formatTime(elapsed)}</span>
          <span>{formatTime(durationMs)}</span>
        </div>
      )}
    </div>
  )
}
