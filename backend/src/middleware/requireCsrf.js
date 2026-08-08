import { CSRF_COOKIE } from '../lib/authCookies.js'

// Defense in depth on top of SameSite=Lax (which already stops the cookie
// from riding along on a cross-site request in the first place, since
// this app is same-origin by design — see frontend/vercel.json's /db-api
// and /api rewrites). Double-submit pattern: the csrf cookie is JS-
// readable (see authCookies.js), so only a script actually running on
// this app's own origin can read it and echo it back as a header — a
// forged cross-site request has no way to know the value to send.
//
// GET/HEAD/OPTIONS are exempt (never mutate, nothing to protect), as is
// anything under /api/auth (login has no session/csrf cookie yet to
// check against; refresh/logout don't mutate tenant data).
export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.path.startsWith('/api/auth')) return next()

  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.headers['x-csrf-token']

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Missing or invalid CSRF token' })
  }

  next()
}
