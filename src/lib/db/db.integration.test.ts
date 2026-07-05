// @vitest-environment node
/**
 * Integration test for the repository layer against a real Postgres.
 * Opt-in: run with RUN_DB_TESTS=1 and a reachable DATABASE_* (see docker-compose).
 *   RUN_DB_TESTS=1 DATABASE_URL=postgresql://spotify_user:dev@127.0.0.1:5432/spotify_widget npx vitest run db.integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { __resetEnvForTests } from '@/lib/config/env'

const run = process.env.RUN_DB_TESTS === '1'

function setEnv() {
  process.env.SPOTIFY_CLIENT_ID = 'id'
  process.env.SPOTIFY_CLIENT_SECRET = 'secret'
  process.env.SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:3000/api/auth/callback'
  process.env.SESSION_SECRET = 'x'.repeat(32)
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
  process.env.BASE_URL = 'http://127.0.0.1:3000'
  __resetEnvForTests()
}

describe.skipIf(!run)('db repositories (integration)', () => {
  let userId: string
  const spotifyUserId = `test-${randomUUID()}`

  beforeAll(setEnv)

  afterAll(async () => {
    const { getPool } = await import('@/lib/db/pool')
    await getPool().query('DELETE FROM users WHERE spotify_user_id = $1', [spotifyUserId])
    await getPool().end()
  })

  it('upserts a user and encrypts the refresh token at rest', async () => {
    const { upsertUser, getRefreshToken } = await import('@/lib/db/users')
    const { getPool } = await import('@/lib/db/pool')

    const { id } = await upsertUser({
      spotifyUserId,
      displayName: 'Tester',
      refreshToken: 'super-secret-refresh',
    })
    userId = id
    expect(id).toBeTruthy()

    // Ciphertext stored must not equal the plaintext.
    const rows = await getPool().query(
      'SELECT refresh_token_ciphertext FROM users WHERE id = $1',
      [id],
    )
    expect(rows.rows[0].refresh_token_ciphertext.toString('utf8')).not.toContain(
      'super-secret-refresh',
    )
    // But it decrypts back.
    expect(await getRefreshToken(id)).toBe('super-secret-refresh')
  })

  it('creates an overlay with defaults and persists settings changes', async () => {
    const { ensureOverlayForUser, saveSettings, getOverlayByPublicId } = await import(
      '@/lib/db/overlays'
    )
    const { DEFAULT_SETTINGS, parseSettings } = await import('@/lib/settings/schema')

    const overlay = await ensureOverlayForUser(userId)
    expect(overlay.publicId).toHaveLength(22)
    expect(overlay.settings).toEqual(DEFAULT_SETTINGS)

    const updated = await saveSettings(userId, parseSettings({ vinyl: { rpm: 45 } }))
    expect(updated.settings.vinyl.rpm).toBe(45)

    const fetched = await getOverlayByPublicId(overlay.publicId)
    expect(fetched?.settings.vinyl.rpm).toBe(45)
  })

  it('rotates the refresh token and toggles needs_reauth', async () => {
    const { updateRefreshToken, getRefreshToken, setNeedsReauth, getUserById } = await import(
      '@/lib/db/users'
    )
    await updateRefreshToken(userId, 'rotated-token')
    expect(await getRefreshToken(userId)).toBe('rotated-token')

    await setNeedsReauth(userId, true)
    expect((await getUserById(userId))?.needs_reauth).toBe(true)
  })
})
