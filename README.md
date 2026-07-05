# Spotify Vinyl Widget — `spotify.caes.ar`

A now-playing widget for streamers. Connect Spotify once, then drop a single URL into
OBS as a **Browser Source**. Your current track's album art becomes a **spinning vinyl
record** that spins while music plays and stops when it doesn't. A dashboard lets you
customise the look and behaviour with a live preview.

- 🎧 **Connect with Spotify** — one click (Authorization Code + PKCE, server-side).
- 💿 **Spinning vinyl** — album art as a record with grooves, tonearm, and a spin-down on pause.
- 🎛️ **Full GUI** — size, layout, colours, fonts, progress bar, marquee, idle text, and more, with a live preview.
- 📺 **OBS-ready** — transparent, public, unguessable overlay URL. Live updates via SSE (no refresh needed).
- 🪶 **Hands-off** — settings and encrypted tokens persist; the widget keeps working while you stream.

## For streamers (quick start)

1. Go to **https://spotify.caes.ar** and click **Connect with Spotify**.
2. On the dashboard, tune the widget and copy the **overlay URL**.
3. In OBS: **Sources → Add → Browser**, paste the URL, and set the recommended size shown
   on the dashboard. The background is transparent.

That's it — the vinyl spins whenever you're playing something.

## Architecture

A single **Next.js 16** (App Router) app. Route handlers under `src/app/api/**` are the
secure backend; the client secret never reaches the browser.

```
Streamer ──login──▶ spotify.caes.ar (dashboard, httpOnly session)
OBS Browser Source ─▶ /overlay/[overlayId]  (public, transparent, EventSource/SSE)
                         ▲ settings + nowplaying
   PollManager (one loop per active user, ref-counted across viewers)
     └ GET /me/player/currently-playing  (5s playing / 15s idle, 429 backoff, in-memory only)
   Postgres: users(encrypted refresh token) · overlays(public_id, settings jsonb)
```

- **Live transport:** Server-Sent Events (`EventSource`) — one-way, auto-reconnecting, ideal for OBS.
- **Polling:** a process-wide `PollManager` polls Spotify only while an overlay has viewers, de-duplicating across viewers of the same overlay, backing off on HTTP 429 (honouring `Retry-After`).
- **Persistence:** only user identity, the **AES-256-GCM-encrypted** refresh token, per-user settings, and the overlay id. **No Spotify track/album content is ever cached** (Spotify Developer Terms); album art / titles are fetched live and shown transiently, with a required Spotify attribution link in the widget.

Key decisions are recorded in [`docs/adr/`](docs/adr/).

## Local development

Prerequisites: Node 22+, Docker (for Postgres), and a Spotify app (see below).

```bash
cp .env.example .env.local          # fill in SPOTIFY_CLIENT_ID/SECRET etc.
docker compose up -d db             # local Postgres on 127.0.0.1:5432
npm install
npm run migrate                     # create tables
npm run dev                         # http://127.0.0.1:3000
```

Register `http://127.0.0.1:3000/api/auth/callback` as a redirect URI on your Spotify app
(loopback **IP**, not `localhost`), then open http://127.0.0.1:3000 and connect.

### Spotify app setup

In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) create one app and register these redirect URIs:

- `https://spotify.caes.ar/api/auth/callback` (production)
- `http://127.0.0.1:3000/api/auth/callback` (local dev)

Scope required: **`user-read-currently-playing`** only. Development-mode apps allow up to
25 users; apply for **Extended Quota Mode** to go beyond that (no code changes needed).

## Environment variables

| Var | Purpose |
|---|---|
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify app credentials (secret is server-only) |
| `SPOTIFY_REDIRECT_URI` | Must byte-match a registered redirect URI |
| `SPOTIFY_SCOPES` | `user-read-currently-playing` |
| `SESSION_SECRET` | ≥32 chars; signs session + OAuth-state cookies (`openssl rand -base64 32`) |
| `TOKEN_ENCRYPTION_KEY` | base64 32-byte AES-256-GCM key for refresh tokens (`openssl rand -base64 32`) |
| `BASE_URL` | e.g. `https://spotify.caes.ar` |
| `DATABASE_URL` **or** `DATABASE_{HOST,PORT,NAME,USER,PASSWORD}` | Postgres connection |
| `LOG_LEVEL` | `info` (default) |

See [`.env.example`](.env.example).

## Testing

```bash
npm test          # unit + component (Vitest)
npm run type-check
npm run test:e2e  # Playwright overlay smoke test (builds + runs a prod server, mocks Spotify)
```

- **Unit/component:** PKCE, token encryption, OAuth refresh + terminal re-auth, 429 backoff,
  settings schema, spin math, and the `PollManager` fan-out/de-dup/refresh logic.
- **DB integration** (opt-in, needs Postgres): `RUN_DB_TESTS=1 DATABASE_URL=... npm test`.
- **E2E:** loads `/overlay/[id]` with a mocked Spotify and asserts the vinyl spins, the idle
  state renders, and the background is transparent. A **full real-Spotify OAuth flow cannot be
  automated** (it needs real credentials, the dev-mode allowlist, and human consent on
  accounts.spotify.com), so that boundary is covered by mocked unit/integration tests.

## Deployment

Containerised and deployed via the `caesar-deployment` GitOps stack (ArgoCD + Kustomize +
SOPS), served at `spotify.caes.ar`:

- Push to `main` → GitHub Actions builds & pushes `ghcr.io/caesarakalaeii/spotify-widget:main`.
- **Keel** (`keel.sh/policy: force`, `trigger: poll`) rolls the Deployment when the image changes.
- **cert-manager** issues TLS; **ingress-nginx** routes the host (with SSE-friendly buffering off).
- A single-instance **CloudNativePG** Postgres holds the data; migrations run on container start.

Manifests live in `caesar-deployment/apps/workloads/spotify-widget/`.

## Licence / attribution

Album art, track and artist names are provided by **Spotify**. This is an unofficial tool and is
not affiliated with or endorsed by Spotify. Content is shown transiently and never cached beyond
immediate use, per the [Spotify Developer Terms](https://developer.spotify.com/terms).
