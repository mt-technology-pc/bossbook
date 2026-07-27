import { Navigate, useLocation } from 'react-router-dom'
import { PauseCircle, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCompany } from '../../hooks/useCompany'

export default function ProtectedRoute({ children }) {
  const { user, loading, signOut } = useAuth()
  const { company } = useCompany()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // The single place this is checked, since it wraps every authenticated
  // route in the app — both the nested /dashboard pages and the flat
  // new-invoice/new-receipt/new-purchase/pay-bill routes that render
  // outside DashboardLayout. The real lockout already happens at the
  // database level (current_company_id() returns null for a paused
  // company, so every RLS-scoped query returns nothing regardless of
  // which page renders) — this is just the friendly, consistent message
  // instead of a confusing blank/empty page.
  if (company?.paused) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <PauseCircle size={26} />
        </span>
        <h1 className="mt-4 font-heading text-xl font-semibold text-ink-900">Account paused</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-500">
          Access to {company.name} has been paused. Contact support to resolve this and regain access.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-6 flex items-center gap-1.5 rounded-full border border-ink-400/20 px-4 py-2 text-sm font-medium text-ink-700 hover:border-clay-500 hover:text-clay-600"
        >
          <LogOut size={15} /> Log out
        </button>
      </div>
    )
  }

  return children
}
