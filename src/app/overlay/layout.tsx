import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Overlay',
  description: 'Spotify now-playing widget for OBS Browser Source',
  robots: { index: false, follow: false },
}

/**
 * Overlay pages render inside an OBS Browser Source, which captures alpha.
 * Force the html/body transparent (overriding the global grid background) and
 * suppress scrollbars.
 */
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              background: transparent !important;
              background-image: none !important;
              overflow: hidden !important;
            }
            ::-webkit-scrollbar { display: none; }
            * { scrollbar-width: none; }
          `,
        }}
      />
      {children}
    </>
  )
}
