'use client'

import { useEffect, useRef, useState } from 'react'
import type { NowPlaying } from '@/types/nowplaying'
import type { WidgetSettings } from '@/lib/settings/schema'

export type Connection = 'connecting' | 'open' | 'needs_reauth'

interface State {
  settings: WidgetSettings | null
  playback: NowPlaying | null
  connection: Connection
}

/**
 * Subscribes an overlay to its live now-playing stream via SSE. EventSource
 * auto-reconnects (surviving OBS scene switches and rolling deploys); on every
 * (re)connect the server re-sends the current settings + snapshot, and we also
 * fetch the config once for a fast first paint before the stream warms up.
 */
export function useNowPlaying(overlayId: string): State {
  const [state, setState] = useState<State>({
    settings: null,
    playback: null,
    connection: 'connecting',
  })
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    let cancelled = false

    // Fast first paint: seed settings from the config endpoint.
    fetch(`/api/overlay/${overlayId}/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((settings: WidgetSettings | null) => {
        if (!cancelled && settings) setState((s) => (s.settings ? s : { ...s, settings }))
      })
      .catch(() => {})

    const es = new EventSource(`/api/overlay/${overlayId}/stream`)
    esRef.current = es

    es.addEventListener('open', () => {
      if (!cancelled) setState((s) => (s.connection === 'open' ? s : { ...s, connection: 'open' }))
    })
    es.addEventListener('settings', (e) => {
      if (cancelled) return
      try {
        setState((s) => ({ ...s, settings: JSON.parse((e as MessageEvent).data) }))
      } catch {}
    })
    es.addEventListener('nowplaying', (e) => {
      if (cancelled) return
      try {
        const np: NowPlaying = JSON.parse((e as MessageEvent).data)
        setState((s) => ({ ...s, playback: np, connection: 'open' }))
      } catch {}
    })
    es.addEventListener('needs_reauth', () => {
      if (!cancelled) setState((s) => ({ ...s, connection: 'needs_reauth' }))
    })

    return () => {
      cancelled = true
      es.close()
    }
  }, [overlayId])

  return state
}
