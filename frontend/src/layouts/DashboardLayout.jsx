import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Package, Receipt, ScanLine, BarChart3, Settings, Contact,
  Truck, ShoppingBag, Wallet, Menu, X, LogOut, ChevronDown,
  ArrowDownToLine, ArrowUpFromLine, UserRound, DatabaseBackup,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import CreateMenu from '../components/dashboard/CreateMenu'
import AssistantPanel from '../components/dashboard/AssistantPanel'
import AccountStatusCard from '../components/dashboard/AccountStatusCard'
import { useAuth } from '../context/AuthContext'

const nav = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Sales', to: '/dashboard/sales', icon: Receipt },
  { label: 'Sales Reps', to: '/dashboard/sales-reps', icon: UserRound },
  { label: 'Inventory', to: '/dashboard/inventory', icon: Package },
  { label: 'Purchases', to: '/dashboard/purchases', icon: ShoppingBag },
  { label: 'Expenses', to: '/dashboard/expenses', icon: Wallet },
  { label: 'Customers', to: '/dashboard/customers', icon: Contact },
  { label: 'Receivables', to: '/dashboard/receivables', icon: ArrowDownToLine },
  { label: 'Suppliers', to: '/dashboard/suppliers', icon: Truck },
  { label: 'Payables', to: '/dashboard/payables', icon: ArrowUpFromLine },
  { label: 'Serial tracking', to: '/dashboard/serial-tracking', icon: ScanLine },
  { label: 'Reports', to: '/dashboard/reports', icon: BarChart3 },
  { label: 'Settings', to: '/dashboard/settings', icon: Settings },
  { label: 'Backup', to: '/dashboard/backup', icon: DatabaseBackup },
]

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, fullName, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  const displayName = fullName || user?.email?.split('@')[0] || 'there'
  const initial = displayName.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-cream-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-400/10 bg-cream-50 lg:flex print:hidden">
        <div className="flex h-16 items-center px-6">
          <Logo />
        </div>
        <div className="px-3">
          <CreateMenu />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-clay-500/10 text-clay-600'
                    : 'text-ink-500 hover:bg-cream-200'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-400/10 p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-cream-200"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end bg-ink-900/40 lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-cream-50 shadow-2xl"
            >
              <div className="flex justify-center pt-3">
                <span className="h-1.5 w-10 rounded-full bg-ink-400/25" />
              </div>
              <div className="flex items-center justify-between px-6 pb-1 pt-2">
                <Logo />
                <button onClick={() => setOpen(false)} className="text-ink-500">
                  <X size={20} />
                </button>
              </div>
              <div className="px-3 pt-2">
                <CreateMenu />
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {nav.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-clay-500/10 text-clay-600'
                          : 'text-ink-500 hover:bg-cream-200'
                      }`
                    }
                  >
                    <item.icon size={17} />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-ink-400/10 p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500"
                >
                  <LogOut size={17} />
                  Log out
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-ink-400/10 bg-cream-50/80 px-4 backdrop-blur sm:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setMenuOpen((m) => !m)}
                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-cream-200"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 text-sm font-semibold text-cream-50">
                  {initial}
                </span>
                <span className="hidden text-sm font-medium text-ink-700 sm:block">
                  {displayName}
                </span>
                <ChevronDown size={14} className="hidden text-ink-400 sm:block" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-ink-400/15 bg-cream-50 py-1 shadow-xl"
                  >
                    <div className="border-b border-ink-400/10 px-3.5 py-2.5">
                      <p className="truncate text-sm font-medium text-ink-900">{displayName}</p>
                      <p className="truncate text-xs text-ink-400">{user?.email}</p>
                    </div>
                    <div className="border-b border-ink-400/10">
                      <AccountStatusCard user={user} />
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink-600 hover:bg-cream-200"
                    >
                      <LogOut size={15} />
                      Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <div className="fixed bottom-6 left-4 z-40 flex items-center gap-3 lg:hidden print:hidden">
        <motion.button
          onClick={() => setOpen((o) => !o)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 text-cream-50 shadow-xl shadow-ink-900/25 hover:bg-ink-800"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </motion.button>
        <CreateMenu variant="fab" />
      </div>

      <AssistantPanel />
    </div>
  )
}
