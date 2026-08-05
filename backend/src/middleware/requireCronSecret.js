// No user session exists here — Vercel Cron calls these endpoints
// directly, not on behalf of a logged-in user, so requireAuth (which
// verifies a Supabase JWT) doesn't apply. Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on its own scheduled calls when
// CRON_SECRET is set as an env var (see vercel.json's `crons` entries) —
// this just verifies that's really what's calling, not requiring a full
// auth system for a couple of service-to-service endpoints. Shared by
// every route under /api/cron.
export function requireCronSecret(req, res, next) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    console.warn('CRON_SECRET is not set — refusing all cron requests until it is configured.')
    return res.status(500).json({ error: 'Cron endpoint is not configured' })
  }
  const header = req.headers.authorization || ''
  if (header !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}
