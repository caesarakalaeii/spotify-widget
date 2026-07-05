import { describe, it, expect } from 'vitest'
import { RateLimiter } from './rateLimiter'

describe('RateLimiter', () => {
  it('honours Retry-After', () => {
    let clock = 1000
    const rl = new RateLimiter(() => clock)
    rl.on429(30) // 30 seconds
    expect(rl.isBlocked()).toBe(true)
    expect(rl.blockedForMs()).toBe(30_000)
    clock += 29_999
    expect(rl.isBlocked()).toBe(true)
    clock += 2
    expect(rl.isBlocked()).toBe(false)
  })

  it('uses exponential backoff when Retry-After is small, capped at 60s', () => {
    let clock = 0
    const rl = new RateLimiter(() => clock, 1000, 60_000)
    // retryAfter 0 → backoff term dominates: 1000, 2000, 4000, ...
    rl.on429(0)
    expect(rl.blockedForMs()).toBe(1000)
    clock += 1000
    rl.on429(0)
    expect(rl.blockedForMs()).toBe(2000)
    clock += 2000
    rl.on429(0)
    expect(rl.blockedForMs()).toBe(4000)
    // Jump far ahead in the exponent → cap.
    for (let i = 0; i < 20; i++) {
      clock += rl.blockedForMs()
      rl.on429(0)
    }
    expect(rl.blockedForMs()).toBeLessThanOrEqual(60_000)
    expect(rl.blockedForMs()).toBe(60_000)
  })

  it('resets on success', () => {
    let clock = 0
    const rl = new RateLimiter(() => clock)
    rl.on429(10)
    rl.onSuccess()
    expect(rl.isBlocked()).toBe(false)
    // Backoff exponent reset: next 429 with retryAfter 0 starts at baseline again.
    rl.on429(0)
    expect(rl.blockedForMs()).toBe(1000)
  })
})
