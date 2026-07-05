import type { Metadata, Viewport } from 'next'
import {
  Barlow,
  DM_Mono,
  Inter,
  Montserrat,
  Poppins,
  Space_Grotesk,
  Oswald,
  Rajdhani,
  Bebas_Neue,
  Anton,
  Archivo_Black,
  Roboto_Mono,
} from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

// Barlow is the app UI font (and the widget default) — preload it. The rest are
// widget-picker options: self-hosted but not preloaded, so they only download when
// a streamer actually selects them (display: swap avoids any blocking).
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-barlow',
  display: 'swap',
})
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono', display: 'swap' })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap', preload: false })
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-montserrat', display: 'swap', preload: false })
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap', preload: false })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-space-grotesk', display: 'swap', preload: false })
const oswald = Oswald({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-oswald', display: 'swap', preload: false })
const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-rajdhani', display: 'swap', preload: false })
const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: ['400'], variable: '--font-bebas-neue', display: 'swap', preload: false })
const anton = Anton({ subsets: ['latin'], weight: ['400'], variable: '--font-anton', display: 'swap', preload: false })
const archivoBlack = Archivo_Black({ subsets: ['latin'], weight: ['400'], variable: '--font-archivo-black', display: 'swap', preload: false })
const robotoMono = Roboto_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-roboto-mono', display: 'swap', preload: false })

const fontVars = cn(
  barlow.variable,
  dmMono.variable,
  inter.variable,
  montserrat.variable,
  poppins.variable,
  spaceGrotesk.variable,
  oswald.variable,
  rajdhani.variable,
  bebasNeue.variable,
  anton.variable,
  archivoBlack.variable,
  robotoMono.variable,
)

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
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  )
}
