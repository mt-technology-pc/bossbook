import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Package, Receipt, ScanLine, TrendingUp, Plus, ArrowRight, CheckCircle2,
  Circle, Users, Contact,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useProducts } from '../../hooks/useProducts'
import { useCustomers } from '../../hooks/useCustomers'
import { formatCurrency } from '../../lib/currency'
import RadialStat from '../../components/dashboard/RadialStat'
import AccountsPanel from '../../components/dashboard/AccountsPanel'
import AccountStatusCard from '../../components/dashboard/AccountStatusCard'
import QuickLinksGrid from '../../components/dashboard/QuickLinksGrid'

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
  const navigate = useNavigate()

  const firstName = (fullName || user?.email?.split('@')[0] || 'there').split(' ')[0]

  const stockValue = products.reduce((sum, p) => sum + p.price * p.stock_quantity, 0)
  const stockUnits = products.reduce((sum, p) => sum + p.stock_quantity, 0)
  const serialTrackedCount = products.filter((p) => p.tracks_serial).length

  const stats = [
    { icon: TrendingUp, label: 'Revenue this month', value: formatCurrency(0) },
    { icon: Package, label: 'Items in stock', value: stockUnits },
    { icon: Receipt, label: 'Open invoices', value: '0' },
    { icon: ScanLine, label: 'Serial numbers tracked', value: serialTrackedCount },
  ]

  const milestones = [
    { icon: Users, label: 'Staff', value: 1, target: 5, caption: 'toward first 5' },
    { icon: Package, label: 'Products', value: products.length, target: 20, caption: 'toward first 20' },
    { icon: Contact, label: 'Customers', value: customers.length, target: 20, caption: 'toward first 20' },
    { icon: Receipt, label: 'Invoices', value: 0, target: 10, caption: 'toward first 10' },
  ]

  const checklist = [
    { label: 'Create your account', done: true },
    { label: 'Add your first product', done: products.length > 0 },
    { label: 'Create your first invoice', done: false },
    { label: 'Invite a team member', done: false },
  ]
  const doneCount = checklist.filter((c) => c.done).length

  const quickActions = [
    {
      icon: Package,
      title: 'Add a product',
      desc: 'Start building your inventory catalog.',
      onClick: () => navigate('/dashboard/inventory'),
    },
    {
      icon: ScanLine,
      title: 'Track a serial/IMEI',
      desc: 'Register a unit with a unique identifier.',
      onClick: () => navigate('/dashboard/inventory'),
    },
    {
      icon: Receipt,
      title: 'Create an invoice',
      desc: 'Bill a customer in a few clicks.',
      onClick: () => navigate('/dashboard/invoices'),
    },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm font-medium text-clay-600">{getGreeting()}</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500 dark:text-cream-400">
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
            className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
              <s.icon size={17} />
            </span>
            <p className="mt-3 font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50">
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <AccountStatusCard user={user} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <QuickLinksGrid />
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-ink-400/15 bg-cream-50 p-6 dark:border-cream-100/10 dark:bg-dark-800 lg:col-span-2"
        >
          <h2 className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
            Quick actions
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickActions.map((a) => (
              <button
                key={a.title}
                onClick={a.onClick}
                className="group flex flex-col items-start rounded-xl border border-ink-400/15 bg-cream-100 p-4 text-left transition-colors hover:border-clay-500/40 dark:border-cream-100/10 dark:bg-dark-700"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-50 text-clay-600 dark:bg-dark-800 dark:text-clay-400">
                  <a.icon size={16} />
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-900 dark:text-cream-50">
                  {a.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-cream-400">
                  {a.desc}
                </p>
                <span className="mt-3 flex items-center gap-1 text-xs font-medium text-clay-600 opacity-0 transition-opacity group-hover:opacity-100">
                  <Plus size={13} /> Get started
                </span>
              </button>
            ))}
          </div>

          {products.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-400/25 py-10 text-center dark:border-cream-100/15">
              <Receipt size={22} className="text-ink-400" />
              <p className="mt-3 text-sm font-medium text-ink-600 dark:text-cream-300">
                No activity yet
              </p>
              <p className="mt-1 max-w-xs text-xs text-ink-400">
                Sales, invoices and stock changes will show up here once you
                start adding data.
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Recently added products
              </p>
              <ul className="mt-3 space-y-2">
                {products.slice(0, 4).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-cream-100 px-3.5 py-2.5 dark:bg-dark-700"
                  >
                    <span className="text-sm font-medium text-ink-800 dark:text-cream-200">
                      {p.name}
                    </span>
                    <span className="text-xs text-ink-400">
                      {formatCurrency(p.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-ink-400/15 bg-cream-50 p-6 dark:border-cream-100/10 dark:bg-dark-800"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
              Getting started
            </h2>
            <span className="text-xs font-medium text-ink-400">
              {doneCount}/{checklist.length}
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream-200 dark:bg-dark-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(doneCount / checklist.length) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-clay-500"
            />
          </div>

          <ul className="mt-5 space-y-3">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm">
                {item.done ? (
                  <CheckCircle2 size={17} className="shrink-0 text-clay-500" />
                ) : (
                  <Circle size={17} className="shrink-0 text-ink-400/40" />
                )}
                <span
                  className={
                    item.done
                      ? 'text-ink-400 line-through'
                      : 'text-ink-700 dark:text-cream-300'
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate('/dashboard/inventory')}
            className="mt-6 flex items-center gap-1.5 text-sm font-medium text-clay-600 hover:text-clay-700"
          >
            Continue setup <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </div>
  )
}
