import { supabaseAuth } from './supabaseAuth.js'

// Wraps Supabase's own refresh-token grant. Shared by POST /api/auth/refresh
// (the proactive path, called by the frontend's own expiry timer) and
// requireAuth.js's reactive fallback (the safety net for an access token
// that expired before the proactive timer got to it) — one implementation,
// so both paths behave identically instead of drifting apart.
//
// Returns null on any failure (expired/reused/invalid refresh token)
// rather than throwing — every caller treats "couldn't refresh" as "the
// session is over", not as a 500.
export async function tryRefresh(refreshToken) {
  if (!refreshToken) return null

  const { data, error } = await supabaseAuth().auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.session) return null

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    user: data.session.user,
  }
}
