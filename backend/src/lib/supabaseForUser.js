import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  console.warn(
    'Missing Supabase env vars — set SUPABASE_URL and SUPABASE_ANON_KEY in .env',
  )
}

// A client scoped to the calling user's own JWT, so every query and RPC
// call goes through the same row-level-security policies the frontend is
// bound by — the assistant can never see or touch another user's data,
// unlike supabaseAdmin which uses the service role and bypasses RLS.
export function supabaseForUser(accessToken) {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
