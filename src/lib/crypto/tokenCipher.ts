import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { getEnv } from '@/lib/config/env'

/**
 * AES-256-GCM encryption for Spotify refresh tokens at rest. The key comes from
 * TOKEN_ENCRYPTION_KEY (base64-encoded 32 bytes). Each encryption uses a fresh
 * random 12-byte IV; the 16-byte GCM auth tag is stored alongside.
 */
const IV_BYTES = 12
export const TOKEN_KEY_VERSION = 1

export interface EncryptedToken {
  ciphertext: Buffer
  iv: Buffer
  tag: Buffer
  keyVersion: number
}

function loadKey(): Buffer {
  const raw = getEnv().TOKEN_ENCRYPTION_KEY
  // Accept base64 (preferred) or raw 32-char utf8.
  let key = Buffer.from(raw, 'base64')
  if (key.length !== 32) key = Buffer.from(raw, 'utf8')
  if (key.length !== 32) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to 32 bytes (AES-256); got ${key.length}. Use: openssl rand -base64 32`,
    )
  }
  return key
}

export function encryptToken(plaintext: string): EncryptedToken {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', loadKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return { ciphertext, iv, tag, keyVersion: TOKEN_KEY_VERSION }
}

export function decryptToken(enc: Pick<EncryptedToken, 'ciphertext' | 'iv' | 'tag'>): string {
  const decipher = createDecipheriv('aes-256-gcm', loadKey(), enc.iv)
  decipher.setAuthTag(enc.tag)
  return Buffer.concat([decipher.update(enc.ciphertext), decipher.final()]).toString('utf8')
}
