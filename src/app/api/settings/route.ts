import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { ensureOverlayForUser, saveSettings } from '@/lib/db/overlays'
import { SettingsSchema } from '@/lib/settings/schema'
import { getPollManager } from '@/lib/poller/PollManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const unauthorized = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 })

/** Read the authenticated user's widget settings. */
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  const overlay = await ensureOverlayForUser(session.userId)
  return NextResponse.json(overlay.settings)
}

/** Save widget settings and push them live to any connected overlay. */
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const parsed = SettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid settings', issues: parsed.error.issues }, { status: 400 })
  }

  await ensureOverlayForUser(session.userId)
  const overlay = await saveSettings(session.userId, parsed.data)
  // Live-update every OBS overlay currently viewing this user's widget.
  getPollManager().pushSettings(session.userId, parsed.data)
  return NextResponse.json(overlay.settings)
}
