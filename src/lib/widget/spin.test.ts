import { describe, it, expect } from 'vitest'
import {
  revDurationSec,
  spinStateFor,
  tonearmRotationDeg,
  progressFraction,
  TONEARM_REST_DEG,
  shouldMarquee,
  interpolateProgress,
  formatTime,
} from './spin'

describe('spin helpers', () => {
  it('derives revolution duration from RPM', () => {
    expect(revDurationSec(33.333)).toBeCloseTo(1.8, 2)
    expect(revDurationSec(45)).toBeCloseTo(1.333, 2)
  })

  it('picks a spin state, with reduced-motion winning', () => {
    expect(spinStateFor(true, false)).toBe('spinning')
    expect(spinStateFor(false, false)).toBe('spinning-down')
    expect(spinStateFor(true, true)).toBe('stopped')
    expect(spinStateFor(false, true)).toBe('stopped')
  })

  it('parks the tonearm when idle and sweeps it inward with progress', () => {
    // Idle → parked off the record.
    expect(tonearmRotationDeg(true, 0.5)).toBe(TONEARM_REST_DEG)

    const start = tonearmRotationDeg(false, 0)
    const mid = tonearmRotationDeg(false, 0.5)
    const end = tonearmRotationDeg(false, 1)

    // 0% is the reference orientation (~0°), and the arm rotates monotonically inward.
    expect(start).toBeCloseTo(0, 1)
    expect(mid).toBeGreaterThan(start)
    expect(end).toBeGreaterThan(mid)
    // The rest (parked) angle is clearly outside the playing sweep.
    expect(TONEARM_REST_DEG).toBeLessThan(start)
    // Progress clamps to [0,1].
    expect(tonearmRotationDeg(false, 2)).toBeCloseTo(end, 5)
    expect(tonearmRotationDeg(false, -1)).toBeCloseTo(start, 5)
  })

  it('computes a clamped progress fraction', () => {
    expect(progressFraction(0, 200000)).toBe(0)
    expect(progressFraction(100000, 200000)).toBe(0.5)
    expect(progressFraction(300000, 200000)).toBe(1)
    expect(progressFraction(1000, 0)).toBe(0)
  })

  it('flags long titles for marquee', () => {
    expect(shouldMarquee('short', 28)).toBe(false)
    expect(shouldMarquee('a'.repeat(40), 28)).toBe(true)
  })

  it('interpolates progress while playing and freezes when paused', () => {
    const fetchedAt = 1000
    // playing: advances by (now - fetchedAt)
    expect(interpolateProgress(5000, fetchedAt, true, 200000, fetchedAt + 3000)).toBe(8000)
    // paused: frozen
    expect(interpolateProgress(5000, fetchedAt, false, 200000, fetchedAt + 3000)).toBe(5000)
    // clamps to duration
    expect(interpolateProgress(199000, fetchedAt, true, 200000, fetchedAt + 5000)).toBe(200000)
  })

  it('formats time as m:ss', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65_000)).toBe('1:05')
    expect(formatTime(600_000)).toBe('10:00')
  })
})
