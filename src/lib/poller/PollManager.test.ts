import { describe, it, expect, vi } from 'vitest'
import { PollManager, type PollDeps, type Subscriber } from './PollManager'
import { RateLimiter } from './rateLimiter'
import { UnauthorizedError } from '@/lib/spotify/client'
import { ReauthRequiredError } from '@/lib/spotify/types'
import type { NowPlaying } from '@/types/nowplaying'

const SNAPSHOT: NowPlaying = {
  isPlaying: true,
  track: {
    name: 'T',
    artists: ['A'],
    album: 'Al',
    albumArtUrl: null,
    trackUrl: null,
    progressMs: 0,
    durationMs: 1000,
  },
  fetchedAt: 1,
}

function makeSub(): Subscriber {
  return { onNowPlaying: vi.fn(), onSettings: vi.fn(), onNeedsReauth: vi.fn() }
}

function makeManager(overrides: Partial<PollDeps> = {}) {
  let clock = 0
  const deps: Partial<PollDeps> = {
    fetchNowPlaying: vi.fn().mockResolvedValue(SNAPSHOT),
    refreshAccessToken: vi.fn().mockResolvedValue({ access_token: 'at', expires_in: 3600 }),
    getRefreshToken: vi.fn().mockResolvedValue('rt'),
    updateRefreshToken: vi.fn().mockResolvedValue(undefined),
    setNeedsReauth: vi.fn().mockResolvedValue(undefined),
    rateLimiter: new RateLimiter(() => clock),
    now: () => clock,
    setTimeoutFn: (() => 0) as unknown as PollDeps['setTimeoutFn'],
    clearTimeoutFn: () => {},
    autoStart: false,
    ...overrides,
  }
  return new PollManager(deps)
}

describe('PollManager', () => {
  it('polls once and fans the result out to all viewers of an overlay', async () => {
    const fetchNowPlaying = vi.fn().mockResolvedValue(SNAPSHOT)
    const pm = makeManager({ fetchNowPlaying })
    const s1 = makeSub()
    const s2 = makeSub()
    pm.addViewer('u1', s1)
    pm.addViewer('u1', s2)

    await pm.pollNow('u1')

    expect(fetchNowPlaying).toHaveBeenCalledTimes(1) // de-duplicated across viewers
    expect(s1.onNowPlaying).toHaveBeenCalledWith(SNAPSHOT)
    expect(s2.onNowPlaying).toHaveBeenCalledWith(SNAPSHOT)
  })

  it('gives a late-joining viewer the last snapshot without a new upstream call', async () => {
    const fetchNowPlaying = vi.fn().mockResolvedValue(SNAPSHOT)
    const pm = makeManager({ fetchNowPlaying })
    pm.addViewer('u1', makeSub())
    await pm.pollNow('u1')
    const late = makeSub()
    pm.addViewer('u1', late)
    expect(late.onNowPlaying).toHaveBeenCalledWith(SNAPSHOT)
    expect(fetchNowPlaying).toHaveBeenCalledTimes(1)
  })

  it('refreshes once and retries on a 401', async () => {
    const fetchNowPlaying = vi
      .fn()
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(SNAPSHOT)
    const refreshAccessToken = vi.fn().mockResolvedValue({ access_token: 'at2', expires_in: 3600 })
    const pm = makeManager({ fetchNowPlaying, refreshAccessToken })
    const sub = makeSub()
    pm.addViewer('u1', sub)

    await pm.pollNow('u1')

    expect(fetchNowPlaying).toHaveBeenCalledTimes(2)
    expect(sub.onNowPlaying).toHaveBeenCalledWith(SNAPSHOT)
  })

  it('marks the user for re-auth on a terminal refresh failure', async () => {
    const refreshAccessToken = vi.fn().mockRejectedValue(new ReauthRequiredError())
    const setNeedsReauth = vi.fn().mockResolvedValue(undefined)
    const pm = makeManager({ refreshAccessToken, setNeedsReauth })
    const sub = makeSub()
    pm.addViewer('u1', sub)

    await pm.pollNow('u1')

    expect(setNeedsReauth).toHaveBeenCalledWith('u1', true)
    expect(sub.onNeedsReauth).toHaveBeenCalled()
    expect(pm.viewerCount('u1')).toBe(0) // loop stopped
  })

  it('skips upstream calls while the breaker is armed', async () => {
    let clock = 0
    const rl = new RateLimiter(() => clock)
    rl.on429(30)
    const fetchNowPlaying = vi.fn().mockResolvedValue(SNAPSHOT)
    const pm = makeManager({ rateLimiter: rl, now: () => clock, fetchNowPlaying })
    pm.addViewer('u1', makeSub())

    await pm.pollNow('u1')

    expect(fetchNowPlaying).not.toHaveBeenCalled()
  })
})
