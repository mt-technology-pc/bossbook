import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  console.warn(
    'Missing Supabase env vars — set SUPABASE_URL and SUPABASE_ANON_KEY in .env',
  )
}

// A client dedicated to Auth API calls only (signInWithPassword,
// refreshSession, signOut) — kept separate from supabaseAdmin.js
// (service-role, bypasses RLS) and supabaseForUser.js (RLS-scoped to one
// already-authenticated request) since this one's whole job is minting
// or rotating the tokens those other two are built from, before any
// user/session context exists.
//
// Placeholder-when-unset + lazily constructed per call, same reasoning as
// supabaseForUser.js: createClient() throws synchronously on a falsy
// URL, and this is only ever called from inside request handlers.
export function supabaseAuth() {
  return createClient(
    supabaseUrl || 'https://missing-supabase-url.supabase.co',
    anonKey || 'missing-supabase-anon-key',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
