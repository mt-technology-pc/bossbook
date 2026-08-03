import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Backed by my_permissions() (schema.sql migration 007) — a single RPC
// rather than N calls to has_page_permission. An owner, or a staff member
// on a full_access role, gets isFullAccess = true (canAccess is then always
// true regardless of pageKeys). Overview is always accessible once a
// company is resolved — there's no page-level lockout of the dashboard
// home a restricted user would otherwise land on with nowhere to go.
export function useMyPermissions() {
  const { user } = useAuth()
  const [isFullAccess, setIsFullAccess] = useState(false)
  const [pageKeys, setPageKeys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsFullAccess(false)
      setPageKeys([])
      setLoading(false)
      return
    }
    setLoading(true)
    supabase.rpc('my_permissions').then(({ data }) => {
      setIsFullAccess(!!data?.is_full_access)
      setPageKeys(data?.page_keys ?? [])
      setLoading(false)
    })
  }, [user])

  const canAccess = (pageKey) => {
    if (!pageKey || pageKey === 'overview') return true
    return isFullAccess || pageKeys.includes(pageKey)
  }

  return { isFullAccess, pageKeys, loading, canAccess }
}
