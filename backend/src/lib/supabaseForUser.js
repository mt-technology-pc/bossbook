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
//
// Placeholders when unset (rather than leaving these undefined) are
// deliberate, same reasoning as supabaseAdmin.js: createClient() throws
// synchronously if supabaseUrl is falsy — since this is called inside
// request handlers (not at module scope), that would 500 every
// authenticated request with an unhandled-looking error instead of the
// clean, obviously-a-config-problem failure a real request against a fake
// host produces.
export function supabaseForUser(accessToken) {
  return createClient(
    supabaseUrl || 'https://missing-supabase-url.supabase.co',
    anonKey || 'missing-supabase-anon-key',
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  )
}
