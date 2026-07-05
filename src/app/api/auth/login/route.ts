import { NextResponse } from 'next/server'
import { generateVerifier, challengeFromVerifier, generateState } from '@/lib/spotify/pkce'
import { buildAuthorizeUrl } from '@/lib/spotify/oauth'
import { signState, STATE_COOKIE, stateCookieOptions } from '@/lib/auth/stateCookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Start the Authorization Code + PKCE flow. */
export async function GET() {
  const verifier = generateVerifier()
  const challenge = challengeFromVerifier(verifier)
  const state = generateState()

  const cookieValue = await signState({ state, verifier })
  const authorizeUrl = buildAuthorizeUrl({ state, codeChallenge: challenge })

  const res = NextResponse.redirect(authorizeUrl)
  res.cookies.set(STATE_COOKIE, cookieValue, stateCookieOptions())
  return res
}
