export function isValidHex(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: l * 100 }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break
    case g: h = (b - r) / d + 2; break
    default: h = (r - g) / d + 4
  }
  return { h: h * 60, s: s * 100, l: l * 100 }
}

function hueToRgb(p, q, t) {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}

export function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360 / 360
  const ss = Math.min(100, Math.max(0, s)) / 100
  const ll = Math.min(100, Math.max(0, l)) / 100

  if (ss === 0) {
    const v = Math.round(ll * 255)
    return `#${[v, v, v].map((c) => c.toString(16).padStart(2, '0')).join('')}`
  }

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
  const p = 2 * ll - q
  const r = hueToRgb(p, q, hh + 1 / 3)
  const g = hueToRgb(p, q, hh)
  const b = hueToRgb(p, q, hh - 1 / 3)

  return `#${[r, g, b]
    .map((c) => Math.round(c * 255).toString(16).padStart(2, '0'))
    .join('')}`
}

// Derives the 4 shades the app's accent system needs (--color-clay-400/500/
// 600/700) from a single owner-picked hex, calibrated against the existing
// default palette's actual HSL relationships (#3d6fc7/#0047ab/#003d91/
// #002f73) so a custom color "feels" consistent with the built-in one: 500
// is the input as-is, 600/700 darken it, 400 is a softened, lighter tint.
export function deriveShades(hex) {
  const { h, s, l } = hexToHsl(hex)
  const clamp = (v) => Math.min(94, Math.max(6, v))
  return {
    400: hslToHex(h, s * 0.55, clamp(l + 20)),
    500: hex,
    600: hslToHex(h, s, clamp(l - 8)),
    700: hslToHex(h, s, clamp(l - 16)),
  }
}

function srgbToLinear(c) {
  const cs = c / 255
  return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

// Standard WCAG contrast ratio (1–21) between two colors.
export function getContrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}
