import { createClient } from '@supabase/supabase-js'

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// In production, every request is proxied through this site's own domain
// (see vercel.json's /db-api rewrite) instead of calling
// <project>.supabase.co directly, so the Supabase domain never appears in
// network requests. This is cosmetic only, not a security boundary — the
// anon key still travels in every request header and is still visible in
// DevTools either way. Row Level Security (see supabase/schema.sql) is
// what actually protects the data regardless of which domain the request
// is made to. In dev there's no Vercel rewrite engine running (`vite dev`
// is a plain local server), so this talks to Supabase directly instead.
const supabaseUrl = import.meta.env.PROD
  ? `${window.location.origin}/db-api`
  : import.meta.env.VITE_SUPABASE_URL

if (!supabaseAnonKey || (!import.meta.env.PROD && !import.meta.env.VITE_SUPABASE_URL)) {
  console.warn(
    'Missing Supabase env vars — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
