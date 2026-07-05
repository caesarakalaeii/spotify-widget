# ADR-0003: Public, id-addressed transparent overlay for OBS

- **Status:** Accepted
- **Date:** 2026-07-05

## Context

An OBS Browser Source loads a URL with no ability to authenticate (no cookies, no login). The
overlay must render chrome-free on a transparent background and be safe to expose publicly.

## Decision

Expose the widget at `/overlay/[overlayId]`, where `overlayId` is an **unguessable public id**
(`nanoid(22)`, ~131 bits). The route is unauthenticated; the id is the only capability and maps to
a user's settings, never to their tokens. The overlay layout forces `html,body{background:
transparent}` and hides scrollbars for OBS. The page is a client component that subscribes to a
live stream and renders the vinyl widget.

## Consequences

- Streamers can paste the URL into OBS with zero auth friction.
- The id grants read-only visibility of what is *already public* (the current track) plus the
  streamer's chosen widget styling — no account access. A leaked id can be rotated by re-creating
  the overlay (future enhancement).
- `frame-ancestors 'none'` + `X-Frame-Options: DENY` on `/overlay/*` prevent third-party framing.
