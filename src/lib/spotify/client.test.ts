import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { projectCurrentlyPlaying, fetchCurrentlyPlaying, UnauthorizedError } from './client'
import { RateLimitedError, type CurrentlyPlaying } from './types'
import { __resetEnvForTests } from '@/lib/config/env'

function baseEnv() {
  process.env.SPOTIFY_CLIENT_ID = 'id'
  process.env.SPOTIFY_CLIENT_SECRET = 'secret'
  process.env.SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:3000/api/auth/callback'
  process.env.TOKEN_ENCRYPTION_KEY = 'x'.repeat(32)
  process.env.SESSION_SECRET = 'x'.repeat(32)
  process.env.BASE_URL = 'http://127.0.0.1:3000'
  process.env.SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
  __resetEnvForTests()
}

const trackBody: CurrentlyPlaying = {
  is_playing: true,
  progress_ms: 42311,
  currently_playing_type: 'track',
  item: {
    name: 'Song Title',
    duration_ms: 210000,
    artists: [{ name: 'Artist One' }, { name: 'Artist Two' }],
    album: { name: 'The Album', images: [{ url: 'https://i.scdn.co/image/abc', height: 640, width: 640 }] },
    external_urls: { spotify: 'https://open.spotify.com/track/xyz' },
  },
}

describe('projectCurrentlyPlaying', () => {
  it('maps a playing track to the render payload', () => {
    const np = projectCurrentlyPlaying(trackBody, 1000)
    expect(np).toEqual({
      isPlaying: true,
      track: {
        name: 'Song Title',
        artists: ['Artist One', 'Artist Two'],
        album: 'The Album',
        albumArtUrl: 'https://i.scdn.co/image/abc',
        trackUrl: 'https://open.spotify.com/track/xyz',
        progressMs: 42311,
        durationMs: 210000,
      },
      fetchedAt: 1000,
    })
  })

  it('treats ads/episodes and null as idle', () => {
    expect(projectCurrentlyPlaying(null, 1).track).toBeNull()
    expect(
      projectCurrentlyPlaying({ ...trackBody, currently_playing_type: 'ad' }, 1).track,
    ).toBeNull()
  })
})

describe('fetchCurrentlyPlaying', () => {
  beforeEach(baseEnv)
  afterEach(() => vi.restoreAllMocks())

  it('returns idle on 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const np = await fetchCurrentlyPlaying('token', 5)
    expect(np).toEqual({ isPlaying: false, track: null, fetchedAt: 5 })
  })

  it('throws UnauthorizedError on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })))
    await expect(fetchCurrentlyPlaying('token')).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('throws RateLimitedError honouring Retry-After on 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': '7' } })),
    )
    await expect(fetchCurrentlyPlaying('token')).rejects.toMatchObject({ retryAfterSeconds: 7 })
    await expect(fetchCurrentlyPlaying('token')).rejects.toBeInstanceOf(RateLimitedError)
  })

  it('projects a 200 body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(trackBody), { status: 200, headers: { 'content-type': 'application/json' } }),
      ),
    )
    const np = await fetchCurrentlyPlaying('token', 9)
    expect(np.isPlaying).toBe(true)
    expect(np.track?.name).toBe('Song Title')
  })
})
