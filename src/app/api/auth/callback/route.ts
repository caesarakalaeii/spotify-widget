import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { timingSafeEqual } from 'node:crypto'
import { getEnv } from '@/lib/config/env'
import {
  verifyState,
  STATE_COOKIE,
  clearedStateCookieOptions,
} from '@/lib/auth/stateCookie'
import { exchangeCode, getCurrentUser } from '@/lib/spotify/oauth'
import { upsertUser } from '@/lib/db/users'
import { ensureOverlayForUser } from '@/lib/db/overlays'
import { signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Spotify redirect target: validate state, exchange the code, open a session. */
export async function GET(req: NextRequest) {
  const base = getEnv().BASE_URL
  const store = await cookies()
  const payload = await verifyState(store.get(STATE_COOKIE)?.value)

  const url = new URL(req.url)
  const err = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // The state cookie is single-use: clear it on every outcome.
  const withClearedState = (res: NextResponse) => {
    res.cookies.set(STATE_COOKIE, '', clearedStateCookieOptions())
    return res
  }
  const redirect = (path: string) => withClearedState(NextResponse.redirect(new URL(path, base)))
  const badRequest = (msg: string) =>
    withClearedState(NextResponse.json({ error: msg }, { status: 400 }))

  if (err) return redirect('/?auth=denied')
  if (!payload || !code || !state) return badRequest('missing state or code')
  if (!constantTimeEqual(state, payload.state)) return badRequest('state mismatch')

  try {
    const tokens = await exchangeCode({ code, codeVerifier: payload.verifier })
    if (!tokens.refresh_token) throw new Error('Spotify did not return a refresh token')

    const me = await getCurrentUser(tokens.access_token)
    const { id } = await upsertUser({
      spotifyUserId: me.id,
      displayName: me.display_name,
      refreshToken: tokens.refresh_token,
    })
    await ensureOverlayForUser(id)

    const res = redirect('/dashboard')
    res.cookies.set(SESSION_COOKIE, await signSession(id), sessionCookieOptions())
    return res
  } catch (e) {
    logger.error('oauth callback failed', { err: String(e) })
    return redirect('/?auth=error')
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}
