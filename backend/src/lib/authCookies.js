import { randomBytes } from 'node:crypto'

// Single source of truth for every auth cookie's name + attributes.
// Every place that sets or clears one of these MUST go through here — a
// Path/attribute mismatch between a set and a clear (e.g. clearing `bb_at`
// with the default Path `/` when it was actually set with some other
// path) makes the browser silently keep the old cookie around instead of
// actually clearing it.
export const ACCESS_TOKEN_COOKIE = 'bb_at'
export const REFRESH_TOKEN_COOKIE = 'bb_rt'
export const CSRF_COOKIE = 'bb_csrf'

const REFRESH_TOKEN_PATH = '/api/auth'
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

// Same-origin by design (see frontend/vercel.json's /db-api and /api
// rewrites, which make the browser see this backend as its own origin) —
// SameSite=Lax is enough and avoids every Secure+SameSite=None cross-site
// cookie headache (Safari ITP, Chrome partitioning). Secure is skipped
// only in local dev, where the app is served over plain http://localhost.
const isProd = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production'

function baseAttrs(maxAgeMs) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  }
}

// expiresIn: Supabase's own `expires_in` (seconds) for the access token —
// the access-token cookie's lifetime always matches the JWT's own, so an
// expired-but-still-present cookie is never mistaken for a valid session.
export function setAuthCookies(res, { accessToken, refreshToken, expiresIn }) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, baseAttrs(expiresIn * 1000))
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseAttrs(REFRESH_TOKEN_MAX_AGE_MS),
    path: REFRESH_TOKEN_PATH, // never sent to /db-proxy or other /api/* routes
  })
  setCsrfCookie(res, expiresIn)
}

// Deliberately JS-readable (not httpOnly) — the frontend has to read this
// value itself to echo it back as the X-CSRF-Token header. Being readable
// isn't a weakness here: the double-submit pattern only works *because*
// an attacker's cross-site page can't read it (no cross-origin cookie
// access) even though a legitimate same-origin script can.
export function setCsrfCookie(res, expiresInSeconds) {
  const token = randomBytes(32).toString('hex')
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: expiresInSeconds * 1000,
  })
  return token
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' })
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_TOKEN_PATH })
  res.clearCookie(CSRF_COOKIE, { path: '/' })
}
