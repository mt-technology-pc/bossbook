import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Search, HandCoins, Trash2, Pencil, AlertCircle, FileText, Receipt,
} from 'lucide-react'
import { useCustomerPayments } from '../../hooks/useCustomerPayments'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function CustomerPayments() {
  const { payments, loading, error, deletePayment } = useCustomerPayments()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = payments.filter((p) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const hay = `${p.customers?.name ?? ''} ${p.note ?? ''} ${p.sales?.reference ?? ''}`.toLowerCase()
    return hay.includes(q)
  })

  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!window.confirm(`Delete this payment from ${name}? This also reverses the deposit into its account.`)) return
    await deletePayment(id)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
            Payments Received
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-cream-400">
            Every payment collected from a customer.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/sales/receive-payment')} variant="primary">
          <Plus size={16} /> Receive payment
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
            <HandCoins size={17} />
          </span>
          <p className="mt-3 font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50">
            {payments.length}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">Payments recorded</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
            <Receipt size={17} />
          </span>
          <p className="mt-3 font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50">
            {formatCurrency(totalReceived)}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">Total received</p>
        </motion.div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800 sm:p-6">
        <div className="relative max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer, invoice or note…"
            className="w-full rounded-xl border border-ink-400/20 bg-cream-100 py-2.5 pl-9 pr-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
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
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-400">
              <HandCoins size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600 dark:text-cream-300">
              {payments.length === 0 ? 'No payments recorded yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {payments.length === 0
                ? 'Record your first customer payment to see it here.'
                : 'Try a different search term.'}
            </p>
            {payments.length === 0 && (
              <Button onClick={() => navigate('/dashboard/sales/receive-payment')} variant="outline" className="mt-5">
                <Plus size={15} /> Receive payment
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400 dark:border-cream-100/10">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Applied to</th>
                  <th className="pb-3 font-medium">Note</th>
                  <th className="pb-3 pr-3 text-right font-medium">Amount</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                    onClick={() => navigate(`/dashboard/sales/receive-payment/${p.id}`)}
                    className="cursor-pointer border-b border-ink-400/10 last:border-0 hover:bg-cream-100 dark:border-cream-100/10 dark:hover:bg-dark-700"
                  >
                    <td className="py-3.5 pr-3 text-ink-500 dark:text-cream-400">{formatDate(p.created_at)}</td>
                    <td className="py-3.5 pr-3 font-medium text-ink-900 dark:text-cream-50">
                      {p.customers?.name || '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-500 dark:text-cream-400">
                      {p.sales ? (
                        <span className="flex items-center gap-1">
                          {p.sales.type === 'invoice' ? <FileText size={12} /> : <Receipt size={12} />}
                          {p.sales.reference || 'Invoice'}
                        </span>
                      ) : 'General'}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-400">{p.note || '—'}</td>
                    <td className="py-3.5 pr-3 text-right font-semibold text-ink-900 dark:text-cream-50">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/sales/receive-payment/${p.id}`) }}
                          aria-label="Edit payment"
                          className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-clay-500/10 hover:text-clay-600"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, p.id, p.customers?.name || 'this customer')}
                          aria-label="Delete payment"
                          className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
