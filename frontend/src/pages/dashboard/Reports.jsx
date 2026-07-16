import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Boxes, FileBarChart, BookOpen, ClipboardList, ArrowRight, Landmark, BookMarked, Scale,
} from 'lucide-react'

const reports = [
  {
    icon: BookOpen,
    title: 'Sales Day Book',
    desc: 'Every sale line item, chronologically, with cash vs. credit position and running totals.',
    to: '/dashboard/reports/sales-day-book',
  },
  {
    icon: ClipboardList,
    title: 'Purchase Day Book',
    desc: 'Every bill line item, chronologically, with supplier payments made in the same period.',
    to: '/dashboard/reports/purchase-day-book',
  },
  {
    icon: Boxes,
    title: 'Inventory Valuation Summary',
    desc: 'Quantity on hand and inventory value by FIFO, weighted average, or standard cost, as of any date.',
    to: '/dashboard/reports/inventory-valuation',
  },
  {
    icon: FileBarChart,
    title: 'Income Statement',
    desc: 'Revenue, cost of goods sold and gross profit by category, over any date range.',
    to: '/dashboard/reports/income-statement',
  },
  {
    icon: Landmark,
    title: 'Chart of Accounts',
    desc: 'Every account your books post to — assets, liabilities, equity, income, and expenses — with current balances.',
    to: '/dashboard/reports/chart-of-accounts',
  },
  {
    icon: BookMarked,
    title: 'General Ledger',
    desc: 'The real T-account for any account: every journal entry line, debit and credit, with a running balance.',
    to: '/dashboard/reports/general-ledger',
  },
  {
    icon: Scale,
    title: 'Trial Balance',
    desc: 'Every account as of a chosen date, proving total debits equal total credits — real double-entry bookkeeping.',
    to: '/dashboard/reports/trial-balance',
  },
]

export default function Reports() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
        Reports
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-cream-400">
        Real numbers computed from what you&apos;ve actually recorded — no placeholders.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r, i) => {
          const Card = (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className={`group h-full rounded-2xl border border-ink-400/15 bg-cream-50 p-6 dark:border-cream-100/10 dark:bg-dark-800 ${
                r.soon ? 'opacity-60' : 'transition-shadow hover:shadow-lg hover:shadow-clay-500/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600 dark:text-clay-400">
                  <r.icon size={20} />
                </span>
                {r.soon && (
                  <span className="rounded-full bg-ink-400/10 px-2 py-0.5 text-[10px] font-semibold text-ink-400 dark:bg-cream-100/10">
                    Soon
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-heading text-base font-semibold text-ink-900 dark:text-cream-50">
                {r.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-cream-400">
                {r.desc}
              </p>
              {!r.soon && (
                <span className="mt-4 flex items-center gap-1 text-sm font-medium text-clay-600 dark:text-clay-400">
                  Open report <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </motion.div>
          )

          return r.soon ? (
            <div key={r.title}>{Card}</div>
          ) : (
            <Link key={r.title} to={r.to}>
              {Card}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
