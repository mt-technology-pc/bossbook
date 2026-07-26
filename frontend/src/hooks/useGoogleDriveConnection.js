import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

// This is one app-wide connection (not per-company), so there's no table
// for it any RLS-scoped session could read directly — it lives in
// Supabase Vault, only ever readable by the backend's service-role
// client. The status is fetched via an admin-gated endpoint instead.
export function useGoogleDriveConnection() {
  const { user } = useAuth()
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setConnection(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { connected, connectedEmail } = await apiFetch('/api/google-drive/status')
      setConnection(connected ? { connectedEmail } : null)
    } catch {
      setConnection(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchConnection()
  }, [fetchConnection])

  // Fetches the consent URL via a normal authenticated call, then
  // navigates there directly — a window.location.href straight to our own
  // backend route couldn't carry the Authorization header a plain
  // top-level navigation drops.
  const connect = async () => {
    const { url } = await apiFetch('/api/google-drive/connect-url')
    window.location.href = url
  }

  const disconnect = async () => {
    await apiFetch('/api/google-drive/disconnect', { method: 'POST' })
    await fetchConnection()
  }

  return { connection, loading, connect, disconnect, refetch: fetchConnection }
}
