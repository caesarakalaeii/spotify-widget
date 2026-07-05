/**
 * Pure, unit-tested helpers for the vinyl widget. No DOM access here so they can
 * be exercised in isolation.
 */

export type SpinState = 'spinning' | 'spinning-down' | 'stopped'

/** Seconds per revolution for a given RPM (33.33 → 1.8s, 45 → 1.333s). */
export function revDurationSec(rpm: number): number {
  return 60 / Math.max(rpm, 0.01)
}

/** Which spin state the disc should be in. Reduced motion always wins. */
export function spinStateFor(isPlaying: boolean, reducedMotion: boolean): SpinState {
  if (reducedMotion) return 'stopped'
  return isPlaying ? 'spinning' : 'spinning-down'
}

/** Whether a title needs a scrolling marquee. */
export function shouldMarquee(text: string, maxChars: number): boolean {
  return text.length > maxChars
}

/**
 * Interpolate playback position between polls so the progress bar advances
 * smoothly. Freezes when paused; never exceeds the track duration.
 */
export function interpolateProgress(
  progressMs: number,
  fetchedAt: number,
  isPlaying: boolean,
  durationMs: number,
  now: number = Date.now(),
): number {
  const raw = isPlaying ? progressMs + (now - fetchedAt) : progressMs
  return Math.max(0, Math.min(raw, durationMs))
}

/** Format milliseconds as m:ss for the progress time label. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
