import { describe, it, expect } from 'vitest'
import { SettingsSchema, DEFAULT_SETTINGS, parseSettings } from './schema'

describe('SettingsSchema', () => {
  it('parses an empty object into the full defaults', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
  })

  it('merges a partial patch over defaults', () => {
    const s = parseSettings({ vinyl: { rpm: 45 } })
    expect(s.vinyl.rpm).toBe(45)
    // Sibling vinyl fields keep their defaults.
    expect(s.vinyl.tonearm).toBe(DEFAULT_SETTINGS.vinyl.tonearm)
    // Untouched groups keep their defaults.
    expect(s.layout).toEqual(DEFAULT_SETTINGS.layout)
  })

  it('rejects out-of-range and malformed values', () => {
    expect(() => SettingsSchema.parse({ vinyl: { rpm: 0 } })).toThrow()
    expect(() => SettingsSchema.parse({ vinyl: { rpm: 999 } })).toThrow()
    expect(() => SettingsSchema.parse({ colors: { accent: 'not-a-hex' } })).toThrow()
    expect(() => SettingsSchema.parse({ colors: { backgroundOpacity: 2 } })).toThrow()
  })

  it('strips unknown keys and pins schemaVersion', () => {
    const s = parseSettings({ hackerField: true, vinyl: { rpm: 33 } }) as Record<string, unknown>
    expect(s.hackerField).toBeUndefined()
    expect(s.schemaVersion).toBe(1)
  })

  it('does not allow attribution to be turned off (Spotify Terms)', () => {
    // style enum has no "none"; an invalid value is rejected.
    expect(() => SettingsSchema.parse({ attribution: { style: 'none' } })).toThrow()
  })
})
