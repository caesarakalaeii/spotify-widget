/**
 * Minimal typings for the subset of the Spotify Web API we use. Field names
 * follow the Spotify OpenAPI schema exactly (no guessing).
 */

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  scope?: string
  expires_in: number
  refresh_token?: string
}

export interface SpotifyImage {
  url: string
  height: number | null
  width: number | null
}

export interface SpotifyArtist {
  name: string
  external_urls?: { spotify?: string }
}

export interface SpotifyAlbum {
  name: string
  images: SpotifyImage[]
}

export interface SpotifyTrackItem {
  name: string
  duration_ms: number
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  external_urls: { spotify?: string }
}

/** GET /me/player/currently-playing response body. */
export interface CurrentlyPlaying {
  is_playing: boolean
  progress_ms: number | null
  currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown'
  item: SpotifyTrackItem | null
}

/** GET /me (current user profile). */
export interface SpotifyUser {
  id: string
  display_name: string | null
}

/** Raised when a refresh fails terminally (revoked/expired) → force re-auth. */
export class ReauthRequiredError extends Error {
  constructor(message = 'Spotify refresh token is no longer valid') {
    super(message)
    this.name = 'ReauthRequiredError'
  }
}

/** Raised on HTTP 429 so callers can honour Retry-After. */
export class RateLimitedError extends Error {
  retryAfterSeconds: number
  constructor(retryAfterSeconds: number) {
    super(`Spotify rate limited; retry after ${retryAfterSeconds}s`)
    this.name = 'RateLimitedError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}
