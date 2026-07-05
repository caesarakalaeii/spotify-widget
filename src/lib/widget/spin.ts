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
 * Tonearm geometry (in the 0..100 SVG coordinate space of the disc box). The arm
 * pivots from a fixed base in the top-right corner; the stylus rides a circle of
 * radius ARM_LEN about that pivot. As the track progresses, the stylus tracks
 * inward from the outer groove (R_OUTER) toward the label (R_INNER), exactly like
 * a real record player. When nothing is playing the arm parks off the record.
 */
const TA_PIVOT = { x: 88, y: 13 }
const TA_CENTER = { x: 50, y: 50 }
const TA_ARM_LEN = 56 // long, slender arm (~56% of the record diameter)
const TA_R_OUTER = 41 // stylus radius from centre at 0% progress (outer groove)
const TA_R_INNER = 17 // stylus radius near the label at 100% progress

/** Parked position (deg) when nothing is playing — swung off the record, to the right. */
export const TONEARM_REST_DEG = -22

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Rotation (radians) of the pivot→stylus vector placing the stylus at radius `r` from centre. */
function tonearmPhiForRadius(r: number): number {
  const dx = TA_PIVOT.x - TA_CENTER.x
  const dy = TA_PIVOT.y - TA_CENTER.y
  const K = (r * r - dx * dx - dy * dy - TA_ARM_LEN * TA_ARM_LEN) / (2 * TA_ARM_LEN)
  const R = Math.hypot(dx, dy)
  const psi = Math.atan2(dy, dx)
  return psi + Math.acos(Math.max(-1, Math.min(1, K / R))) // right-side sweep branch
}

/** The SVG is drawn in this orientation (== 0% progress), so CSS rotation is relative to it. */
export const TONEARM_REF_PHI = tonearmPhiForRadius(TA_R_OUTER)

/**
 * CSS rotation (degrees) for the tonearm. Parked when idle; otherwise swept by
 * playback progress (0..1) so the stylus drifts from the outer groove to the label.
 */
export function tonearmRotationDeg(idle: boolean, progress: number): number {
  if (idle) return TONEARM_REST_DEG
  const r = TA_R_OUTER + (TA_R_INNER - TA_R_OUTER) * clamp01(progress)
  return ((tonearmPhiForRadius(r) - TONEARM_REF_PHI) * 180) / Math.PI
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
