// @vitest-environment node
// jose's webapi build checks `instanceof Uint8Array`; jsdom's TextEncoder emits a
// cross-realm array that fails that check. Route handlers run in the Node runtime,
// so exercise these there too.
import { describe, it, expect, beforeEach } from 'vitest'
import { signState, verifyState, stateCookieOptions } from './stateCookie'
import { __resetEnvForTests } from '@/lib/config/env'

function baseEnv() {
  process.env.SPOTIFY_CLIENT_ID = 'id'
  process.env.SPOTIFY_CLIENT_SECRET = 'secret'
  process.env.SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:3000/api/auth/callback'
  process.env.TOKEN_ENCRYPTION_KEY = 'x'.repeat(32)
  process.env.SESSION_SECRET = 'session-secret-that-is-long-enough-32+'
  process.env.BASE_URL = 'http://127.0.0.1:3000'
  __resetEnvForTests()
}

describe('stateCookie', () => {
  beforeEach(baseEnv)

  it('round-trips state + verifier', async () => {
    const token = await signState({ state: 'abc', verifier: 'ver' })
    const payload = await verifyState(token)
    expect(payload).toEqual({ state: 'abc', verifier: 'ver' })
  })

  it('rejects a tampered token', async () => {
    const token = await signState({ state: 'abc', verifier: 'ver' })
    const tampered = token.slice(0, -3) + 'xyz'
    expect(await verifyState(tampered)).toBeNull()
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await signState({ state: 'abc', verifier: 'ver' })
    process.env.SESSION_SECRET = 'a-completely-different-secret-value-32+'
    __resetEnvForTests()
    expect(await verifyState(token)).toBeNull()
  })

  it('returns null for undefined', async () => {
    expect(await verifyState(undefined)).toBeNull()
  })

  it('marks the cookie insecure on http and secure on https', () => {
    expect(stateCookieOptions().secure).toBe(false)
    process.env.BASE_URL = 'https://spotify.caes.ar'
    __resetEnvForTests()
    expect(stateCookieOptions().secure).toBe(true)
  })
})
