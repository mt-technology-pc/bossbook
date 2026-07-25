import { supabaseForUser } from '../lib/supabaseForUser.js'

// Applied after requireAuth. Checks is_platform_admin() (schema.sql) using
// the caller's own JWT — a regular business owner authenticates fine via
// requireAuth but has no platform_admins row, so this 403s them before any
// admin route's supabaseAdmin (service-role, RLS-bypassing) queries run.
export async function requireAdmin(req, res, next) {
  const supabase = supabaseForUser(req.accessToken)
  const { data, error } = await supabase.rpc('is_platform_admin')

  if (error) {
    return res.status(500).json({ error: 'Could not verify admin status' })
  }
  if (!data) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  next()
}
