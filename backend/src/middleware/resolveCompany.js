import { supabaseForUser } from '../lib/supabaseForUser.js'

// Convenience/defense-in-depth only — the actual tenant-isolation
// enforcement is RLS + the security-definer RPC checks in schema.sql,
// which apply automatically to every query regardless of this middleware.
// This just attaches req.companyId for routes that want to log or filter
// by it explicitly (e.g. the backup route's table dump). Apply after
// requireAuth, only on routes that need it — not a global gate.
export async function resolveCompany(req, res, next) {
  const supabase = supabaseForUser(req.accessToken)
  const { data, error } = await supabase.rpc('current_company_id')

  if (error) {
    return res.status(500).json({ error: 'Could not resolve company' })
  }
  if (!data) {
    return res.status(403).json({ error: 'No company associated with this account' })
  }

  req.companyId = data
  next()
}
