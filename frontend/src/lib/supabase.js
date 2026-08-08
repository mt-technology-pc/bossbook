import { createClient } from '@supabase/supabase-js'
import { csrfHeader } from './csrf'

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Every request is proxied through this site's own origin — in prod via
// vercel.json's /db-api rewrite (→ the backend's DB proxy, which itself
// forwards to real Supabase), in dev via vite.config.js's matching
// server.proxy entry (→ the local backend directly). The browser never
// talks to Supabase directly in either case. This IS the security
// boundary now, not cosmetic: the session lives in an httpOnly cookie
// the backend attaches server-side (see backend/src/routes/dbProxy.js),
// never in anything this client can read — persistSession/
// autoRefreshToken are off below because there is no client-side session
// for supabase-js to hold. Row Level Security (supabase/schema.sql) is
// still what actually scopes the data either way.
const supabaseUrl = `${window.location.origin}/db-api`

if (!supabaseAnonKey) {
  console.warn('Missing Supabase env var — set VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  // supabase-js always attaches an Authorization header itself (falling
  // back to the anon key, since persistSession:false means it never has
  // a real session token to use) — that value is inert noise the DB
  // proxy ignores and overwrites server-side with the real one read from
  // the httpOnly cookie. This wrapper's job is the two things a request
  // built by a library that never asked for either needs added: the
  // cookie itself (fetch doesn't send credentials by default), and the
  // CSRF header on anything non-GET — PostgREST's own `.rpc()` calls are
  // POST even for read-only functions, so this has to cover every
  // mutating verb, not just the obviously-a-write ones.
  global: {
    fetch: (input, init) => {
      const method = (init?.method || 'GET').toUpperCase()
      // init.headers arrives as a Headers instance here (supabase-js's
      // own fetchWithAuth builds it that way) — {...init.headers} would
      // silently spread to {} and drop the apikey/Authorization it just
      // set, since Headers doesn't expose its entries as own-enumerable
      // properties. new Headers(init?.headers) normalizes any shape
      // (plain object, array of pairs, or already a Headers instance)
      // into one we can safely .set() more values onto.
      const headers = new Headers(init?.headers)
      if (method !== 'GET' && method !== 'HEAD') {
        for (const [key, value] of Object.entries(csrfHeader())) headers.set(key, value)
      }
      return fetch(input, { ...init, credentials: 'include', headers })
    },
  },
})
