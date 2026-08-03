import { createRemoteJWKSet, jwtVerify } from 'jose'

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

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    })

    req.user = {
      id: payload.sub,
      email: payload.email,
      user_metadata: payload.user_metadata,
    }
    req.accessToken = token
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
