import { supabaseForUser } from '../lib/supabaseForUser.js'

// Applied after requireAuth. Checks is_team_manager() (schema.sql) using the
// caller's own JWT — true for an owner, or a staff member whose assigned
// role has full_access. Gates mutating Team routes (add/remove a user,
// create/edit/delete a role); the read-only GET routes only need requireAuth
// since any company member can see the team list and role names.
export async function requireTeamManager(req, res, next) {
  const supabase = supabaseForUser(req.accessToken)
  const { data, error } = await supabase.rpc('is_team_manager')

  if (error) {
    return res.status(500).json({ error: 'Could not verify team management access' })
  }
  if (!data) {
    return res.status(403).json({ error: 'You don\'t have permission to manage the team' })
  }

  next()
}
