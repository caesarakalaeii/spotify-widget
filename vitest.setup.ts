import '@testing-library/jest-dom/vitest'

// jsdom does not implement matchMedia; the widget queries prefers-reduced-motion.
// Guarded for the node environment (used by cookie/crypto tests), where there is no window.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
