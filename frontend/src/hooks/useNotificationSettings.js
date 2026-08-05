import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useNotificationSettings() {
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
    const { data } = await supabase.from('notification_settings').select('*').maybeSingle()
    setSettings(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async ({ companyId, ...rest }) => {
    const payload = { company_id: companyId, ...rest }
    const { error } = await supabase.from('notification_settings').upsert(payload, { onConflict: 'company_id' })
    if (error) return { error }
    await fetchSettings()
    return { error: null }
  }

  return { settings, loading, saveSettings, refetch: fetchSettings }
}
