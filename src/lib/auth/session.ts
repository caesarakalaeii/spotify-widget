import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getEnv } from '@/lib/config/env'

/** Stateless dashboard session: an HS256 JWT in an httpOnly cookie. */
export const SESSION_COOKIE = 'sw_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().SESSION_SECRET)
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey())
}

export async function verifySession(token: string | undefined): Promise<{ userId: string } | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return typeof payload.sub === 'string' ? { userId: payload.sub } : null
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: getEnv().BASE_URL.startsWith('https'),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }
}

export function clearedSessionCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 }
}

/** Read the current session from the request cookies (server components/handlers). */
export async function getSession(): Promise<{ userId: string } | null> {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
}
