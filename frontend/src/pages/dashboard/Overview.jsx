import { motion } from 'framer-motion'
import {
  Package, Receipt, ScanLine, TrendingUp, Users, Contact,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useProducts } from '../../hooks/useProducts'
import { useCustomers } from '../../hooks/useCustomers'
import { useSales } from '../../hooks/useSales'
import { formatCurrency } from '../../lib/currency'
import RadialStat from '../../components/dashboard/RadialStat'
import AccountsPanel from '../../components/dashboard/AccountsPanel'
import QuickLinksGrid from '../../components/dashboard/QuickLinksGrid'
import ClientMap from '../../components/dashboard/ClientMap'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Overview() {
  const { fullName, user } = useAuth()
  const { products } = useProducts()
  const { customers } = useCustomers()
  const { sales } = useSales()

  const firstName = (fullName || user?.email?.split('@')[0] || 'there').split(' ')[0]

  const stockUnits = products.reduce((sum, p) => sum + p.stock_quantity, 0)
  const serialTrackedCount = products.filter((p) => p.tracks_serial).length

  const now = new Date()
  const revenueThisMonth = sales
    .filter((s) => {
      const d = new Date(s.sale_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, s) => sum + Number(s.total_amount), 0)
  const invoiceCount = sales.filter((s) => s.type === 'invoice').length

  const stats = [
    { icon: TrendingUp, label: 'Revenue this month', value: formatCurrency(revenueThisMonth) },
    { icon: Package, label: 'Items in stock', value: stockUnits },
    { icon: Receipt, label: 'Invoices recorded', value: invoiceCount },
    { icon: ScanLine, label: 'Serial numbers tracked', value: serialTrackedCount },
  ]

  const milestones = [
    { icon: Users, label: 'Staff', value: 1, target: 5, caption: 'toward first 5' },
    { icon: Package, label: 'Products', value: products.length, target: 20, caption: 'toward first 20' },
    { icon: Contact, label: 'Customers', value: customers.length, target: 20, caption: 'toward first 20' },
    { icon: Receipt, label: 'Invoices', value: invoiceCount, target: 10, caption: 'toward first 10' },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm font-medium text-clay-600">{getGreeting()}</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </motion.div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
              <s.icon size={17} />
            </span>
            <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-ink-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {milestones.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 + i * 0.06 }}
          >
            <RadialStat {...m} />
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <AccountsPanel />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <QuickLinksGrid />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mt-6"
      >
        <ClientMap />
      </motion.div>
    </div>
  )
}
