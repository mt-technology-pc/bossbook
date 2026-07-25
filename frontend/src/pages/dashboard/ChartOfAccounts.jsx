import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle, ChevronRight, Landmark, Scale, PiggyBank, TrendingUp, Receipt,
  ArrowLeft, Printer,
} from 'lucide-react'
import { useChartOfAccounts } from '../../hooks/useChartOfAccounts'
import { formatCurrency } from '../../lib/currency'
import PrintFrame from '../../components/print/PrintFrame'

const TYPE_META = {
  asset: { label: 'Assets', icon: Landmark },
  liability: { label: 'Liabilities', icon: Scale },
  equity: { label: 'Equity', icon: PiggyBank },
  income: { label: 'Income', icon: TrendingUp },
  expense: { label: 'Expenses', icon: Receipt },
}

export default function ChartOfAccounts() {
  const { byType, loading, error } = useChartOfAccounts()
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => navigate('/dashboard/reports')}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
        >
          <ArrowLeft size={15} /> Reports
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600"
        >
          <Printer size={13} /> Print / PDF
        </button>
      </div>

      <h1 className="mt-4 font-heading text-2xl font-semibold text-ink-900 sm:text-3xl print:hidden">
        Chart of Accounts
      </h1>
      <p className="mt-1 text-sm text-ink-500 print:hidden">
        Every account your books post to, grouped by type, with its current balance.
      </p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
        </div>
      ) : byType.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-400/20 bg-cream-50 py-16 text-center">
          <p className="text-sm font-medium text-ink-600">No accounts posted yet</p>
          <p className="mt-1 max-w-xs text-xs text-ink-400">
            Accounts appear here automatically the first time a sale, purchase, payment, or
            expense is recorded.
          </p>
        </div>
      ) : (
        <PrintFrame title="Chart of Accounts">
        <div className="mt-6 space-y-6">
          {byType.map((group, gi) => {
            const meta = TYPE_META[group.type]
            return (
              <motion.div
                key={group.type}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: gi * 0.05 }}
                className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
                    <meta.icon size={16} />
                  </span>
                  <h2 className="font-heading text-base font-semibold text-ink-900">
                    {meta.label}
                  </h2>
                </div>
                <ul className="mt-3 divide-y divide-ink-400/10">
                  {group.accounts.map((a) => (
                    <li
                      key={a.coa_id}
                      onClick={() => navigate(`/dashboard/reports/general-ledger/${a.coa_id}`)}
                      className="flex cursor-pointer items-center justify-between gap-3 py-3 break-inside-avoid hover:bg-cream-100"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink-900">
                          {a.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-ink-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-400">
                          {a.normal_balance}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold text-ink-700">
                          {formatCurrency(a.balance)}
                        </span>
                        <ChevronRight size={14} className="text-ink-300 print:hidden" />
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>
        </PrintFrame>
      )}
    </div>
  )
}
