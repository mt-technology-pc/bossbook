import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// api_key is intentionally never selected here — it should only ever be
// read by the backend (via the caller's own RLS-scoped session) at the
// moment an SMS is actually sent, never by the browser. Same discipline
// as useSmtpSettings.js's password column.
const COLUMNS = 'company_id, sender_id, notify_phone, updated_at'

export function useSmsSettings() {
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
    const { data } = await supabase.from('sms_settings').select(COLUMNS).maybeSingle()
    setSettings(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // `api_key` is only included in the write when the caller actually
  // passed a non-empty one — leaving it out of the payload keeps
  // whatever's already stored untouched.
  const saveSettings = async ({ companyId, apiKey, ...rest }) => {
    const payload = { company_id: companyId, ...rest, ...(apiKey ? { api_key: apiKey } : {}) }
    const { error } = await supabase.from('sms_settings').upsert(payload, { onConflict: 'company_id' })
    if (error) return { error }
    await fetchSettings()
    return { error: null }
  }

  return { settings, loading, saveSettings, refetch: fetchSettings }
}
