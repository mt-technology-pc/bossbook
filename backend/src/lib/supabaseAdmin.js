import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    'Missing Supabase env vars — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env',
  )
}

// Placeholders when unset (rather than leaving these undefined) are
// deliberate: createClient() throws synchronously if supabaseUrl is falsy,
// which would crash the whole server on import — every unrelated route,
// not just the ones touching Supabase — the moment these env vars are
// missing. Calls still fail cleanly once actually used unset.
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://missing-supabase-url.supabase.co',
  serviceRoleKey || 'missing-supabase-service-role-key',
  { auth: { autoRefreshToken: false, persistSession: false } },
)
