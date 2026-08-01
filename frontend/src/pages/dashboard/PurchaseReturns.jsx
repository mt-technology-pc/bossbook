import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, PackageX, Trash2, AlertCircle, Layers } from 'lucide-react'
import { usePurchaseReturns } from '../../hooks/usePurchaseReturns'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function PurchaseReturns() {
  const { purchaseReturns, loading, error, deletePurchaseReturn } = usePurchaseReturns()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = purchaseReturns.filter((pr) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const hay = `${pr.reference ?? ''} ${pr.suppliers?.name ?? ''} ${pr.notes ?? ''}`.toLowerCase()
    return hay.includes(q)
  })

  const total = purchaseReturns.reduce((sum, pr) => sum + Number(pr.total_amount), 0)
  const unitsReturned = purchaseReturns.reduce(
    (sum, pr) => sum + (pr.purchase_return_items ?? []).reduce((s, i) => s + Number(i.quantity), 0),
    0,
  )

  const handleDelete = async (e, pr) => {
    e.stopPropagation()
    if (!window.confirm(`Delete ${pr.reference || 'this return'}? This restores the stock and reverses the journal entry.`)) return
    const { error: deleteError } = await deletePurchaseReturn(pr.id)
    if (deleteError) window.alert(deleteError.message)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Purchase Returns
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Stock returned to suppliers — reduces payable balance and restores inventory.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/purchases/purchase-returns/new')} variant="primary">
          <Plus size={16} /> Record return
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: PackageX, label: 'Returns recorded', value: purchaseReturns.length },
          { icon: Layers, label: 'Total returned', value: formatCurrency(total) },
          { icon: PackageX, label: 'Units returned', value: unitsReturned },
        ].map((s, i) => (
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
            <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">{s.value}</p>
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
            placeholder="Search by reference, supplier or note…"
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
              <PackageX size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              {purchaseReturns.length === 0 ? 'No returns recorded yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {purchaseReturns.length === 0
                ? 'Record a return when you send goods back to a supplier.'
                : 'Try a different search term.'}
            </p>
            {purchaseReturns.length === 0 && (
              <Button onClick={() => navigate('/dashboard/purchases/purchase-returns/new')} variant="outline" className="mt-5">
                <Plus size={15} /> Record return
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Supplier</th>
                  <th className="pb-3 font-medium">Against Bill</th>
                  <th className="pb-3 pr-3 text-right font-medium">Amount</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((pr, i) => (
                  <motion.tr
                    key={pr.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                    className="border-b border-ink-400/10 last:border-0"
                  >
                    <td className="py-3.5 pr-3 font-mono text-xs text-clay-600">
                      {pr.reference || '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-500">{formatDate(pr.return_date)}</td>
                    <td className="py-3.5 pr-3 font-medium text-ink-900">
                      {pr.suppliers?.name || '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-500">
                      {pr.purchases?.reference || '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-right font-semibold text-ink-900">
                      {formatCurrency(pr.total_amount)}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={(e) => handleDelete(e, pr)}
                        aria-label="Delete return"
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
    </div>
  )
}
