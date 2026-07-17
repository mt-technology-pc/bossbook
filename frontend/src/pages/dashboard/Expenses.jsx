import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Search, Receipt, Wallet, Landmark, Trash2, AlertCircle, CalendarClock,
} from 'lucide-react'
import { useExpenses } from '../../hooks/useExpenses'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import AddExpenseModal from '../../components/dashboard/AddExpenseModal'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function Expenses() {
  const { expenses, loading, error, addExpense, deleteExpense } = useExpenses()
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.state?.autoOpen) {
      setModalOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = expenses.filter((e) => {
    const q = query.toLowerCase()
    return (
      e.category.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.code?.toLowerCase().includes(q)
    )
  })

  const now = new Date()
  const thisMonthTotal = expenses
    .filter((e) => {
      const d = new Date(e.expense_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const allTimeTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const stats = [
    { icon: CalendarClock, label: 'This month', value: formatCurrency(thisMonthTotal) },
    { icon: Receipt, label: 'All time', value: formatCurrency(allTimeTotal) },
  ]

  const handleDelete = async (id, category) => {
    if (!window.confirm(`Remove this "${category}" expense? This also reverses the withdrawal from its account.`)) return
    await deleteExpense(id)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Rent, utilities, salaries and other money paid out of the business.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} variant="primary">
          <Plus size={16} /> Record expense
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
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

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
        <div className="relative max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, category or description…"
            className="w-full rounded-xl border border-ink-400/20 bg-cream-100 py-2.5 pl-9 pr-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
              <Receipt size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              {expenses.length === 0 ? 'No expenses recorded yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {expenses.length === 0
                ? 'Record your first expense to start tracking where money goes.'
                : 'Try a different search term.'}
            </p>
            {expenses.length === 0 && (
              <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-5">
                <Plus size={15} /> Record expense
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                  <th className="pb-3 font-medium">Code</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Paid from</th>
                  <th className="pb-3 pr-3 text-right font-medium">Amount</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                    className="border-b border-ink-400/10 last:border-0"
                  >
                    <td className="py-3.5 pr-3 font-mono text-xs text-ink-400">{e.code || '—'}</td>
                    <td className="py-3.5 pr-3 text-ink-500">{formatDate(e.expense_date)}</td>
                    <td className="py-3.5 pr-3 font-medium text-ink-900">{e.category}</td>
                    <td className="py-3.5 pr-3 text-ink-500">{e.description || '—'}</td>
                    <td className="py-3.5 pr-3 text-ink-500">
                      {e.accounts ? (
                        <span className="flex items-center gap-1">
                          {e.accounts.type === 'bank' ? <Landmark size={12} /> : <Wallet size={12} />}
                          {e.accounts.name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-right font-semibold text-ink-900">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(e.id, e.category)}
                        aria-label={`Remove expense`}
                        className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={addExpense}
      />
    </div>
  )
}
