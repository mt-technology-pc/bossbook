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
  // passed a non-empty one — leaving it out of the payload keeps
  // whatever's already stored untouched.
  const saveSettings = async ({ companyId, password, ...rest }) => {
    const payload = { company_id: companyId, ...rest, ...(password ? { password } : {}) }
    const { error } = await supabase.from('smtp_settings').upsert(payload, { onConflict: 'company_id' })
    if (error) return { error }
    await fetchSettings()
    return { error: null }
  }

  return { settings, loading, saveSettings, refetch: fetchSettings }
}
