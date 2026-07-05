import { SignJWT, jwtVerify } from 'jose'
import { getEnv } from '@/lib/config/env'

/**
 * Short-lived signed cookie carrying the OAuth `state` + PKCE `code_verifier`
 * between /api/auth/login and /api/auth/callback. Because the store is the
 * caller's own browser (not a shared server store), there is no cross-request
 * TOCTOU race; it is CSRF-safe (state echo + SameSite=Lax) and HMAC-signed.
 */
export const STATE_COOKIE = 'sw_oauth'
const MAX_AGE_SECONDS = 600 // 10 minutes

export interface StatePayload {
  state: string
  verifier: string
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().SESSION_SECRET)
}

export async function signState(payload: StatePayload): Promise<string> {
  return new SignJWT({ state: payload.state, verifier: payload.verifier })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey())
}

export async function verifyState(token: string | undefined): Promise<StatePayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (typeof payload.state === 'string' && typeof payload.verifier === 'string') {
      return { state: payload.state, verifier: payload.verifier }
    }
    return null
  } catch {
    return null
  }
}

export function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: getEnv().BASE_URL.startsWith('https'),
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: MAX_AGE_SECONDS,
  }
}

export function clearedStateCookieOptions() {
  return { ...stateCookieOptions(), maxAge: 0 }
}
