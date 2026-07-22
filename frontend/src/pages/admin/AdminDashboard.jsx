import { ShieldCheck, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Deliberately minimal — this migration's scope stops at "an admin can log
// in somewhere separate and be recognized as one." The actual panel
// (companies list, feature toggles, users-per-company view) is the next
// follow-up plan once this auth foundation is in place.
export default function AdminDashboard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-900 text-cream-50">
      <header className="flex h-16 items-center justify-between border-b border-cream-50/10 px-6">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={16} /> Platform Admin
        </span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-cream-50/60 hover:text-cream-50"
        >
          <LogOut size={15} /> Sign out
        </button>
      </header>
      <main className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <p className="font-heading text-lg font-semibold">Admin panel foundation is live</p>
          <p className="mt-2 max-w-sm text-sm text-cream-50/60">
            Companies list, per-company feature toggles, and user management
            are the next build — this page just confirms the separate admin
            login and authorization check are working end to end.
          </p>
        </div>
      </main>
    </div>
  )
}
