/**
 * The ephemeral now-playing projection pushed to the overlay over SSE.
 * Contains ONLY the fields the widget needs to render, held in memory for the
 * moment of the push and never persisted (Spotify Developer Terms: no caching
 * of content beyond immediate use). `trackUrl` satisfies the attribution rule.
 */
export interface NowPlayingTrack {
  name: string
  artists: string[]
  album: string | null
  albumArtUrl: string | null
  trackUrl: string | null
  progressMs: number
  durationMs: number
}

export interface NowPlaying {
  isPlaying: boolean
  track: NowPlayingTrack | null
  /** Client clock reference (ms) used to interpolate progress between polls. */
  fetchedAt: number
}

/** SSE event names on the overlay stream. */
export type OverlayEvent = 'settings' | 'nowplaying' | 'needs_reauth'

export const IDLE: Omit<NowPlaying, 'fetchedAt'> = { isPlaying: false, track: null }
