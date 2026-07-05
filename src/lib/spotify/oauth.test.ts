import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { buildAuthorizeUrl, exchangeCode, refreshAccessToken } from './oauth'
import { ReauthRequiredError } from './types'
import { __resetEnvForTests } from '@/lib/config/env'

function baseEnv() {
  process.env.SPOTIFY_CLIENT_ID = 'my-client-id'
  process.env.SPOTIFY_CLIENT_SECRET = 'my-secret'
  process.env.SPOTIFY_REDIRECT_URI = 'https://spotify.caes.ar/api/auth/callback'
  process.env.SPOTIFY_SCOPES = 'user-read-currently-playing'
  process.env.TOKEN_ENCRYPTION_KEY = 'x'.repeat(32)
  process.env.SESSION_SECRET = 'session-secret-that-is-long-enough-32+'
  process.env.BASE_URL = 'https://spotify.caes.ar'
  process.env.SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com'
  process.env.SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
  __resetEnvForTests()
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('oauth', () => {
  beforeEach(baseEnv)
  afterEach(() => vi.restoreAllMocks())

  it('builds an authorize URL with PKCE + minimum scope', () => {
    const url = new URL(buildAuthorizeUrl({ state: 'st', codeChallenge: 'ch' }))
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('my-client-id')
    expect(url.searchParams.get('scope')).toBe('user-read-currently-playing')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe('ch')
    expect(url.searchParams.get('state')).toBe('st')
    expect(url.searchParams.get('redirect_uri')).toBe('https://spotify.caes.ar/api/auth/callback')
  })

  it('exchanges a code with Basic auth + code_verifier', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, token_type: 'Bearer' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await exchangeCode({ code: 'the-code', codeVerifier: 'the-verifier' })
    expect(res.access_token).toBe('at')

    const [, init] = fetchMock.mock.calls[0]!
    expect(init.headers.Authorization).toBe(
      'Basic ' + Buffer.from('my-client-id:my-secret').toString('base64'),
    )
    const body = init.body as URLSearchParams
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code_verifier')).toBe('the-verifier')
  })

  it('returns rotated tokens on refresh', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 })),
    )
    const res = await refreshAccessToken('old-rt')
    expect(res.access_token).toBe('new-at')
    expect(res.refresh_token).toBe('new-rt')
  })

  it('throws ReauthRequiredError on 400 invalid_grant (terminal)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'invalid_grant' }, 400)))
    await expect(refreshAccessToken('revoked')).rejects.toBeInstanceOf(ReauthRequiredError)
  })

  it('throws a generic (transient) error on 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'server_error' }, 503)))
    await expect(refreshAccessToken('rt')).rejects.not.toBeInstanceOf(ReauthRequiredError)
    await expect(refreshAccessToken('rt')).rejects.toThrow()
  })
})
