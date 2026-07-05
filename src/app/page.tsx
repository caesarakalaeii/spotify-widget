import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { Button } from '@/components/ui/Button'

export default async function LandingPage() {
  // Already connected → straight to the dashboard.
  const session = await getSession().catch(() => null)
  if (session) redirect('/dashboard')

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl">💿</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Your Spotify, spinning on stream
        </h1>
        <p className="max-w-xl text-text-sub">
          A now-playing widget that turns your current track&apos;s album art into a spinning vinyl
          record. Connect Spotify, customise the look, and drop one URL into OBS as a Browser Source.
        </p>
      </div>

      <Link href="/api/auth/login">
        <Button size="lg" className="gap-2">
          Connect with Spotify
        </Button>
      </Link>

      <ol className="grid gap-3 text-left text-sm text-text-sub sm:grid-cols-3">
        <li className="rounded-lg border border-border bg-surface p-4">
          <span className="font-mono text-spotify">1.</span> Connect your Spotify account.
        </li>
        <li className="rounded-lg border border-border bg-surface p-4">
          <span className="font-mono text-spotify">2.</span> Tune the vinyl&apos;s look in the
          dashboard.
        </li>
        <li className="rounded-lg border border-border bg-surface p-4">
          <span className="font-mono text-spotify">3.</span> Paste the overlay URL into OBS.
        </li>
      </ol>

      <p className="max-w-md text-xs text-text-dim">
        Content and album art are provided by Spotify. This is an unofficial tool and is not
        affiliated with or endorsed by Spotify.
      </p>
    </main>
  )
}
