import { Pool } from 'pg'
import { databaseUrl } from '@/lib/config/env'

/**
 * Process-wide pg connection pool. Reused across all route handlers and the
 * poller. `globalThis` caching survives Next.js dev hot-reloads.
 */
declare global {
  // eslint-disable-next-line no-var
  var __swPgPool: Pool | undefined
}

export function getPool(): Pool {
  if (!globalThis.__swPgPool) {
    globalThis.__swPgPool = new Pool({
      connectionString: databaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  }
  return globalThis.__swPgPool
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await getPool().query(text, params)
  return res.rows as T[]
}
