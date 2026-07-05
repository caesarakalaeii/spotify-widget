import { nanoid } from 'nanoid'
import { query } from '@/lib/db/pool'
import { DEFAULT_SETTINGS, parseSettings, type WidgetSettings } from '@/lib/settings/schema'

export interface OverlayRow {
  id: string
  user_id: string
  public_id: string
  settings: unknown
}

export interface Overlay {
  id: string
  userId: string
  publicId: string
  settings: WidgetSettings
}

function toOverlay(row: OverlayRow): Overlay {
  return {
    id: row.id,
    userId: row.user_id,
    publicId: row.public_id,
    settings: parseSettings(row.settings),
  }
}

/** Return the user's overlay, creating one (with defaults) if none exists. */
export async function ensureOverlayForUser(userId: string): Promise<Overlay> {
  const existing = await query<OverlayRow>(`SELECT * FROM overlays WHERE user_id = $1 LIMIT 1`, [
    userId,
  ])
  if (existing[0]) return toOverlay(existing[0])

  const rows = await query<OverlayRow>(
    `INSERT INTO overlays (user_id, public_id, settings)
     VALUES ($1, $2, $3::jsonb) RETURNING *`,
    [userId, nanoid(22), JSON.stringify(DEFAULT_SETTINGS)],
  )
  return toOverlay(rows[0]!)
}

export async function getOverlayByPublicId(publicId: string): Promise<Overlay | null> {
  const rows = await query<OverlayRow>(`SELECT * FROM overlays WHERE public_id = $1`, [publicId])
  return rows[0] ? toOverlay(rows[0]) : null
}

export async function getOverlayByUserId(userId: string): Promise<Overlay | null> {
  const rows = await query<OverlayRow>(`SELECT * FROM overlays WHERE user_id = $1 LIMIT 1`, [userId])
  return rows[0] ? toOverlay(rows[0]) : null
}

/** Persist validated settings for the user's overlay. Returns the saved overlay. */
export async function saveSettings(userId: string, settings: WidgetSettings): Promise<Overlay> {
  const rows = await query<OverlayRow>(
    `UPDATE overlays SET settings = $2::jsonb, updated_at = now()
     WHERE user_id = $1 RETURNING *`,
    [userId, JSON.stringify(settings)],
  )
  if (!rows[0]) throw new Error('No overlay for user')
  return toOverlay(rows[0])
}
