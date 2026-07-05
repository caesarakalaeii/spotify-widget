import { getEnv } from '@/lib/config/env'

/** Spotify base URLs, overridable via env so tests can point at a local stub. */
export function accountsBase(): string {
  return getEnv().SPOTIFY_ACCOUNTS_BASE
}

export function apiBase(): string {
  return getEnv().SPOTIFY_API_BASE
}

export const authorizeUrl = () => `${accountsBase()}/authorize`
export const tokenUrl = () => `${accountsBase()}/api/token`
export const currentUserUrl = () => `${apiBase()}/me`
export const currentlyPlayingUrl = () => `${apiBase()}/me/player/currently-playing`
