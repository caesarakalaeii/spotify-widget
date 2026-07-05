import { describe, it, expect } from 'vitest'
import {
  revDurationSec,
  spinStateFor,
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
