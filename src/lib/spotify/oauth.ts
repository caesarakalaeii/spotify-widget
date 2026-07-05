import { getEnv } from '@/lib/config/env'
import { authorizeUrl, tokenUrl, currentUserUrl } from '@/lib/spotify/endpoints'
import {
  ReauthRequiredError,
  type SpotifyTokenResponse,
  type SpotifyUser,
} from '@/lib/spotify/types'

function basicAuthHeader(): string {
  const env = getEnv()
  const raw = `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
  return `Basic ${Buffer.from(raw).toString('base64')}`
}

/** Build the Spotify authorize URL for the Authorization Code + PKCE flow. */
export function buildAuthorizeUrl(params: { state: string; codeChallenge: string }): string {
  const env = getEnv()
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: env.SPOTIFY_CLIENT_ID,
    scope: env.SPOTIFY_SCOPES,
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
    state: params.state,
    code_challenge_method: 'S256',
    code_challenge: params.codeChallenge,
  })
  return `${authorizeUrl()}?${q.toString()}`
}

async function postToken(body: URLSearchParams): Promise<Response> {
  return fetch(tokenUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(),
    },
    body,
  })
}

/** Exchange an authorization code (+ PKCE verifier) for tokens. */
export async function exchangeCode(args: {
  code: string
  codeVerifier: string
}): Promise<SpotifyTokenResponse> {
  const env = getEnv()
  const res = await postToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: args.code,
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
      code_verifier: args.codeVerifier,
    }),
  )
  if (!res.ok) {
    const detail = await safeErr(res)
    throw new Error(`Spotify token exchange failed (${res.status}): ${detail}`)
  }
  return (await res.json()) as SpotifyTokenResponse
}

/**
 * Refresh an access token. Terminal failures (HTTP 400 invalid_grant) throw
 * ReauthRequiredError so the caller can mark the user for re-auth. Transient
 * failures (5xx / network) throw a generic Error and should be retried.
 */
export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
  const res = await postToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  )
  if (res.ok) return (await res.json()) as SpotifyTokenResponse

  // 400 invalid_grant means the refresh token is revoked/expired — terminal.
  if (res.status === 400) {
    throw new ReauthRequiredError(await safeErr(res))
  }
  throw new Error(`Spotify token refresh transient failure (${res.status}): ${await safeErr(res)}`)
}

/** Fetch the current user's Spotify profile (id, display name). */
export async function getCurrentUser(accessToken: string): Promise<SpotifyUser> {
  const res = await fetch(currentUserUrl(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Spotify /me failed (${res.status}): ${await safeErr(res)}`)
  return (await res.json()) as SpotifyUser
}

async function safeErr(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return typeof body === 'object' ? JSON.stringify(body) : String(body)
  } catch {
    return res.statusText
  }
}
