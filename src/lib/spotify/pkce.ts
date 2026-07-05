import { createHash, randomBytes } from 'node:crypto'

/**
 * PKCE (RFC 7636) helpers for the Authorization Code + PKCE flow.
 * base64url output uses the unreserved [A-Za-z0-9-._~]-safe alphabet.
 */

/** A code_verifier: 43–128 chars. 64 random bytes → 86 base64url chars. */
export function generateVerifier(): string {
  return randomBytes(64).toString('base64url')
}

/** code_challenge = BASE64URL(SHA256(ASCII(code_verifier))). */
export function challengeFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url')
}

/** A CSRF `state` value: 32 random bytes, base64url. */
export function generateState(): string {
  return randomBytes(32).toString('base64url')
}
