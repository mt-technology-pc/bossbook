import { Outlet, useNavigate } from 'react-router-dom'
import { ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-ink-900 text-cream-50">
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
      <main className="p-6 sm:p-8">
        <Outlet />
      </main>
    </div>
  )
}
