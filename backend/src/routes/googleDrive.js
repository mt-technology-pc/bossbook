import { Router } from 'express'
import crypto from 'node:crypto'
import { google } from 'googleapis'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { googleOAuthClient } from '../lib/googleDrive.js'
import { getAppSecretOrNull, setAppSecret, deleteAppSecret } from '../lib/appSecrets.js'

const router = Router()

// Platform-admin only, EXCEPT /callback below — Google's redirect is a
// plain browser navigation with no Authorization header, so it can't pass
// requireAuth/requireAdmin and is gated by the one-time nonce instead.
const adminOnly = [requireAuth, requireAdmin]

// This is one app-wide connection (not per-company) — a platform admin
// connects it once in /admin, and it's used to upload every company's
// invoice PDFs. The nonce here is pure CSRF protection (confirms the
// callback corresponds to a connect-url call this app actually issued),
// not an identity carrier — there's no per-caller state to thread through
// anymore since the write below isn't scoped to whoever clicked connect.
const pendingConnections = new Map()
const NONCE_TTL_MS = 10 * 60 * 1000

function pruneExpiredNonces() {
  const now = Date.now()
  for (const [nonce, expiresAt] of pendingConnections) {
    if (expiresAt < now) pendingConnections.delete(nonce)
  }
}

router.get('/status', adminOnly, async (req, res, next) => {
  try {
    const connectedEmail = await getAppSecretOrNull('google_drive_connected_email')
    res.json({ connected: Boolean(connectedEmail), connectedEmail })
  } catch (err) {
    next(err)
  }
})

// Returns the consent URL as JSON rather than redirecting — a plain
// window.location.href navigation can't carry an Authorization header, so
// this step has to be a normal authenticated apiFetch call; the frontend
// then navigates directly to Google's own URL, not back through this route.
router.get('/connect-url', adminOnly, async (req, res, next) => {
  try {
    pruneExpiredNonces()
    const nonce = crypto.randomBytes(24).toString('hex')
    pendingConnections.set(nonce, Date.now() + NONCE_TTL_MS)

    const client = await googleOAuthClient()
    const url = client.generateAuthUrl({
      access_type: 'offline',
      // Always force the consent screen — Google only issues a
      // refresh_token on first consent (or when forced), so omitting this
      // would silently break a reconnect after access is revoked.
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state: nonce,
    })
    res.json({ url })
  } catch (err) {
    next(err)
  }
})

// No requireAuth/requireAdmin here — Google's redirect is a plain browser
// navigation with no Authorization header, can't pass either middleware.
// Safety comes entirely from the one-time nonce: only a request that
// began at /connect-url (already admin-gated) has a valid state value.
router.get('/callback', async (req, res) => {
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  const { code, state, error } = req.query

  if (error || !state || !pendingConnections.has(state)) {
    return res.redirect(`${clientOrigin}/admin?drive=error`)
  }
  pendingConnections.delete(state)

  try {
    const client = await googleOAuthClient()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    const { data: userinfo } = await google.oauth2({ version: 'v2', auth: client }).userinfo.get()

    await setAppSecret('google_drive_refresh_token', tokens.refresh_token)
    await setAppSecret('google_drive_connected_email', userinfo.email)

    res.redirect(`${clientOrigin}/admin?drive=connected`)
  } catch (err) {
    console.error('Google Drive OAuth callback failed:', err)
    res.redirect(`${clientOrigin}/admin?drive=error`)
  }
})

router.post('/disconnect', adminOnly, async (req, res, next) => {
  try {
    const refreshToken = await getAppSecretOrNull('google_drive_refresh_token')

    if (refreshToken) {
      // Best-effort — the secrets get deleted below regardless, so a
      // revoke failure shouldn't block disconnecting.
      try {
        const client = await googleOAuthClient()
        await client.revokeToken(refreshToken)
      } catch (err) {
        console.warn('Could not revoke Google token (continuing to disconnect anyway):', err.message)
      }
    }

    await deleteAppSecret('google_drive_refresh_token')
    await deleteAppSecret('google_drive_connected_email')
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
