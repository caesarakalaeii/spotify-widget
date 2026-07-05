'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SettingsForm, type SettingsPatch } from '@/components/dashboard/SettingsForm'
import { LivePreview } from '@/components/dashboard/LivePreview'
import { OverlayUrlCard } from '@/components/dashboard/OverlayUrlCard'
import { Button } from '@/components/ui/Button'
import { DEFAULT_SETTINGS, parseSettings, type WidgetSettings } from '@/lib/settings/schema'

interface Me {
  displayName: string | null
  overlayId: string
  overlayUrl: string
  needsReauth: boolean
}

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/settings').then((r) => (r.ok ? r.json() : null)),
    ]).then(([meRes, settingsRes]) => {
      if (meRes) setMe(meRes)
      if (settingsRes) setSettings(parseSettings(settingsRes))
    })
  }, [])

  const save = useCallback((next: WidgetSettings) => {
    setStatus('saving')
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
      .then((r) => setStatus(r.ok ? 'saved' : 'idle'))
      .catch(() => setStatus('idle'))
  }, [])

  const patch = useCallback(
    (p: SettingsPatch) => {
      setSettings((prev) => {
        const next = mergeSettings(prev, p)
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => save(next), 600)
        return next
      })
    },
    [save],
  )

  const saveNow = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    save(settings)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💿</span>
          <div>
            <h1 className="text-lg font-semibold">Spotify Vinyl Widget</h1>
            {me?.displayName && (
              <p className="text-xs text-text-sub">Connected as {me.displayName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-dim">
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : ''}
          </span>
          <Button variant="subtle" size="sm" onClick={saveNow}>
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </header>

      {me?.needsReauth && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border-md bg-surface p-3 text-sm">
          <span>Spotify disconnected — reconnect to keep the widget live.</span>
          <a href="/api/auth/login">
            <Button size="sm">Reconnect Spotify</Button>
          </a>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,380px)_1fr]">
        <div className="order-2 md:order-1">
          <SettingsForm settings={settings} onPatch={patch} />
        </div>
        <div className="order-1 flex flex-col gap-4 md:order-2 md:sticky md:top-6 md:self-start">
          <LivePreview settings={settings} />
          {me && <OverlayUrlCard overlayUrl={me.overlayUrl} size={settings.layout.size} />}
        </div>
      </div>
    </div>
  )
}

/** Shallow-per-group merge of a settings patch (settings are exactly two levels deep). */
function mergeSettings(base: WidgetSettings, p: SettingsPatch): WidgetSettings {
  const merged = { ...base } as unknown as Record<string, Record<string, unknown>>
  const patchRecord = p as unknown as Record<string, Record<string, unknown>>
  for (const key of Object.keys(patchRecord)) {
    merged[key] = { ...(merged[key] ?? {}), ...patchRecord[key] }
  }
  return merged as unknown as WidgetSettings
}
