import { describe, it, expect } from 'vitest'
import { generateVerifier, challengeFromVerifier, generateState } from './pkce'

describe('pkce', () => {
  it('computes the RFC 7636 challenge for the reference verifier', () => {
    // Appendix B of RFC 7636.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    expect(challengeFromVerifier(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('generates verifiers within the 43–128 char unreserved range', () => {
    for (let i = 0; i < 20; i++) {
      const v = generateVerifier()
      expect(v.length).toBeGreaterThanOrEqual(43)
      expect(v.length).toBeLessThanOrEqual(128)
      expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/)
    }
  })

  it('generates unique url-safe state values', () => {
    const a = generateState()
    const b = generateState()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9\-_]+$/)
  })
})
