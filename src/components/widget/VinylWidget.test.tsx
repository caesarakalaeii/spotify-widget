import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VinylWidget } from './VinylWidget'
import { DEFAULT_SETTINGS, parseSettings } from '@/lib/settings/schema'
import type { NowPlaying } from '@/types/nowplaying'

function playing(overrides: Partial<NowPlaying['track']> = {}): NowPlaying {
  return {
    isPlaying: true,
    track: {
      name: 'Song Title',
      artists: ['Artist One'],
      album: 'The Album',
      albumArtUrl: 'https://i.scdn.co/image/abc',
      trackUrl: 'https://open.spotify.com/track/xyz',
      progressMs: 1000,
      durationMs: 200000,
      ...overrides,
    },
    fetchedAt: Date.now(),
  }
}

describe('VinylWidget', () => {
  it('spins and rests the tonearm on the record while playing, with attribution', () => {
    render(<VinylWidget settings={DEFAULT_SETTINGS} playback={playing()} />)
    expect(screen.getByTestId('vinyl-disc')).toHaveAttribute('data-spin', 'spinning')
    expect(screen.getByTestId('tonearm')).toHaveAttribute('data-position', 'playing')
    expect(screen.getByText('Song Title')).toBeInTheDocument()
    expect(screen.getByTestId('spotify-attribution')).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/xyz',
    )
  })

  it('spins down and cues (lifts) the tonearm when paused', () => {
    render(<VinylWidget settings={DEFAULT_SETTINGS} playback={{ ...playing(), isPlaying: false }} />)
    expect(screen.getByTestId('vinyl-disc')).toHaveAttribute('data-spin', 'spinning-down')
    expect(screen.getByTestId('tonearm')).toHaveAttribute('data-position', 'cued')
  })

  it('shows a stopped disc, parks the tonearm, and shows the idle label when nothing is playing', () => {
    render(<VinylWidget settings={DEFAULT_SETTINGS} playback={null} />)
    expect(screen.getByTestId('vinyl-widget')).toHaveAttribute('data-idle', 'true')
    expect(screen.getByTestId('vinyl-disc')).toHaveAttribute('data-spin', 'stopped')
    expect(screen.getByTestId('tonearm')).toHaveAttribute('data-position', 'rest')
    expect(screen.getByTestId('idle-label')).toHaveTextContent('Not playing')
  })

  it('hides the tonearm when the setting is off', () => {
    const settings = parseSettings({ vinyl: { tonearm: false } })
    render(<VinylWidget settings={settings} playback={playing()} />)
    expect(screen.queryByTestId('tonearm')).toBeNull()
  })

  it('honours reduced motion by stopping the disc even while playing', () => {
    render(<VinylWidget settings={DEFAULT_SETTINGS} playback={playing()} reducedMotion />)
    expect(screen.getByTestId('vinyl-disc')).toHaveAttribute('data-spin', 'stopped')
  })

  it('renders a duplicated marquee span for a long title', () => {
    const settings = parseSettings({ text: { marqueeThreshold: 10 } })
    render(
      <VinylWidget settings={settings} playback={playing({ name: 'A very very long track title' })} />,
    )
    const spans = screen.getAllByText('A very very long track title')
    expect(spans.length).toBe(2) // visible + duplicate for seamless loop
  })
})
