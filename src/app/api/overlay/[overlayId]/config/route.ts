import { NextResponse } from 'next/server'
import { getOverlayByPublicId } from '@/lib/db/overlays'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Public, non-secret settings snapshot for first paint / preview fallback. */
export async function GET(_req: Request, { params }: { params: Promise<{ overlayId: string }> }) {
  const { overlayId } = await params
  const overlay = await getOverlayByPublicId(overlayId)
  if (!overlay) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(overlay.settings)
}
