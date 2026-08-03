import { Navigate } from 'react-router-dom'
import { useMyPermissions } from '../../hooks/useMyPermissions'

// Sits inside ProtectedRoute (which already handles auth/paused-company
// loading), gating a single route on my_permissions() (schema.sql). Not a
// real security boundary by itself — the underlying data is only ever
// protected by tenant-isolation RLS, not per-page RLS (see the Team plan)
// — this is the same "hide it, don't rely on hiding it" trust model
// Settings.jsx's isOwner checks already use for owner-only fields.
export default function RequirePagePermission({ pageKey, children }) {
  const { loading, canAccess } = useMyPermissions()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
      </div>
    )
  }

  if (!canAccess(pageKey)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
