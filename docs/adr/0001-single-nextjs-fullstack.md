# ADR-0001: Single Next.js full-stack app over a split Go + Next.js stack

- **Status:** Accepted
- **Date:** 2026-07-05

## Context

The design inspiration (`all-chat`) splits ~20 Go microservices from a Next.js frontend. This
project is far smaller in scope: one Spotify scope, one dashboard, one overlay. It must be
"easy to set up and hands-off".

## Decision

Build a single **Next.js 16 (App Router)** application where **Route Handlers are the secure
backend**. One container, one CI pipeline, one deployment. The Spotify client secret is read
only inside route handlers and never shipped to the browser.

## Consequences

- Much lower operational overhead than a microservice split; a single image and pipeline.
- Server-only concerns (OAuth token exchange, polling, DB) live in `src/app/api/**` and
  `src/lib/**` with `runtime = 'nodejs'`.
- Less service isolation and no independent scaling of a "backend" — acceptable at this scope.
  The `PollManager` singleton assumes a single process (`replicas: 1`); horizontal scale would
  require moving fan-out to Postgres `LISTEN/NOTIFY` (noted in ADR-0004).
