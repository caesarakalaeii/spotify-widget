-- Initial schema. Stores ONLY user identity, the encrypted Spotify refresh
-- token, per-user widget settings, and the public overlay id. No Spotify track
-- or album content is ever persisted (Spotify Developer Terms).

CREATE TABLE IF NOT EXISTS users (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_user_id           TEXT NOT NULL UNIQUE,
  display_name              TEXT,
  refresh_token_ciphertext  BYTEA NOT NULL,
  refresh_token_iv          BYTEA NOT NULL,
  refresh_token_tag         BYTEA NOT NULL,
  token_key_version         SMALLINT NOT NULL DEFAULT 1,
  needs_reauth              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS overlays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_id   TEXT NOT NULL UNIQUE,
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overlays_user_id ON overlays(user_id);
