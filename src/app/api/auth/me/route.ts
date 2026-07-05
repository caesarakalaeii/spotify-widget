import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/db/users'
import { ensureOverlayForUser } from '@/lib/db/overlays'
import { getEnv } from '@/lib/config/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Session info for the dashboard (identity, overlay URL, re-auth flag). */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await getUserById(session.userId)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const overlay = await ensureOverlayForUser(user.id)
  return NextResponse.json({
    displayName: user.display_name,
    needsReauth: user.needs_reauth,
    overlayId: overlay.publicId,
    overlayUrl: `${getEnv().BASE_URL}/overlay/${overlay.publicId}`,
  })
}
