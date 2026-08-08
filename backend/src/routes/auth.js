import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { decodeJwt } from 'jose'
import { supabaseAuth } from '../lib/supabaseAuth.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { tryRefresh } from '../lib/refreshSession.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, setAuthCookies, clearAuthCookies } from '../lib/authCookies.js'

const router = Router()

// Stricter than the app-wide limiter (index.js) — this is the one
// unauthenticated route in the whole API, so it's the one actually worth
// rate-limiting against brute-forcing a password.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — please wait a few minutes and try again.' },
})

function publicUser(user) {
  return { id: user.id, email: user.email, user_metadata: user.user_metadata }
}

// The JWT was already verified (by requireAuth, or just minted by
// Supabase itself in this same request) — decoding (not re-verifying)
// its own `exp` claim is how the frontend knows when to proactively
// refresh, without this route needing to track expiry separately itself.
function expiresAtMs(accessToken) {
  return decodeJwt(accessToken).exp * 1000
}

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const { data, error } = await supabaseAuth().auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || 'Invalid email or password' })
    }

    setAuthCookies(res, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    })

    res.json({ user: publicUser(data.user), expiresAt: expiresAtMs(data.session.access_token) })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE]
    // Best-effort: revokes the refresh token server-side so it can't be
    // replayed after logout. If it's already gone (expired, or this is a
    // logout-after-logout double-click) that's fine — the cookies get
    // cleared below regardless.
    if (token) await supabaseAdmin.auth.admin.signOut(token).catch(() => {})
    clearAuthCookies(res)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// Used on app load to restore (or reject) a session from the httpOnly
// cookie — reuses requireAuth itself (including its own reactive-refresh
// fallback) rather than reimplementing verification here, so this route
// and every other authenticated route agree on exactly what counts as a
// valid session.
router.get('/session', requireAuth, (req, res) => {
  res.json({ user: req.user, expiresAt: expiresAtMs(req.accessToken) })
})

// The frontend's own proactive path (see AuthContext.jsx's expiry
// timer) — requireAuth.js's reactive fallback covers the case this
// doesn't get to first (a throttled background tab, a request that
// lands right as the token expires), but letting most refreshes happen
// here, ahead of time, keeps the common case invisible to the user.
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE]
    if (!refreshToken) return res.status(401).json({ error: 'No session to refresh' })

    const refreshed = await tryRefresh(refreshToken)
    if (!refreshed) {
      clearAuthCookies(res)
      return res.status(401).json({ error: 'Session expired' })
    }

    setAuthCookies(res, refreshed)
    res.json({ user: publicUser(refreshed.user), expiresAt: expiresAtMs(refreshed.accessToken) })
  } catch (err) {
    next(err)
  }
})

export default router
