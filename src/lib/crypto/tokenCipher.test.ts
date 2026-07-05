import { describe, it, expect, beforeEach } from 'vitest'
import { encryptToken, decryptToken, TOKEN_KEY_VERSION } from './tokenCipher'
import { __resetEnvForTests } from '@/lib/config/env'

// base64 of two distinct 32-byte keys.
const KEY_A = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
const KEY_B = Buffer.from('ffffffffffffffffffffffffffffffff').toString('base64')

function setKey(key: string) {
  process.env.TOKEN_ENCRYPTION_KEY = key
  // Minimal companions so getEnv() validates.
  process.env.SPOTIFY_CLIENT_ID = 'id'
  process.env.SPOTIFY_CLIENT_SECRET = 'secret'
  process.env.SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:3000/api/auth/callback'
  process.env.SESSION_SECRET = 'x'.repeat(32)
  process.env.BASE_URL = 'http://127.0.0.1:3000'
  __resetEnvForTests()
}

describe('tokenCipher', () => {
  beforeEach(() => setKey(KEY_A))

  it('round-trips a refresh token', () => {
    const plaintext = 'AQAaBbCcDd-refresh-token'
    const enc = encryptToken(plaintext)
    expect(enc.keyVersion).toBe(TOKEN_KEY_VERSION)
    expect(decryptToken(enc)).toBe(plaintext)
  })

  it('uses a distinct IV per call', () => {
    const a = encryptToken('same')
    const b = encryptToken('same')
    expect(a.iv.equals(b.iv)).toBe(false)
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false)
  })

  it('fails to decrypt with the wrong key', () => {
    const enc = encryptToken('secret-value')
    setKey(KEY_B)
    expect(() => decryptToken(enc)).toThrow()
  })
})
