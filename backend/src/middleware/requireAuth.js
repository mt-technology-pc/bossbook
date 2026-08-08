import { createRemoteJWKSet, jwtVerify } from 'jose'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, setAuthCookies } from '../lib/authCookies.js'
import { tryRefresh } from '../lib/refreshSession.js'

if (!process.env.SUPABASE_URL) {
  console.warn('Missing SUPABASE_URL in .env — every authenticated request will fail until it is set.')
}

// A placeholder when unset (rather than leaving this undefined) is
// deliberate: `new URL(...)` throws synchronously if given "undefined/...",
// which would crash the whole server on import — every route, not just
// auth-gated ones, this file is imported almost everywhere. Requests still
// fail cleanly (401, since JWKS lookup against a fake host errors inside
// the try/catch below) if the env var is ever actually missing at runtime.
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL || 'https://missing-supabase-url.supabase.co'}/auth/v1/.well-known/jwks.json`),
)

async function verify(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${process.env.SUPABASE_URL}/auth/v1`,
  })
  return {
    id: payload.sub,
    email: payload.email,
    user_metadata: payload.user_metadata,
  }
}

// Cookie first (the httpOnly bb_at set by /api/auth/login|refresh — see
// authCookies.js), falling back to the old Authorization header. The
// header path is a deliberate, temporary rollout safety net: it makes
// this a strict superset of the pre-cookie behavior, so shipping this
// change is a no-op for any client that hasn't switched over yet. Drop
// the header branch in a later, separate cleanup commit once the
// frontend cutover has soaked in production.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? ''
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE] || null
  const token = cookieToken || headerToken

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }

  try {
    req.user = await verify(token)
    req.accessToken = token
    return next()
  } catch {
    // Only the cookie-based flow has a refresh token to fall back to — a
    // header-only caller (old client, or a direct API consumer) has
    // nothing here to retry with, same as before this change.
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE]
    if (!refreshToken) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const refreshed = await tryRefresh(refreshToken)
    if (!refreshed) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    try {
      req.user = await verify(refreshed.accessToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    req.accessToken = refreshed.accessToken
    setAuthCookies(res, refreshed)
    return next()
  }
}
