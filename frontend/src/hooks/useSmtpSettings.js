import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// The password column is intentionally never selected here — it should
// only ever be read by the backend (via the caller's own RLS-scoped
// session) at the moment an email is actually sent, never by the browser.
const COLUMNS = 'company_id, host, port, username, from_email, from_name, updated_at'

export function useSmtpSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('smtp_settings').select(COLUMNS).maybeSingle()
    setSettings(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // `password` is only included in the write when the caller actually
  // passed a non-empty one — leaving it out of the payload is meant to
  // keep whatever's already stored untouched. That only actually works
  // with a plain update() though: upsert()'s ON CONFLICT DO UPDATE sets
  // every column to EXCLUDED.<col>, and a column missing from the payload
  // means EXCLUDED.<col> is NULL — so upserting a partial payload onto an
  // existing row was nulling password out (a NOT NULL column) instead of
  // preserving it (confirmed live via the identical bug in
  // useSmsSettings.js's api_key column). update() only ever touches
  // columns actually present in its payload, which is what "leave blank
  // to keep current" actually requires — insert() only when the row is new.
  const saveSettings = async ({ companyId, password, ...rest }) => {
    const payload = { ...rest, ...(password ? { password } : {}) }
    const { error } = settings
      ? await supabase.from('smtp_settings').update(payload).eq('company_id', companyId)
      : await supabase.from('smtp_settings').insert({ company_id: companyId, ...payload })
    if (error) return { error }
    await fetchSettings()
    return { error: null }
  }

  return { settings, loading, saveSettings, refetch: fetchSettings }
}
