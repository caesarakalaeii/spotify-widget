import { query } from '@/lib/db/pool'
import { decryptToken, encryptToken, type EncryptedToken } from '@/lib/crypto/tokenCipher'

export interface UserRow {
  id: string
  spotify_user_id: string
  display_name: string | null
  refresh_token_ciphertext: Buffer
  refresh_token_iv: Buffer
  refresh_token_tag: Buffer
  token_key_version: number
  needs_reauth: boolean
}

/** Insert or update a user by Spotify id, storing the encrypted refresh token. */
export async function upsertUser(args: {
  spotifyUserId: string
  displayName: string | null
  refreshToken: string
}): Promise<{ id: string }> {
  const enc = encryptToken(args.refreshToken)
  const rows = await query<{ id: string }>(
    `INSERT INTO users
       (spotify_user_id, display_name, refresh_token_ciphertext, refresh_token_iv,
        refresh_token_tag, token_key_version, needs_reauth, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, now())
     ON CONFLICT (spotify_user_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
       refresh_token_iv = EXCLUDED.refresh_token_iv,
       refresh_token_tag = EXCLUDED.refresh_token_tag,
       token_key_version = EXCLUDED.token_key_version,
       needs_reauth = false,
       updated_at = now()
     RETURNING id`,
    [
      args.spotifyUserId,
      args.displayName,
      enc.ciphertext,
      enc.iv,
      enc.tag,
      enc.keyVersion,
    ],
  )
  return { id: rows[0]!.id }
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id])
  return rows[0] ?? null
}

/** Decrypt and return a user's Spotify refresh token, or null if absent. */
export async function getRefreshToken(userId: string): Promise<string | null> {
  const user = await getUserById(userId)
  if (!user) return null
  const enc: Pick<EncryptedToken, 'ciphertext' | 'iv' | 'tag'> = {
    ciphertext: user.refresh_token_ciphertext,
    iv: user.refresh_token_iv,
    tag: user.refresh_token_tag,
  }
  return decryptToken(enc)
}

/** Persist a rotated refresh token (Spotify may return a new one on refresh). */
export async function updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const enc = encryptToken(refreshToken)
  await query(
    `UPDATE users SET refresh_token_ciphertext = $2, refresh_token_iv = $3,
       refresh_token_tag = $4, token_key_version = $5, updated_at = now()
     WHERE id = $1`,
    [userId, enc.ciphertext, enc.iv, enc.tag, enc.keyVersion],
  )
}

export async function setNeedsReauth(userId: string, value: boolean): Promise<void> {
  await query(`UPDATE users SET needs_reauth = $2, updated_at = now() WHERE id = $1`, [
    userId,
    value,
  ])
}
