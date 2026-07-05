#!/usr/bin/env node
/**
 * Minimal, self-contained SQL migrator. Applies every migrations/*.sql file not
 * yet recorded in schema_migrations, each in its own transaction. Uses `pg`
 * (already a runtime dependency), so it works inside the Next.js standalone
 * image without any extra tooling. Idempotent and safe to run on every boot.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const user = encodeURIComponent(process.env.DATABASE_USER || 'spotify_user')
  const pass = encodeURIComponent(process.env.DATABASE_PASSWORD || '')
  const host = process.env.DATABASE_HOST || '127.0.0.1'
  const port = process.env.DATABASE_PORT || '5432'
  const name = process.env.DATABASE_NAME || 'spotify_widget'
  const auth = pass ? `${user}:${pass}` : user
  return `postgresql://${auth}@${host}:${port}/${name}`
}

async function main() {
  const client = new pg.Client({ connectionString: connectionString() })
  await client.connect()
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         id TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    )
    const dir = path.join(process.cwd(), 'migrations')
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
    const appliedRows = await client.query('SELECT id FROM schema_migrations')
    const applied = new Set(appliedRows.rows.map((r) => r.id))

    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(path.join(dir, file), 'utf8')
      process.stdout.write(`migrate: applying ${file}\n`)
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file])
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }
    process.stdout.write('migrate: up to date\n')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  process.stderr.write(`migrate: failed: ${err?.message || err}\n`)
  process.exit(1)
})
