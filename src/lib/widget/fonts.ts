/**
 * Widget font registry. Pure data (no next/font imports) so it can be shared by
 * the settings schema, the dashboard controls, and the widget renderer. The
 * matching next/font/google faces + CSS variables are wired in src/app/layout.tsx.
 */
export interface FontDef {
  label: string
  cssVar: string
}

export const FONTS = {
  barlow: { label: 'Barlow', cssVar: 'var(--font-barlow)' },
  inter: { label: 'Inter', cssVar: 'var(--font-inter)' },
  montserrat: { label: 'Montserrat', cssVar: 'var(--font-montserrat)' },
  poppins: { label: 'Poppins', cssVar: 'var(--font-poppins)' },
  'space-grotesk': { label: 'Space Grotesk', cssVar: 'var(--font-space-grotesk)' },
  oswald: { label: 'Oswald', cssVar: 'var(--font-oswald)' },
  rajdhani: { label: 'Rajdhani', cssVar: 'var(--font-rajdhani)' },
  'bebas-neue': { label: 'Bebas Neue', cssVar: 'var(--font-bebas-neue)' },
  anton: { label: 'Anton', cssVar: 'var(--font-anton)' },
  'archivo-black': { label: 'Archivo Black', cssVar: 'var(--font-archivo-black)' },
  'dm-mono': { label: 'DM Mono', cssVar: 'var(--font-dm-mono)' },
  'roboto-mono': { label: 'Roboto Mono', cssVar: 'var(--font-roboto-mono)' },
} as const satisfies Record<string, FontDef>

export type FontKey = keyof typeof FONTS
export const FONT_KEYS = Object.keys(FONTS) as [FontKey, ...FontKey[]]

/** Resolve a font key to a CSS font-family value (falls back to Barlow). */
export function fontFamily(key: string): string {
  return (FONTS as Record<string, FontDef>)[key]?.cssVar ?? FONTS.barlow.cssVar
}
