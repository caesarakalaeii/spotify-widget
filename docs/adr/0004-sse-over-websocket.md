# ADR-0004: Server-Sent Events over WebSocket for live updates

- **Status:** Accepted
- **Date:** 2026-07-05

## Context

The overlay only needs the server to push the current track and settings changes to the browser.
It runs inside OBS's embedded Chromium and must survive scene switches and rolling deploys.

## Decision

Use **Server-Sent Events** (`EventSource`) at `/api/overlay/[overlayId]/stream`, emitting
`settings`, `nowplaying`, and `needs_reauth` events plus heartbeats. A process-wide
**`PollManager`** polls Spotify once per active user (ref-counted across viewers, 5s while
playing / 15s idle, with a 60s grace window after the last viewer disconnects) and fans results
out to that user's subscribers. The client interpolates `progress_ms` locally, so a low upstream
cadence still looks smooth.

## Consequences

- One-directional and simpler than WebSocket: `EventSource` auto-reconnects (with the config
  re-fetched on reconnect as a settings fallback), needs no upgrade handshake, and works through
  ingress-nginx with `proxy-buffering: off`.
- Rate-limit safety: a global circuit breaker backs off on HTTP 429, honouring `Retry-After`.
- The `PollManager` singleton and in-process fan-out assume `replicas: 1`. Scaling out later means
  swapping the in-process pub/sub for Postgres `LISTEN/NOTIFY` — no API change for clients.
