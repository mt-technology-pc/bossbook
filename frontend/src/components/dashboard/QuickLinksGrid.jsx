import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Package, Receipt, ScanLine, BarChart3, Users, Settings, Truck, Contact,
  ShoppingBag, Wallet,
} from 'lucide-react'

const links = [
  { label: 'Sales', icon: Receipt, to: '/dashboard/sales' },
  { label: 'Inventory', icon: Package, to: '/dashboard/inventory' },
  { label: 'Purchases', icon: ShoppingBag, to: '/dashboard/purchases' },
  { label: 'Expenses', icon: Wallet, to: '/dashboard/expenses' },
  { label: 'Customers', icon: Contact, to: '/dashboard/customers' },
  { label: 'Suppliers', icon: Truck, to: '/dashboard/suppliers' },
  { label: 'Serial tracking', icon: ScanLine, to: '/dashboard/serial-tracking', soon: true },
  { label: 'Reports', icon: BarChart3, to: '/dashboard/reports' },
  { label: 'Team', icon: Users, to: '/dashboard/team', soon: true },
  { label: 'Settings', icon: Settings, to: '/dashboard/settings', soon: true },
]

export default function QuickLinksGrid() {
  return (
    <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-6">
      <h2 className="font-heading text-lg font-semibold text-ink-900">
        Quick links
      </h2>
      <p className="mt-1 text-xs text-ink-400">Jump straight to a section</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {links.map((l, i) => (
          <motion.div
            key={l.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <Link
              to={l.to}
              className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-ink-400/15 bg-cream-100 px-3 py-4 text-center transition-colors hover:border-clay-500/40 hover:bg-clay-500/5"
            >
              {l.soon && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-ink-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-ink-400">
                  Soon
                </span>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-50 text-clay-600">
                <l.icon size={16} />
              </span>
              <span className="text-xs font-medium text-ink-700">
                {l.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
