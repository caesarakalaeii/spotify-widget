'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function OverlayUrlCard({ overlayUrl, size }: { overlayUrl: string; size: number }) {
  const [copied, setCopied] = useState(false)
  const recommendedW = Math.round(size * 2.2)
  const recommendedH = Math.round(size * 1.5)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — user can select the field manually
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>OBS Browser Source</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            readOnly
            value={overlayUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-2.5 font-mono text-xs text-text outline-none"
          />
          <Button onClick={copy} size="sm">
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <p className="text-xs text-text-sub">
          In OBS: <span className="text-text">Add → Browser</span>, paste this URL, set{' '}
          <span className="font-mono text-text">
            {recommendedW}×{recommendedH}
          </span>
          , and tick <span className="text-text">&ldquo;Shutdown source when not visible&rdquo;</span>
          . The background is transparent.
        </p>
      </CardBody>
    </Card>
  )
}
