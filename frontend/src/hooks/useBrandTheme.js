import { useEffect } from 'react'
import { deriveShades } from '../lib/brandColor'

const SHADE_KEYS = ['400', '500', '600', '700']

// Overrides the app's --color-clay-* CSS custom properties on <html> with
// shades derived from the company's chosen brand color. Tailwind v4 compiles
// every clay-* utility class to var(--color-clay-*), so this inline
// override (which beats the stylesheet's :root rule in the cascade) recolors
// the whole app live, no rebuild needed. Call once, from DashboardLayout —
// never from pre-auth/marketing pages, which have no company context.
export function useBrandTheme(brandColor) {
  useEffect(() => {
    const root = document.documentElement
    if (!brandColor) {
      SHADE_KEYS.forEach((k) => root.style.removeProperty(`--color-clay-${k}`))
      return
    }
    const shades = deriveShades(brandColor)
    SHADE_KEYS.forEach((k) => root.style.setProperty(`--color-clay-${k}`, shades[k]))
    return () => SHADE_KEYS.forEach((k) => root.style.removeProperty(`--color-clay-${k}`))
  }, [brandColor])
}

// Explicit reset, for call sites like sign-out that want to guarantee no
// stale color survives even a single frame before the next user's data
// loads (belt-and-suspenders alongside the effect cleanup above).
export function resetBrandTheme() {
  const root = document.documentElement
  SHADE_KEYS.forEach((k) => root.style.removeProperty(`--color-clay-${k}`))
}
