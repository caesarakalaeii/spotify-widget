import type { Metadata, Viewport } from 'next'
import { Barlow, DM_Mono } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-barlow',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Spotify Vinyl Widget — now playing on stream',
    template: '%s | Spotify Vinyl Widget',
  },
  description:
    'A spinning-vinyl "now playing" widget for your stream. Connect Spotify, drop the URL into OBS, done.',
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#07070a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(barlow.variable, dmMono.variable)}>
      <body>{children}</body>
    </html>
  )
}
