import { z } from 'zod'

/**
 * Widget configuration. This schema is the single source of truth: the settings
 * API validates writes against it, the overlay reads it, and the dashboard binds
 * controls to it. Partial input is merged over defaults so old rows and partial
 * PATCHes forward-migrate safely.
 */
const hex = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'must be a hex color')

export const SettingsSchema = z
  .object({
    layout: z
      .object({
        size: z.number().min(120).max(900).default(280), // disc px → --disc-size
        anchor: z
          .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
          .default('bottom-left'),
        padding: z.number().min(0).max(200).default(24),
        orientation: z
          .enum(['disc-left', 'disc-right', 'disc-top', 'disc-only', 'text-only'])
          .default('disc-left'),
        gap: z.number().min(0).max(80).default(16),
      })
      .default({}),
    vinyl: z
      .object({
        rpm: z.number().min(1).max(120).default(33.333),
        spinDown: z.boolean().default(true),
        tonearm: z.boolean().default(true),
        grooveIntensity: z.number().min(0).max(1).default(0.6), // → --groove-alpha
        artShape: z.enum(['disc-label', 'disc-full', 'square']).default('disc-label'),
        sheen: z.boolean().default(true),
      })
      .default({}),
    text: z
      .object({
        showTitle: z.boolean().default(true),
        showArtist: z.boolean().default(true),
        showAlbum: z.boolean().default(false),
        font: z.enum(['barlow', 'dm-mono']).default('barlow'),
        titleSize: z.number().min(10).max(64).default(22),
        artistSize: z.number().min(8).max(48).default(16),
        marquee: z.boolean().default(true),
        marqueeThreshold: z.number().min(8).max(120).default(28), // chars before scrolling
        align: z.enum(['left', 'center', 'right']).default('left'),
      })
      .default({}),
    colors: z
      .object({
        background: z.enum(['transparent', 'solid']).default('transparent'),
        backgroundColor: hex.default('#07070a'),
        backgroundOpacity: z.number().min(0).max(1).default(0.6),
        accent: hex.default('#1db954'),
        titleColor: hex.default('#e8e8ee'),
        artistColor: hex.default('#a0a0b0'),
        glow: z.boolean().default(true),
      })
      .default({}),
    progress: z
      .object({
        show: z.boolean().default(true),
        showTime: z.boolean().default(true),
        thickness: z.number().min(1).max(20).default(4),
      })
      .default({}),
    behaviour: z
      .object({
        idleText: z.string().max(40).default('Not playing'),
        fadeMs: z.number().min(0).max(3000).default(400),
        pollMs: z.number().min(1000).max(30000).default(5000),
      })
      .default({}),
    attribution: z
      .object({
        // Attribution is required by the Spotify Developer Terms — there is no
        // "off" option, only where and how it appears.
        position: z
          .enum(['auto', 'top-left', 'top-right', 'bottom-left', 'bottom-right'])
          .default('auto'),
        style: z.enum(['logo', 'logo-text']).default('logo-text'),
      })
      .default({}),
    schemaVersion: z.literal(1).default(1),
  })
  .strip()

export type WidgetSettings = z.infer<typeof SettingsSchema>

export const DEFAULT_SETTINGS: WidgetSettings = SettingsSchema.parse({})

/** Validate arbitrary input, filling defaults for any missing fields. */
export function parseSettings(raw: unknown): WidgetSettings {
  return SettingsSchema.parse(raw ?? {})
}
