# ADR-0005: CNPG Postgres persistence, and no caching of Spotify content

- **Status:** Accepted
- **Date:** 2026-07-05

## Context

The widget must persist enough to be hands-off across restarts (tokens, settings, overlay ids),
but the Spotify Developer Terms forbid caching content beyond immediate use, require attribution,
and forbid training ML models on Spotify data.

## Decision

Persist **only**: user identity (`spotify_user_id`, display name), the **encrypted** Spotify
refresh token, per-user widget `settings` (JSONB), and the public overlay id. Use a
**single-instance CloudNativePG Postgres** (durability, not HA, is the requirement). Access tokens
are never stored — held in memory in the poll loop and refreshed on demand. Track/album/artist
content is fetched live per poll, pushed over SSE, and **never written to the database**; the
in-memory snapshot is dropped when the poll loop stops. The widget shows a Spotify logo linking to
the track (required attribution).

## Consequences

- Compliant with the Spotify Developer Terms (no content caching, attribution present, no ML use).
- Schema (`migrations/0001_init.sql`) has no track/content columns. A small self-contained SQL
  migrator (`scripts/migrate.mjs`, using `pg`) runs on container start — works inside the Next.js
  standalone image without extra tooling.
- Refresh tokens are AES-256-GCM encrypted with a versioned key to allow rotation.
