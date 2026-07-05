import { test, expect, type Page } from '@playwright/test'

// Full default settings (the widget needs every field to render).
const SETTINGS = {
  layout: { size: 280, anchor: 'bottom-left', padding: 24, orientation: 'disc-left', gap: 16 },
  vinyl: {
    rpm: 33.333,
    spinDown: true,
    tonearm: true,
    grooveIntensity: 0.6,
    artShape: 'disc-label',
    sheen: true,
  },
  text: {
    showTitle: true,
    showArtist: true,
    showAlbum: false,
    font: 'barlow',
    titleSize: 22,
    artistSize: 16,
    marquee: true,
    marqueeThreshold: 28,
    align: 'left',
  },
  colors: {
    background: 'transparent',
    backgroundColor: '#07070a',
    backgroundOpacity: 0.6,
    accent: '#1db954',
    titleColor: '#e8e8ee',
    artistColor: '#a0a0b0',
    glow: true,
  },
  progress: { show: true, showTime: true, thickness: 4 },
  behaviour: { idleText: 'Not playing', fadeMs: 400, pollMs: 5000 },
  attribution: { position: 'auto', style: 'logo-text' },
  schemaVersion: 1,
}

function sse(events: Array<{ event: string; data: unknown }>): string {
  return events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join('')
}

async function mockOverlay(page: Page, streamBody: string) {
  await page.route('**/api/overlay/*/config', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(SETTINGS) }),
  )
  await page.route('**/api/overlay/*/stream', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'cache-control': 'no-cache' },
      body: streamBody,
    }),
  )
}

test('renders a spinning vinyl for a playing track on a transparent background', async ({ page }) => {
  await mockOverlay(
    page,
    sse([
      { event: 'settings', data: SETTINGS },
      {
        event: 'nowplaying',
        data: {
          isPlaying: true,
          track: {
            name: 'Song Title',
            artists: ['Artist One'],
            album: 'The Album',
            albumArtUrl: null,
            trackUrl: 'https://open.spotify.com/track/xyz',
            progressMs: 1000,
            durationMs: 200000,
          },
          fetchedAt: 1700000000000,
        },
      },
    ]),
  )

  await page.goto('/overlay/test-overlay')

  await expect(page.getByTestId('vinyl-disc')).toHaveAttribute('data-spin', 'spinning')
  await expect(page.getByText('Song Title')).toBeVisible()
  await expect(page.getByTestId('spotify-attribution')).toBeVisible()

  // OBS captures alpha — the body must be fully transparent.
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgba(0, 0, 0, 0)')
})

test('shows a stopped vinyl and the idle label when nothing is playing', async ({ page }) => {
  await mockOverlay(
    page,
    sse([
      { event: 'settings', data: SETTINGS },
      { event: 'nowplaying', data: { isPlaying: false, track: null, fetchedAt: 1700000000000 } },
    ]),
  )

  await page.goto('/overlay/test-overlay')

  await expect(page.getByTestId('vinyl-widget')).toHaveAttribute('data-idle', 'true')
  await expect(page.getByTestId('vinyl-disc')).toHaveAttribute('data-spin', 'stopped')
  await expect(page.getByTestId('idle-label')).toHaveText('Not playing')
})
