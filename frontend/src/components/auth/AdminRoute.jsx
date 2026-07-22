import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

// Mirrors ProtectedRoute's shape, but checks is_platform_admin() instead of
// just "is logged in" — a regular business owner authenticates fine here
// (same auth.users pool) but fails this check and gets bounced, same as
// ProtectedRoute bounces a logged-out visitor.
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      setChecking(false)
      return
    }
    supabase.rpc('is_platform_admin').then(({ data }) => {
      setIsAdmin(Boolean(data))
      setChecking(false)
    })
  }, [user, loading])

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }

  return children
}
