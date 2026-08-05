import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, RotateCcw, Trash2, AlertCircle, FileText, Pencil } from 'lucide-react'
import { useCreditNotes } from '../../hooks/useCreditNotes'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function CreditNotes() {
  const { creditNotes, loading, error, deleteCreditNote } = useCreditNotes()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = creditNotes.filter((cn) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const hay = `${cn.reference ?? ''} ${cn.customers?.name ?? ''} ${cn.notes ?? ''}`.toLowerCase()
    return hay.includes(q)
  })

  const total = creditNotes.reduce((sum, cn) => sum + Number(cn.total_amount), 0)

  const handleDelete = async (e, cn) => {
    e.stopPropagation()
    if (!window.confirm(`Delete ${cn.reference || 'this credit note'}? This reverses the credit from the customer's account.`)) return
    const { error: deleteError } = await deleteCreditNote(cn.id)
    if (deleteError) window.alert(deleteError.message)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Credit Notes
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Sales returns and credit adjustments issued to customers.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/sales/credit-notes/new')} variant="primary">
          <Plus size={16} /> Issue credit note
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
            <RotateCcw size={17} />
          </span>
          <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">{creditNotes.length}</p>
          <p className="mt-0.5 text-xs text-ink-400">Credit notes issued</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <FileText size={17} />
          </span>
          <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">{formatCurrency(total)}</p>
          <p className="mt-0.5 text-xs text-ink-400">Total credited</p>
        </motion.div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
        <div className="relative max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by reference, customer or note…"
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
              <RotateCcw size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              {creditNotes.length === 0 ? 'No credit notes yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {creditNotes.length === 0
                ? 'Issue your first credit note when a customer returns goods or needs a credit adjustment.'
                : 'Try a different search term.'}
            </p>
            {creditNotes.length === 0 && (
              <Button onClick={() => navigate('/dashboard/sales/credit-notes/new')} variant="outline" className="mt-5">
                <Plus size={15} /> Issue credit note
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
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Against Sale</th>
                  <th className="pb-3 pr-3 text-right font-medium">Amount</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((cn, i) => (
                  <motion.tr
                    key={cn.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                    onClick={() => navigate(`/dashboard/sales/credit-notes/${cn.id}`)}
                    className="cursor-pointer border-b border-ink-400/10 last:border-0 hover:bg-cream-100"
                  >
                    <td className="py-3.5 pr-3 font-mono text-xs text-clay-600">
                      {cn.reference || '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-500">{formatDate(cn.credit_date)}</td>
                    <td className="py-3.5 pr-3 font-medium text-ink-900">
                      {cn.customers?.name || '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-500">
                      {cn.sales ? (
                        <span className="flex items-center gap-1.5">
                          {cn.sales.reference || '—'}
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            cn.sales.type === 'receipt'
                              ? 'bg-ink-400/10 text-ink-500'
                              : 'bg-clay-500/10 text-clay-600'
                          }`}>
                            {cn.sales.type === 'receipt' ? 'Receipt' : 'Invoice'}
                          </span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-right font-semibold text-ink-900">
                      {formatCurrency(cn.total_amount)}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/sales/credit-notes/${cn.id}`) }}
                          aria-label="Edit credit note"
                          className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-clay-500/10 hover:text-clay-600"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, cn)}
                          aria-label="Delete credit note"
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
