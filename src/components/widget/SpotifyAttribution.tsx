'use client'

import { cn } from '@/lib/utils'

/**
 * Spotify content attribution — required by the Spotify Developer Terms and not
 * removable in settings (only its placement/style vary). Links to the track on
 * Spotify when a URL is available.
 */
export function SpotifyAttribution({
  trackUrl,
  style,
  className,
}: {
  trackUrl: string | null
  style: 'logo' | 'logo-text'
  className?: string
}) {
  const content = (
    <>
      <SpotifyLogo />
      {style === 'logo-text' && <span>Listen on Spotify</span>}
    </>
  )

  const base = cn(
    'inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70',
    className,
  )

  if (trackUrl) {
    return (
      <a
        href={trackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(base, 'hover:text-white')}
        data-testid="spotify-attribution"
      >
        {content}
      </a>
    )
  }
  return (
    <span className={base} data-testid="spotify-attribution">
      {content}
    </span>
  )
}

function SpotifyLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954" aria-label="Spotify" role="img">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 1 1-.277-1.215c3.809-.871 7.077-.496 9.712 1.115a.623.623 0 0 1 .207.857zm1.223-2.722a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.13-9.965-1.166a.779.779 0 1 1-.454-1.49c3.632-1.102 8.147-.568 11.234 1.328a.78.78 0 0 1 .257 1.071zm.105-2.835C14.692 8.95 9.375 8.775 6.412 9.676a.935.935 0 1 1-.542-1.79c3.4-1.032 9.27-.833 12.93 1.34a.935.935 0 1 1-.955 1.607z" />
    </svg>
  )
}
