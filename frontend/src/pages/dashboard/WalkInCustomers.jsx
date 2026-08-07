import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, Users, AlertCircle, ChevronRight, IdCard } from 'lucide-react'
import { useWalkInCustomers } from '../../hooks/useWalkInCustomers'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

// Reads useWalkInCustomers() — its own dedicated table, entirely separate
// from public.customers (see that hook's comment for why: a walk-in
// capture is contact info for one receipt, not a real customer).
export default function WalkInCustomers() {
  const { walkInCustomers, loading, error } = useWalkInCustomers()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = walkInCustomers.filter((c) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.nic?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <button
        onClick={() => navigate('/dashboard/customers')}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
      >
        <ArrowLeft size={15} /> Customers
      </button>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Walk-in Customers
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Everyone captured through the quick save-and-send prompt on a walk-in sales receipt —
            kept separate from your regular customer list.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-1">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-xs rounded-2xl border border-ink-400/15 bg-cream-50 p-5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <Users size={17} />
          </span>
          <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">{walkInCustomers.length}</p>
          <p className="mt-0.5 text-xs text-ink-400">Walk-in customers captured</p>
        </motion.div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
        <div className="relative max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, email or NIC…"
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
              <IdCard size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              {walkInCustomers.length === 0 ? 'No walk-in customers yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {walkInCustomers.length === 0
                ? 'When someone without a saved customer record is texted or emailed a receipt, they’ll show up here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">NIC</th>
                  <th className="pb-3 font-medium">Receipt</th>
                  <th className="pb-3 font-medium">Captured</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                    onClick={() => c.sales?.reference && navigate(`/dashboard/sales/new-receipt/${c.sales.reference}`)}
                    className={`border-b border-ink-400/10 last:border-0 ${c.sales?.reference ? 'cursor-pointer hover:bg-cream-100' : ''}`}
                  >
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 text-xs font-semibold text-cream-50">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <p className="font-medium text-ink-900">{c.name}</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-3 text-ink-500">{c.phone || '—'}</td>
                    <td className="py-3.5 pr-3 text-ink-500">{c.email || '—'}</td>
                    <td className="py-3.5 pr-3 font-mono text-xs text-ink-500">{c.nic || '—'}</td>
                    <td className="py-3.5 pr-3 font-mono text-xs text-clay-600">{c.sales?.reference || '—'}</td>
                    <td className="py-3.5 pr-3 text-ink-500">{formatDate(c.created_at)}</td>
                    <td className="py-3.5 text-right">
                      {c.sales?.reference && <ChevronRight size={15} className="text-ink-300" />}
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
