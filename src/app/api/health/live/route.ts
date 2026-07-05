import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Liveness probe: always OK, never touches the DB (a DB blip must not restart the pod). */
export async function GET() {
  return NextResponse.json({ status: 'alive' })
}
