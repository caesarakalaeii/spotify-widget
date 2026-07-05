import { defineConfig, devices } from '@playwright/test'

/**
 * E2E runs against `next dev`. The overlay spec intercepts the config + SSE
 * routes with page.route and serves canned data, so no database or real Spotify
 * is needed. Real Spotify OAuth cannot run in CI — it needs real credentials,
 * the 25-user dev-mode allowlist, and human consent on accounts.spotify.com —
 * so we validate our own wiring (overlay render, spin, idle) against fixtures.
 */
const dummyEnv = {
  SPOTIFY_CLIENT_ID: 'test-client-id',
  SPOTIFY_CLIENT_SECRET: 'test-client-secret',
  SPOTIFY_REDIRECT_URI: 'http://127.0.0.1:3100/api/auth/callback',
  SPOTIFY_SCOPES: 'user-read-currently-playing',
  SESSION_SECRET: 'test-session-secret-at-least-32-bytes-long!!',
  TOKEN_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
  BASE_URL: 'http://127.0.0.1:3100',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'spotify_widget',
  DATABASE_USER: 'spotify_user',
  DATABASE_PASSWORD: 'dev',
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Run against a production build: Next dev (Turbopack HMR) does not hydrate
  // reliably under headless automation, and production is what actually ships.
  webServer: {
    command: 'next build && next start -p 3100',
    url: 'http://127.0.0.1:3100/api/health/live',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: dummyEnv,
  },
})
