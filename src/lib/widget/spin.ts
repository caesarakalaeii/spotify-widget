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

/**
 * Tonearm rotation angles (degrees). The arm pivots from a fixed base off the
 * top-right of the record; these angles were calibrated by measuring the rendered
 * stylus position against the record radius (see the em-scaled deck layout in
 * globals.css / VinylDisc): at START the stylus sits on the outer groove, at END
 * it reaches the label, and at REST it is parked just off the record. Progress
 * maps linearly across the sweep, so the stylus drifts inward as the track plays.
 */
export const TONEARM_REST_DEG = -72
const TONEARM_START_DEG = -61 // 0% — outer groove
const TONEARM_END_DEG = -40 // 100% — inner groove / label

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** CSS rotation (degrees) for the tonearm: parked when idle, else swept by progress (0..1). */
export function tonearmRotationDeg(idle: boolean, progress: number): number {
  if (idle) return TONEARM_REST_DEG
  return TONEARM_START_DEG + (TONEARM_END_DEG - TONEARM_START_DEG) * clamp01(progress)
}

/** Playback progress as a fraction 0..1 (0 when there is no track). */
export function progressFraction(progressMs: number, durationMs: number): number {
  return durationMs > 0 ? clamp01(progressMs / durationMs) : 0
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
