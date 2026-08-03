import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Package, Receipt, Truck, Contact, ShoppingBag, Wallet, BookOpen,
  RotateCcw, PackageX, ChevronRight,
} from 'lucide-react'

// Kept in sync with the sidebar nav in DashboardLayout.jsx — this is a
// shortcut row to what's in the sidebar, not a second place to add pages.
const links = [
  { label: 'Sales', icon: Receipt, to: '/dashboard/sales', color: '#10b981' },
  { label: 'Credit Notes', icon: RotateCcw, to: '/dashboard/sales/credit-notes', color: '#f97316' },
  { label: 'Inventory', icon: Package, to: '/dashboard/inventory', color: '#3b82f6' },
  { label: 'Purchases', icon: ShoppingBag, to: '/dashboard/purchases', color: '#f59e0b' },
  { label: 'Purchase Returns', icon: PackageX, to: '/dashboard/purchases/purchase-returns', color: '#dc2626' },
  { label: 'Expenses', icon: Wallet, to: '/dashboard/expenses', color: '#ef4444' },
  { label: 'Journal Entries', icon: BookOpen, to: '/dashboard/journal-entries', color: '#6366f1' },
  { label: 'Customers', icon: Contact, to: '/dashboard/customers', color: '#14b8a6' },
  { label: 'Suppliers', icon: Truck, to: '/dashboard/suppliers', color: '#06b6d4' },
]

export default function QuickLinksGrid() {
  const scrollerRef = useRef(null)

  const scrollNext = () => {
    scrollerRef.current?.scrollBy({ left: 260, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {links.map((l, i) => (
          <motion.div
            key={l.label}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            className="shrink-0"
          >
            <Link
              to={l.to}
              className="flex items-center gap-2.5 rounded-full bg-ink-900 py-1.5 pl-1.5 pr-4 text-cream-50 transition-transform hover:scale-[1.03]"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: l.color }}
              >
                <l.icon size={15} />
              </span>
              <span className="whitespace-nowrap text-sm font-medium">{l.label}</span>
              {l.soon && (
                <span className="rounded-full bg-cream-50/15 px-1.5 py-0.5 text-[9px] font-semibold text-cream-50/80">
                  Soon
                </span>
              )}
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-cream-100 to-transparent sm:block" />
      <button
        onClick={scrollNext}
        aria-label="Scroll for more"
        className="absolute right-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-ink-400/15 bg-cream-50 text-ink-500 shadow-sm transition-colors hover:border-clay-500 hover:text-clay-600 sm:flex"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
