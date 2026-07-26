import { supabaseAdmin } from './supabaseAdmin.js'

// App-level secrets (shared across the whole app, not per-company) live in
// Supabase Vault rather than backend/.env — encrypted at rest, only
// readable/writable via the get/set/delete_app_secret() RPCs, granted only
// to service_role. Cached in memory since these rarely change and every
// OAuth/SMS round trip would otherwise cost an extra DB call — set/delete
// keep the cache in sync so a reconnect is reflected immediately within
// this same running process.
const cache = new Map()

// Throws if missing — use for secrets that must always be set once the
// app is configured at all (e.g. the Google OAuth client id/secret).
export async function getAppSecret(name) {
  const value = await getAppSecretOrNull(name)
  if (!value) throw new Error(`Secret "${name}" isn't set in Vault yet — see schema.sql for the set_app_secret() call to run.`)
  return value
}

// Returns null instead of throwing — use where "not configured yet" is an
// expected, user-facing state (e.g. text.lk credentials before a platform
// admin has set them up) rather than a hard failure.
export async function getAppSecretOrNull(name) {
  if (cache.has(name)) return cache.get(name)

  const { data, error } = await supabaseAdmin.rpc('get_app_secret', { secret_name: name })
  if (error) throw new Error(`Could not read secret "${name}" from Vault: ${error.message}`)

  if (data) cache.set(name, data)
  return data || null
}

export async function setAppSecret(name, value) {
  const { error } = await supabaseAdmin.rpc('set_app_secret', { secret_name: name, secret_value: value })
  if (error) throw new Error(`Could not save secret "${name}" to Vault: ${error.message}`)
  cache.set(name, value)
}

export async function deleteAppSecret(name) {
  const { error } = await supabaseAdmin.rpc('delete_app_secret', { secret_name: name })
  if (error) throw new Error(`Could not delete secret "${name}" from Vault: ${error.message}`)
  cache.delete(name)
}
