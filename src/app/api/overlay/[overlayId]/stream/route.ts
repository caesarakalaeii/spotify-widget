import { getOverlayByPublicId } from '@/lib/db/overlays'
import { getPollManager, type Subscriber } from '@/lib/poller/PollManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * SSE stream for an OBS overlay. Sends `settings` on connect, then `nowplaying`
 * events as the server-side poller fans them out, plus `needs_reauth` on
 * terminal auth failure. Heartbeats keep the connection alive through proxies.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ overlayId: string }> }) {
  const { overlayId } = await params
  const overlay = await getOverlayByPublicId(overlayId)
  if (!overlay) return new Response('Not found', { status: 404 })

  const encoder = new TextEncoder()
  const pm = getPollManager()
  let subscriber: Subscriber | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
        } catch {
          // Controller closed (client gone) — ignore.
        }
      }

      // Current settings first, so the widget can paint immediately.
      send('settings', JSON.stringify(overlay.settings))

      subscriber = {
        onNowPlaying: (np) => send('nowplaying', JSON.stringify(np)),
        onSettings: (s) => send('settings', JSON.stringify(s)),
        onNeedsReauth: () => send('needs_reauth', '{}'),
      }
      pm.addViewer(overlay.userId, subscriber)

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:hb\n\n`))
        } catch {
          // ignore
        }
      }, 15_000)
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      if (subscriber) pm.removeViewer(overlay.userId, subscriber)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
