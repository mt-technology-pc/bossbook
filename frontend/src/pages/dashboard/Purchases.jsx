import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Receipt, ScanLine, Layers, AlertCircle, ChevronDown, HandCoins, Pencil, Trash2, ListChecks,
  Search,
} from 'lucide-react'
import { usePurchases } from '../../hooks/usePurchases'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function Purchases() {
  const { purchases, loading, error, deletePurchase } = usePurchases()
  const [expanded, setExpanded] = useState(null)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = purchases.filter((p) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const hay = `${p.reference ?? ''} ${p.suppliers?.name ?? ''} ${p.notes ?? ''}`.toLowerCase()
    return hay.includes(q)
  })

  const handleDelete = async (e, p) => {
    e.stopPropagation()
    const label = p.reference || 'this bill'
    if (!window.confirm(`Delete ${label}? This reverses its effect on stock and account balances.`)) return
    const { error: deleteError } = await deletePurchase(p.id)
    if (deleteError) window.alert(deleteError.message)
  }

  const totalSpent = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0)
  const unitsReceived = purchases.reduce(
    (sum, p) => sum + p.purchase_items.reduce((s, i) => s + i.quantity, 0),
    0,
  )

  const stats = [
    { icon: Receipt, label: 'Bills recorded', value: purchases.length },
    { icon: Layers, label: 'Total spent', value: formatCurrency(totalSpent) },
    { icon: ScanLine, label: 'Units received', value: unitsReceived },
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Purchases
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Record supplier bills to bring stock into your inventory.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/dashboard/purchases/payments-made')} variant="ghost">
            <ListChecks size={16} /> Payments made
          </Button>
          <Button onClick={() => navigate('/dashboard/purchases/pay-bill')} variant="outline">
            <HandCoins size={16} /> Pay a bill
          </Button>
          <Button onClick={() => navigate('/dashboard/purchases/new')} variant="primary">
            <Plus size={16} /> Record a bill
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            placeholder="Search by code, supplier or note…"
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
              {purchases.length === 0 ? 'No bills recorded yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {purchases.length === 0
                ? 'Record your first bill to bring stock into your inventory.'
                : 'Try a different search term.'}
            </p>
            {purchases.length === 0 && (
              <Button onClick={() => navigate('/dashboard/purchases/new')} variant="outline" className="mt-5">
                <Plus size={15} /> Record a bill
              </Button>
            )}
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-ink-400/10">
            {filtered.map((p, i) => {
              const itemCount = p.purchase_items.reduce((s, it) => s + it.quantity, 0)
              const isOpen = expanded === p.id
              const billDate = p.bill_date || p.created_at
              return (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                  className="py-3.5"
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
                        <Receipt size={16} />
                      </span>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
                          {p.reference || `Bill · ${formatDate(billDate)}`}
                          <span className="font-mono text-[10px] font-normal text-ink-400">
                            {p.reference || '—'}
                          </span>
                        </p>
                        <p className="text-xs text-ink-400">
                          {p.suppliers?.name || 'No supplier'} · {itemCount} unit{itemCount === 1 ? '' : 's'} · {formatDate(billDate)}
                          {p.due_date ? ` · Due ${formatDate(p.due_date)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="mr-1.5 text-sm font-semibold text-ink-700">
                        {formatCurrency(p.total_amount)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/purchases/new/${p.id}`) }}
                        aria-label="Edit bill"
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-clay-500/10 hover:text-clay-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, p)}
                        aria-label="Delete bill"
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronDown
                        size={16}
                        className={`text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 overflow-hidden rounded-xl bg-cream-100 p-3"
                    >
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-ink-400">
                            <th className="pb-2 font-medium">Qty</th>
                            <th className="pb-2 font-medium">Unit cost</th>
                            <th className="pb-2 font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.purchase_items.map((item) => (
                            <tr key={item.id} className="text-ink-700">
                              <td className="py-1">{item.quantity}</td>
                              <td className="py-1">{formatCurrency(item.unit_cost)}</td>
                              <td className="py-1">{formatCurrency(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {p.notes && (
                        <p className="mt-2 border-t border-ink-400/10 pt-2 text-xs text-ink-400">
                          {p.notes}
                        </p>
                      )}
                    </motion.div>
                  )}
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
