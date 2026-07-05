import { currentlyPlayingUrl } from '@/lib/spotify/endpoints'
import { RateLimitedError, type CurrentlyPlaying } from '@/lib/spotify/types'
import type { NowPlaying } from '@/types/nowplaying'

/** Thrown on HTTP 401 so the poller can refresh the access token and retry once. */
export class UnauthorizedError extends Error {
  constructor() {
    super('Spotify access token rejected (401)')
    this.name = 'UnauthorizedError'
  }
}

/**
 * Project a raw currently-playing body into the ephemeral NowPlaying payload.
 * Only tracks are rendered; ads/episodes/unknown are treated as idle for MVP.
 * Pure + exported for unit testing.
 */
export function projectCurrentlyPlaying(
  body: CurrentlyPlaying | null,
  fetchedAt: number,
): NowPlaying {
  if (!body || body.currently_playing_type !== 'track' || !body.item) {
    return { isPlaying: false, track: null, fetchedAt }
  }
  const item = body.item
  return {
    isPlaying: body.is_playing,
    track: {
      name: item.name,
      artists: item.artists.map((a) => a.name),
      album: item.album?.name ?? null,
      albumArtUrl: item.album?.images?.[0]?.url ?? null,
      trackUrl: item.external_urls?.spotify ?? null,
      progressMs: body.progress_ms ?? 0,
      durationMs: item.duration_ms,
    },
    fetchedAt,
  }
}

function parseRetryAfter(res: Response): number {
  const header = res.headers.get('retry-after')
  const seconds = header ? parseInt(header, 10) : NaN
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : 1
}

/**
 * GET /me/player/currently-playing. Returns idle on 204 (nothing playing).
 * Throws UnauthorizedError on 401 and RateLimitedError on 429.
 */
export async function fetchCurrentlyPlaying(
  accessToken: string,
  now: number = Date.now(),
): Promise<NowPlaying> {
  const res = await fetch(currentlyPlayingUrl(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (res.status === 204) return { isPlaying: false, track: null, fetchedAt: now }
  if (res.status === 401) throw new UnauthorizedError()
  if (res.status === 429) throw new RateLimitedError(parseRetryAfter(res))
  if (!res.ok) throw new Error(`Spotify currently-playing failed (${res.status})`)

  const body = (await res.json()) as CurrentlyPlaying
  return projectCurrentlyPlaying(body, now)
}
