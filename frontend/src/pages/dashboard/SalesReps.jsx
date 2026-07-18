import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Search, UserRound, TrendingUp, Trash2, AlertCircle, ChevronRight,
} from 'lucide-react'
import { useSalesReps } from '../../hooks/useSalesReps'
import { useSalesRepTotals } from '../../hooks/useSalesRepTotals'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import AddSalesRepModal from '../../components/salesReps/AddSalesRepModal'

export default function SalesReps() {
  const { salesReps, loading, error, addSalesRep, deleteSalesRep } = useSalesReps()
  const { totals, refetch: refetchTotals } = useSalesRepTotals()
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

  const totalsFor = (repId) => totals.find((t) => t.rep_id === repId)

  const filtered = salesReps.filter((r) => {
    const q = query.toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.code?.toLowerCase().includes(q)
    )
  })

  const totalSalesAllReps = totals.reduce((sum, t) => sum + Number(t.total_sales), 0)

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!window.confirm(`Remove "${name}" from your sales reps? Their past sales stay recorded, just unattributed.`)) return
    await deleteSalesRep(id)
    refetchTotals()
  }

  const handleAddSalesRep = async (payload) => {
    const result = await addSalesRep(payload)
    if (!result.error) refetchTotals()
    return result
  }

  const stats = [
    { icon: UserRound, label: 'Sales reps', value: salesReps.length },
    { icon: TrendingUp, label: 'Total attributed sales', value: formatCurrency(totalSalesAllReps) },
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Sales Reps
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Attribute invoices and receipts to who made the sale, and see how each rep is doing.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} variant="primary">
          <Plus size={16} /> Add sales rep
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
            placeholder="Search by name, code, phone or email…"
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
              <UserRound size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              {salesReps.length === 0 ? 'No sales reps yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {salesReps.length === 0
                ? 'Add your sales team so invoices and receipts can be attributed to whoever made the sale.'
                : 'Try a different search term.'}
            </p>
            {salesReps.length === 0 && (
              <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-5">
                <Plus size={15} /> Add sales rep
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                  <th className="pb-3 font-medium">Rep</th>
                  <th className="pb-3 font-medium">Code</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Sales</th>
                  <th className="pb-3 pr-3 text-right font-medium">Total</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const t = totalsFor(r.id)
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                      onClick={() => navigate(`/dashboard/sales-reps/${r.id}`)}
                      className="cursor-pointer border-b border-ink-400/10 last:border-0 hover:bg-cream-100"
                    >
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 text-xs font-semibold text-cream-50">
                            {r.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-medium text-ink-900">{r.name}</p>
                            {r.email && <p className="text-xs text-ink-400">{r.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-3 font-mono text-xs text-ink-400">{r.code || '—'}</td>
                      <td className="py-3.5 pr-3 text-ink-500">{r.phone || '—'}</td>
                      <td className="py-3.5 pr-3 text-ink-500">{t?.sale_count ?? 0}</td>
                      <td className="py-3.5 pr-3 text-right font-semibold text-ink-900">
                        {formatCurrency(t?.total_sales ?? 0)}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleDelete(e, r.id, r.name)}
                            aria-label={`Remove ${r.name}`}
                            className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                          <ChevronRight size={15} className="text-ink-300" />
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddSalesRepModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddSalesRep}
      />
    </div>
  )
}
