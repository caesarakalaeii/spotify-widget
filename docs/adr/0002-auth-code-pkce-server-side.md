# ADR-0002: Authorization Code + PKCE, executed server-side

- **Status:** Accepted
- **Date:** 2026-07-05

## Context

The widget needs per-user Spotify data (currently playing). Spotify's Implicit Grant is
deprecated. The token exchange requires the client secret, which must never reach the browser.
The app must keep working hands-off, so refresh tokens are stored server-side.

## Decision

Run the full **Authorization Code + PKCE** flow inside Route Handlers:

- `/api/auth/login` generates a `code_verifier`/`code_challenge` (S256) and a CSRF `state`,
  stored together in a **short-lived, HMAC-signed, httpOnly cookie** (`sw_oauth`, `SameSite=Lax`).
  A signed cookie avoids a shared server store (and its TOCTOU race) because the store is the
  caller's own browser; it is single-use (cleared at the callback).
- `/api/auth/callback` verifies `state` in constant time, exchanges the code with the client
  secret **and** the PKCE verifier (confidential client + defence in depth), then stores the
  **AES-256-GCM-encrypted** refresh token.
- Only the minimum scope `user-read-currently-playing` is requested.
- Refresh tokens are rotated when Spotify returns a new one; a terminal `invalid_grant` marks the
  user `needs_reauth` and prompts reconnection.
- Redirect URIs are HTTPS in production and the loopback **IP** (`http://127.0.0.1:3000/...`) for
  local dev — never `localhost`, never wildcards.

## Consequences

- The client secret and refresh tokens never leave the server; refresh tokens are encrypted at
  rest with a versioned key (`token_key_version`) to allow future rotation.
- Session is a stateless HS256 JWT in an httpOnly cookie (`sw_session`); no server session table.
