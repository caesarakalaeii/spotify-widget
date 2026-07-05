import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db/pool'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Readiness probe: verifies the database is reachable. */
export async function GET() {
  try {
    await getPool().query('SELECT 1')
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'degraded' }, { status: 503 })
  }
}
