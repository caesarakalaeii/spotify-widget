'use client'

import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Slider } from '@/components/ui/Slider'
import { Toggle } from '@/components/ui/Toggle'
import { Select } from '@/components/ui/Select'
import { ColorPicker } from '@/components/ui/ColorPicker'
import type { WidgetSettings } from '@/lib/settings/schema'

type Group = 'layout' | 'vinyl' | 'text' | 'colors' | 'progress' | 'behaviour' | 'attribution'
export type SettingsPatch = { [K in Group]?: Partial<WidgetSettings[K]> }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">{children}</CardBody>
    </Card>
  )
}

export function SettingsForm({
  settings: s,
  onPatch,
}: {
  settings: WidgetSettings
  onPatch: (p: SettingsPatch) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Section title="Layout">
        <Slider
          label="Size"
          min={120}
          max={900}
          value={s.layout.size}
          unit="px"
          onChange={(v) => onPatch({ layout: { size: v } })}
        />
        <Select
          label="Anchor"
          value={s.layout.anchor}
          onChange={(v) => onPatch({ layout: { anchor: v as WidgetSettings['layout']['anchor'] } })}
          options={enumOptions(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])}
        />
        <Select
          label="Arrangement"
          value={s.layout.orientation}
          onChange={(v) =>
            onPatch({ layout: { orientation: v as WidgetSettings['layout']['orientation'] } })
          }
          options={enumOptions(['disc-left', 'disc-right', 'disc-top', 'disc-only', 'text-only'])}
        />
        <Slider
          label="Edge padding"
          min={0}
          max={200}
          value={s.layout.padding}
          unit="px"
          onChange={(v) => onPatch({ layout: { padding: v } })}
        />
        <Slider
          label="Disc/text gap"
          min={0}
          max={80}
          value={s.layout.gap}
          unit="px"
          onChange={(v) => onPatch({ layout: { gap: v } })}
        />
      </Section>

      <Section title="Vinyl">
        <Slider
          label="Spin speed"
          min={10}
          max={100}
          value={s.vinyl.rpm}
          format={(v) => `${Math.round(v)} rpm`}
          onChange={(v) => onPatch({ vinyl: { rpm: v } })}
        />
        <Slider
          label="Groove intensity"
          min={0}
          max={1}
          step={0.05}
          value={s.vinyl.grooveIntensity}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onPatch({ vinyl: { grooveIntensity: v } })}
        />
        <Select
          label="Album art shape"
          value={s.vinyl.artShape}
          onChange={(v) => onPatch({ vinyl: { artShape: v as WidgetSettings['vinyl']['artShape'] } })}
          options={[
            { label: 'Vinyl label', value: 'disc-label' },
            { label: 'Full disc', value: 'disc-full' },
            { label: 'Square', value: 'square' },
          ]}
        />
        <Toggle
          label="Slow spin-down on pause"
          checked={s.vinyl.spinDown}
          onChange={(v) => onPatch({ vinyl: { spinDown: v } })}
        />
        <Toggle
          label="Show tonearm"
          checked={s.vinyl.tonearm}
          onChange={(v) => onPatch({ vinyl: { tonearm: v } })}
        />
        <Toggle
          label="Rotating sheen"
          checked={s.vinyl.sheen}
          onChange={(v) => onPatch({ vinyl: { sheen: v } })}
        />
      </Section>

      <Section title="Text">
        <Toggle
          label="Show title"
          checked={s.text.showTitle}
          onChange={(v) => onPatch({ text: { showTitle: v } })}
        />
        <Toggle
          label="Show artist"
          checked={s.text.showArtist}
          onChange={(v) => onPatch({ text: { showArtist: v } })}
        />
        <Toggle
          label="Show album"
          checked={s.text.showAlbum}
          onChange={(v) => onPatch({ text: { showAlbum: v } })}
        />
        <Select
          label="Font"
          value={s.text.font}
          onChange={(v) => onPatch({ text: { font: v as WidgetSettings['text']['font'] } })}
          options={[
            { label: 'Barlow', value: 'barlow' },
            { label: 'DM Mono', value: 'dm-mono' },
          ]}
        />
        <Slider
          label="Title size"
          min={10}
          max={64}
          value={s.text.titleSize}
          unit="px"
          onChange={(v) => onPatch({ text: { titleSize: v } })}
        />
        <Slider
          label="Artist size"
          min={8}
          max={48}
          value={s.text.artistSize}
          unit="px"
          onChange={(v) => onPatch({ text: { artistSize: v } })}
        />
        <Select
          label="Alignment"
          value={s.text.align}
          onChange={(v) => onPatch({ text: { align: v as WidgetSettings['text']['align'] } })}
          options={enumOptions(['left', 'center', 'right'])}
        />
        <Toggle
          label="Marquee long titles"
          checked={s.text.marquee}
          onChange={(v) => onPatch({ text: { marquee: v } })}
        />
      </Section>

      <Section title="Colours">
        <Select
          label="Background"
          value={s.colors.background}
          onChange={(v) =>
            onPatch({ colors: { background: v as WidgetSettings['colors']['background'] } })
          }
          options={[
            { label: 'Transparent', value: 'transparent' },
            { label: 'Solid', value: 'solid' },
          ]}
        />
        {s.colors.background === 'solid' && (
          <>
            <ColorPicker
              label="Background colour"
              value={s.colors.backgroundColor}
              onChange={(v) => onPatch({ colors: { backgroundColor: v } })}
            />
            <Slider
              label="Background opacity"
              min={0}
              max={1}
              step={0.05}
              value={s.colors.backgroundOpacity}
              format={(v) => v.toFixed(2)}
              onChange={(v) => onPatch({ colors: { backgroundOpacity: v } })}
            />
          </>
        )}
        <ColorPicker
          label="Accent"
          value={s.colors.accent}
          onChange={(v) => onPatch({ colors: { accent: v } })}
        />
        <ColorPicker
          label="Title colour"
          value={s.colors.titleColor}
          onChange={(v) => onPatch({ colors: { titleColor: v } })}
        />
        <ColorPicker
          label="Artist colour"
          value={s.colors.artistColor}
          onChange={(v) => onPatch({ colors: { artistColor: v } })}
        />
        <Toggle
          label="Accent glow"
          checked={s.colors.glow}
          onChange={(v) => onPatch({ colors: { glow: v } })}
        />
      </Section>

      <Section title="Progress">
        <Toggle
          label="Show progress bar"
          checked={s.progress.show}
          onChange={(v) => onPatch({ progress: { show: v } })}
        />
        <Toggle
          label="Show time"
          checked={s.progress.showTime}
          onChange={(v) => onPatch({ progress: { showTime: v } })}
        />
        <Slider
          label="Bar thickness"
          min={1}
          max={20}
          value={s.progress.thickness}
          unit="px"
          onChange={(v) => onPatch({ progress: { thickness: v } })}
        />
      </Section>

      <Section title="Behaviour">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-sub">Idle text</span>
          <input
            value={s.behaviour.idleText}
            maxLength={40}
            onChange={(e) => onPatch({ behaviour: { idleText: e.target.value } })}
            className="h-9 rounded-lg border border-border bg-surface-2 px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-spotify/60"
          />
        </label>
        <Slider
          label="Fade duration"
          min={0}
          max={3000}
          step={50}
          value={s.behaviour.fadeMs}
          format={(v) => `${v} ms`}
          onChange={(v) => onPatch({ behaviour: { fadeMs: v } })}
        />
      </Section>

      <Section title="Spotify attribution">
        <p className="text-xs text-text-dim">
          Required by Spotify&apos;s Developer Terms — you can move it, not remove it.
        </p>
        <Select
          label="Position"
          value={s.attribution.position}
          onChange={(v) =>
            onPatch({ attribution: { position: v as WidgetSettings['attribution']['position'] } })
          }
          options={enumOptions(['auto', 'top-left', 'top-right', 'bottom-left', 'bottom-right'])}
        />
        <Select
          label="Style"
          value={s.attribution.style}
          onChange={(v) =>
            onPatch({ attribution: { style: v as WidgetSettings['attribution']['style'] } })
          }
          options={[
            { label: 'Logo + text', value: 'logo-text' },
            { label: 'Logo only', value: 'logo' },
          ]}
        />
      </Section>
    </div>
  )
}

function enumOptions(values: string[]) {
  return values.map((v) => ({ label: v, value: v }))
}
