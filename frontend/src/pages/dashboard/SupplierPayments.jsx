import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Search, HandCoins, Trash2, Pencil, AlertCircle, Receipt,
} from 'lucide-react'
import { useSupplierPayments } from '../../hooks/useSupplierPayments'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function SupplierPayments() {
  const { payments, loading, error, deletePayment } = useSupplierPayments()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = payments.filter((p) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const hay = `${p.suppliers?.name ?? ''} ${p.note ?? ''} ${p.purchases?.reference ?? ''}`.toLowerCase()
    return hay.includes(q)
  })

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!window.confirm(`Delete this payment to ${name}? This also reverses the withdrawal from its account.`)) return
    await deletePayment(id)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Payments Made
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Every payment paid out to a supplier.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/purchases/pay-bill')} variant="primary">
          <Plus size={16} /> Pay a bill
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <HandCoins size={17} />
          </span>
          <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">
            {payments.length}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">Payments recorded</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <Receipt size={17} />
          </span>
          <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">
            {formatCurrency(totalPaid)}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">Total paid</p>
        </motion.div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
        <div className="relative max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by supplier, bill or note…"
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
              <HandCoins size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              {payments.length === 0 ? 'No payments recorded yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {payments.length === 0
                ? 'Record your first supplier payment to see it here.'
                : 'Try a different search term.'}
            </p>
            {payments.length === 0 && (
              <Button onClick={() => navigate('/dashboard/purchases/pay-bill')} variant="outline" className="mt-5">
                <Plus size={15} /> Pay a bill
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
                  <th className="pb-3 font-medium">Supplier</th>
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
                    onClick={() => navigate(`/dashboard/purchases/pay-bill/${p.id}`)}
                    className="cursor-pointer border-b border-ink-400/10 last:border-0 hover:bg-cream-100"
                  >
                    <td className="py-3.5 pr-3 font-mono text-xs text-ink-400">{p.code || '—'}</td>
                    <td className="py-3.5 pr-3 text-ink-500">{formatDate(p.created_at)}</td>
                    <td className="py-3.5 pr-3 font-medium text-ink-900">
                      {p.suppliers?.name || '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-500">
                      {p.purchases ? (
                        <span className="flex items-center gap-1">
                          <Receipt size={12} />
                          {p.purchases.reference || 'Bill'}
                        </span>
                      ) : 'General'}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-400">{p.note || '—'}</td>
                    <td className="py-3.5 pr-3 text-right font-semibold text-ink-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/purchases/pay-bill/${p.id}`) }}
                          aria-label="Edit payment"
                          className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-clay-500/10 hover:text-clay-600"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, p.id, p.suppliers?.name || 'this supplier')}
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
