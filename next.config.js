/** @type {import('next').NextConfig} */

// Content-Security-Policy shared across routes. Spotify album art comes from the
// scdn.co CDN; SSE/XHR only ever hit our own origin (connect-src 'self').
// Next.js dev mode (Turbopack/React refresh) requires eval(); production does not.
const isDev = process.env.NODE_ENV !== 'production'
const scriptSrc = isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'"

const cspBase = [
  "default-src 'self'",
  "img-src 'self' data: https://i.scdn.co https://*.scdn.co",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.spotify.com",
]

const hardening = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  // Deterministic build id (falls back to a timestamp locally).
  generateBuildId: async () => process.env.NEXT_PUBLIC_GIT_COMMIT || `build-${Date.now()}`,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: '*.scdn.co' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...hardening,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value: [...cspBase, "frame-ancestors 'self'"].join('; '),
          },
        ],
      },
      {
        // Public OBS overlay: never framed by third parties.
        source: '/overlay/:path*',
        headers: [
          ...hardening,
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Content-Security-Policy',
            value: [...cspBase, "frame-ancestors 'none'"].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
