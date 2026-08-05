import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// RLS-scoped to the caller's own company (see supabase/migrations/
// 008_notifications.sql) — no explicit company filter needed, matching
// every other direct-Supabase hook in this app. Only the cron job (service
// role) ever creates rows; this hook only ever reads and marks-read.
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) setError(fetchError.message)
    else {
      setNotifications(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    const { error: updateError } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (updateError) await fetchNotifications()
    return { error: updateError }
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return { error: null }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    const { error: updateError } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    if (updateError) await fetchNotifications()
    return { error: updateError }
  }

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  return { notifications, unreadCount, loading, error, markRead, markAllRead, refetch: fetchNotifications }
}
